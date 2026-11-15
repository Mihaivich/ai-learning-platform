-- Role & class-scoped AI quotas (downward-only class caps, single-RPC enforcement,
-- no self-leave quota reset) plus hardened learner content & diagram feedback.
-- Safe to re-run: columns, helper functions and policies are created idempotently.

begin;

-- 1. Account-level quota overrides on profiles (managed only by administrators via service_role).
alter table public.profiles
  add column if not exists quota_generation integer check (quota_generation is null or (quota_generation >= 0 and quota_generation <= 500)),
  add column if not exists quota_roleplay integer check (quota_roleplay is null or (quota_roleplay >= 0 and quota_roleplay <= 500)),
  add column if not exists quota_feedback integer check (quota_feedback is null or (quota_feedback >= 0 and quota_feedback <= 500));

create or replace function private.guard_profile_role() returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('anon', 'authenticated') then
    if (TG_OP = 'INSERT' and new.role <> 'student') or (TG_OP = 'UPDATE' and new.role is distinct from old.role) then
      raise exception 'Only an administrator may assign roles';
    end if;
    if (TG_OP = 'INSERT' and (new.quota_generation is not null or new.quota_roleplay is not null or new.quota_feedback is not null))
       or (TG_OP = 'UPDATE' and (
         new.quota_generation is distinct from old.quota_generation or
         new.quota_roleplay is distinct from old.quota_roleplay or
         new.quota_feedback is distinct from old.quota_feedback
       )) then
      raise exception 'Only an administrator may change account quotas';
    end if;
  end if;
  return new;
end; $$;

