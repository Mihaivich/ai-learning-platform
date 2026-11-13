-- Role & class-scoped AI quotas, plus learner content & diagram feedback.
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

-- 2. Class-level student hourly quota limits set by the class's instructor.
alter table public.classes
  add column if not exists quota_generation integer check (quota_generation is null or (quota_generation >= 0 and quota_generation <= 500)),
  add column if not exists quota_roleplay integer check (quota_roleplay is null or (quota_roleplay >= 0 and quota_roleplay <= 500)),
  add column if not exists quota_feedback integer check (quota_feedback is null or (quota_feedback >= 0 and quota_feedback <= 500));

grant update (name, quota_generation, quota_roleplay, quota_feedback) on public.classes to authenticated;

-- 3. Widen consume_ai_quota ceiling from 100 to 500 so instructor/admin allowances work.
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

-- 4. Content & diagram issue feedback reported by learners and triaged by instructors/admins.
create table if not exists public.content_feedback (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users (id) on delete cascade,
  project_id text not null check (project_id ~ '^[a-z0-9-]{1,64}$'),
  kind text not null check (kind in ('content_error', 'grading_issue', 'unclear', 'diagram_broken')),
  surface text not null check (surface in ('primer', 'game', 'desktop', 'report')),
  target_id text check (target_id is null or char_length(target_id) <= 80),
  target_label text check (target_label is null or char_length(target_label) <= 160),
  message text not null check (char_length(btrim(message)) between 3 and 1000),
  context jsonb not null default '{}'::jsonb check (jsonb_typeof(context) = 'object'),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  resolution_note text check (resolution_note is null or char_length(resolution_note) <= 500),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists content_feedback_project_idx
  on public.content_feedback (project_id, status, created_at desc);

create index if not exists content_feedback_status_idx
  on public.content_feedback (status, created_at desc);

create or replace function private.owns_generated_project(pid text) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists(
    select 1 from public.generated_projects where id = pid and owner_id = auth.uid()
  );
$$;
revoke all on function private.owns_generated_project(text) from public;
grant execute on function private.owns_generated_project(text) to authenticated;

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
  with check (reporter_id = (select auth.uid()) and status = 'open');

drop policy if exists "feedback: reporter or owner reads" on public.content_feedback;
create policy "feedback: reporter or owner reads"
  on public.content_feedback
  for select
  to authenticated
  using (reporter_id = (select auth.uid()) or private.owns_generated_project(project_id));

drop policy if exists "feedback: project owner resolves" on public.content_feedback;
create policy "feedback: project owner resolves"
  on public.content_feedback
  for update
  to authenticated
  using (private.owns_generated_project(project_id))
  with check (private.owns_generated_project(project_id));

commit;
