-- First-time workspace intention plus self-service instructor activation.
-- Role remains protected from direct client writes; only this RPC may grant
-- instructor to the caller's own verified account (never admin).

begin;

alter table public.profiles
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists intended_workspace text
    check (intended_workspace is null or intended_workspace in ('learn', 'teach'));

grant update (
  display_name,
  background,
  experience,
  goal,
  language,
  learning_style,
  onboarding_completed_at,
  intended_workspace,
  updated_at
) on public.profiles to authenticated;

grant insert (
  id,
  display_name,
  background,
  experience,
  goal,
  language,
  learning_style,
  onboarding_completed_at,
  intended_workspace,
  updated_at
) on public.profiles to authenticated;

-- Existing learners keep access without being forced through intention choice again.
update public.profiles
set onboarding_completed_at = coalesce(onboarding_completed_at, updated_at, now()),
    intended_workspace = coalesce(
      intended_workspace,
      case when role in ('instructor', 'admin') then 'teach' else 'learn' end
    )
where onboarding_completed_at is null;

create or replace function public.activate_instructor()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  verified_at timestamptz;
  profile_role text;
begin
  if uid is null then
    raise exception 'Sign in required';
  end if;

  select email_confirmed_at into verified_at
  from auth.users
  where id = uid;

  if verified_at is null then
    raise exception 'Confirm your email first';
  end if;

  insert into public.profiles (id)
  values (uid)
  on conflict (id) do nothing;

  -- Avoid the name current_role: it collides with the SQL built-in.
  select role into profile_role
  from public.profiles
  where id = uid
  for update;

  if profile_role is null then
    raise exception 'Your profile is unavailable';
  end if;

  -- Never demote or invent admin through onboarding.
  if profile_role = 'admin' then
    return 'admin';
  end if;

  if profile_role = 'instructor' then
    update public.profiles
    set intended_workspace = coalesce(intended_workspace, 'teach'),
        onboarding_completed_at = coalesce(onboarding_completed_at, now()),
        updated_at = now()
    where id = uid;
    return 'instructor';
  end if;

  if profile_role <> 'student' then
    raise exception 'Role cannot be changed';
  end if;

  -- Runs as the function owner, so private.guard_profile_role allows the change.
  update public.profiles
  set role = 'instructor',
      intended_workspace = 'teach',
      onboarding_completed_at = coalesce(onboarding_completed_at, now()),
      updated_at = now()
  where id = uid;

  return 'instructor';
end;
$$;

revoke all on function public.activate_instructor() from public, anon;
grant execute on function public.activate_instructor() to authenticated;

commit;