create or replace function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists(
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;
revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to authenticated;

-- 2. Class-level student hourly quota caps set by the class's instructor.
alter table public.classes
  add column if not exists quota_generation integer check (quota_generation is null or (quota_generation >= 0 and quota_generation <= 500)),
  add column if not exists quota_roleplay integer check (quota_roleplay is null or (quota_roleplay >= 0 and quota_roleplay <= 500)),
  add column if not exists quota_feedback integer check (quota_feedback is null or (quota_feedback >= 0 and quota_feedback <= 500));

grant update (name, quota_generation, quota_roleplay, quota_feedback) on public.classes to authenticated;

-- 2b. Remove student self-leave on class_members so learners cannot evade strict class quota caps.
drop policy if exists "class members: self leaves, owner removes" on public.class_members;
drop policy if exists "class members: owner removes" on public.class_members;
create policy "class members: owner removes"
  on public.class_members
  for delete
  to authenticated
  using (private.owns_class(class_id));

-- 3. Widen consume_ai_quota ceiling from 100 to 500 and add single-RPC effective quota enforcement.
create or replace function public.consume_ai_quota(p_bucket text, max_hits integer, window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  start_at timestamptz;
  current_hits integer;
begin
  if uid is null then
    raise exception 'Sign in required';
  end if;
  if p_bucket not in ('generation', 'feedback', 'tutor', 'roleplay', 'prompt-lab') then
    raise exception 'Unknown quota bucket';
  end if;
  if max_hits < 1 or max_hits > 500 or window_seconds <> 3600 then
    raise exception 'Invalid quota window';
  end if;
  start_at := to_timestamp(floor(extract(epoch from clock_timestamp()) / window_seconds) * window_seconds);
  insert into public.ai_usage as usage (user_id, bucket, window_start, hits)
  values (uid, p_bucket, start_at, 1)
  on conflict on constraint ai_usage_pkey
  do update set hits = usage.hits + 1
  returning usage.hits into current_hits;
  return current_hits <= max_hits;
end;
$$;

revoke all on function public.consume_ai_quota(text, integer, integer) from public, anon;
grant execute on function public.consume_ai_quota(text, integer, integer) to authenticated;

-- Single-RPC quota resolver + atomic counter:
-- Role default -> student class cap (downward-only vs student default) -> admin profile override.
create or replace function public.enforce_effective_ai_quota(p_bucket text, max_hits integer, window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  prof_role text := 'student';
  prof_q_gen integer;
  prof_q_role integer;
  prof_q_feed integer;
  min_class_cap integer;
  personal_override integer;
  effective_limit integer;
  start_at timestamptz;
  current_hits integer;
begin
  if uid is null then
    raise exception 'Sign in required';
  end if;
  if p_bucket not in ('generation', 'feedback', 'tutor', 'roleplay', 'prompt-lab') then
    raise exception 'Unknown quota bucket';
  end if;
  if max_hits < 1 or max_hits > 500 or window_seconds <> 3600 then
    raise exception 'Invalid quota window';
  end if;

  select role, quota_generation, quota_roleplay, quota_feedback
    into prof_role, prof_q_gen, prof_q_role, prof_q_feed
  from public.profiles
  where id = uid;

  prof_role := coalesce(prof_role, 'student');
  if prof_role not in ('student', 'instructor', 'admin') then
    prof_role := 'student';
  end if;

  if p_bucket in ('generation', 'roleplay', 'feedback') then
    effective_limit := case
      when p_bucket = 'generation' and prof_role = 'admin' then 60
      when p_bucket = 'generation' and prof_role = 'instructor' then 30
      when p_bucket = 'generation' then 12
      when p_bucket = 'roleplay' and prof_role = 'admin' then 120
      when p_bucket = 'roleplay' and prof_role = 'instructor' then 80
      when p_bucket = 'roleplay' then 40
      when p_bucket = 'feedback' and prof_role = 'admin' then 120
      when p_bucket = 'feedback' and prof_role = 'instructor' then 80
      else 40
    end;

    if prof_role = 'student' then
      select min(
        case p_bucket
          when 'generation' then c.quota_generation
          when 'roleplay' then c.quota_roleplay
          when 'feedback' then c.quota_feedback
          else null
        end
      )
      into min_class_cap
      from public.class_members cm
      join public.classes c on c.id = cm.class_id
      where cm.student_id = uid;

      if min_class_cap is not null then
        -- Class limits can only cap student usage at or below the student default.
        effective_limit := least(effective_limit, greatest(0, least(500, min_class_cap)));
      end if;
    end if;

    personal_override := case p_bucket
      when 'generation' then prof_q_gen
      when 'roleplay' then prof_q_role
      when 'feedback' then prof_q_feed
      else null
    end;

    if personal_override is not null then
      effective_limit := greatest(0, least(500, personal_override));
    end if;
  else
    effective_limit := max_hits;
  end if;

  if effective_limit <= 0 then
    return false;
  end if;

  start_at := to_timestamp(floor(extract(epoch from clock_timestamp()) / window_seconds) * window_seconds);
  insert into public.ai_usage as usage (user_id, bucket, window_start, hits)
  values (uid, p_bucket, start_at, 1)
  on conflict on constraint ai_usage_pkey
  do update set hits = usage.hits + 1
  returning usage.hits into current_hits;
  return current_hits <= effective_limit;
end;
$$;

revoke all on function public.enforce_effective_ai_quota(text, integer, integer) from public, anon;
grant execute on function public.enforce_effective_ai_quota(text, integer, integer) to authenticated;

-- 4. Content & diagram issue feedback reported by learners and triaged by instructors/admins.
create table if not exists public.content_feedback (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users (id) on delete cascade,
  project_id text not null check (project_id ~ '^[a-z0-9-]{1,64}$'),
  kind text not null check (kind in ('content_error', 'grading_issue', 'unclear', 'diagram_broken')),
  surface text not null check (surface in ('primer', 'learn', 'game', 'desktop', 'report')),
  target_id text check (target_id is null or char_length(target_id) <= 80),
  target_label text check (target_label is null or char_length(target_label) <= 160),
  message text not null check (char_length(btrim(message)) between 3 and 1000),
  context jsonb not null default '{}'::jsonb check (jsonb_typeof(context) = 'object' and octet_length(context::text) <= 2000),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  resolution_note text check (resolution_note is null or char_length(resolution_note) <= 500),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists content_feedback_project_idx
  on public.content_feedback (project_id, status, created_at desc);

create index if not exists content_feedback_status_idx
  on public.content_feedback (status, created_at desc);

create index if not exists content_feedback_reporter_recent_idx
  on public.content_feedback (reporter_id, created_at desc);

create or replace function private.owns_generated_project(pid text) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists(
    select 1 from public.generated_projects where id = pid and owner_id = auth.uid()
  );
$$;
revoke all on function private.owns_generated_project(text) from public;
grant execute on function private.owns_generated_project(text) to authenticated;

create or replace function private.can_report_feedback(pid text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  has_is_public boolean;
  allowed boolean;
begin
  if uid is null or pid is null then
    return false;
  end if;
  if pid in (
    'harbour-clinic',
    'tidewater-swim',
    'parcelpal',
    'ward-infection-audit',
    'sunset-daycare',
    'bean-and-bread',
    'river-nitrate-lab',
    'ward-gel-audit'
  ) then
    return true;
  end if;
  if pid !~ '^gen-' then
    return false;
  end if;
  select exists(
    select 1 from pg_attribute
    where attrelid = 'public.generated_projects'::regclass
      and attname = 'is_public'
      and not attisdropped
  ) into has_is_public;

  if has_is_public then
    execute $q$
      select exists(
        select 1 from public.generated_projects gp
        where gp.id = $1 and (
          gp.owner_id = $2
          or gp.is_public = true
          or exists(
            select 1 from public.class_projects cp
            join public.class_members cm on cm.class_id = cp.class_id
            where cp.project_id = gp.id and cm.student_id = $2
          )
        )
      )
    $q$ into allowed using pid, uid;
    return coalesce(allowed, false);
  end if;

  return exists(
    select 1 from public.generated_projects gp
    where gp.id = pid and (
      gp.owner_id = uid
      or exists(
        select 1 from public.class_projects cp
        join public.class_members cm on cm.class_id = cp.class_id
        where cp.project_id = gp.id and cm.student_id = uid
      )
    )
  );
end;
$$;
revoke all on function private.can_report_feedback(text) from public;
grant execute on function private.can_report_feedback(text) to authenticated;

create or replace function private.feedback_within_rate_limit() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (
    select count(*) from public.content_feedback
    where reporter_id = auth.uid()
      and created_at >= now() - interval '1 hour'
  ) < 20;
$$;
revoke all on function private.feedback_within_rate_limit() from public;
grant execute on function private.feedback_within_rate_limit() to authenticated;

alter table public.content_feedback enable row level security;
revoke all on public.content_feedback from anon, authenticated;

grant select on public.content_feedback to authenticated;
grant insert (reporter_id, project_id, kind, surface, target_id, target_label, message, context)
  on public.content_feedback to authenticated;
grant update (status, resolution_note, resolved_at)
  on public.content_feedback to authenticated;
grant all on public.content_feedback to service_role;

drop policy if exists "feedback: reporter inserts own" on public.content_feedback;
create policy "feedback: reporter inserts own"
  on public.content_feedback
  for insert
  to authenticated
  with check (
    reporter_id = (select auth.uid())
    and status = 'open'
    and private.can_report_feedback(project_id)
    and private.feedback_within_rate_limit()
  );

drop policy if exists "feedback: reporter or owner reads" on public.content_feedback;
drop policy if exists "feedback: reporter, owner, or admin reads" on public.content_feedback;
create policy "feedback: reporter, owner, or admin reads"
  on public.content_feedback
  for select
  to authenticated
  using (
    reporter_id = (select auth.uid())
    or private.owns_generated_project(project_id)
    or private.is_admin()
  );

drop policy if exists "feedback: project owner resolves" on public.content_feedback;
drop policy if exists "feedback: project owner or admin resolves" on public.content_feedback;
create policy "feedback: project owner or admin resolves"
  on public.content_feedback
  for update
  to authenticated
  using (private.owns_generated_project(project_id) or private.is_admin())
  with check (private.owns_generated_project(project_id) or private.is_admin());

commit;
