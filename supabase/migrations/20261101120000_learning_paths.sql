-- Learning paths (src/lib/projects/generated/path.ts): a short series of
-- generated projects that teach one subject, one step at a time. Each step's
-- project is generated when the learner reaches it and links back here.
--
-- The plan holds only what the learner is told up front (step titles, jobs,
-- concept names, levels), so the owner may read whole rows. The server is the
-- only writer.
begin;

create table if not exists public.learning_paths (
  id text primary key check (id ~ '^path-[a-z0-9]{10,32}$'),
  owner_id uuid not null references auth.users (id) on delete cascade,
  subject text not null check (char_length(subject) between 1 and 80),
  domain text not null check (char_length(domain) between 1 and 80),
  title text not null check (char_length(title) between 1 and 80),
  summary text not null check (char_length(summary) between 1 and 400),
  plan jsonb not null,
  model text not null,
  created_at timestamptz not null default now()
);

create index if not exists learning_paths_owner_idx
  on public.learning_paths (owner_id, created_at desc);

alter table public.learning_paths enable row level security;
revoke all on public.learning_paths from anon, authenticated;
grant select on public.learning_paths to authenticated;
grant all on public.learning_paths to service_role;

drop policy if exists "learning paths: own rows" on public.learning_paths;
create policy "learning paths: own rows"
  on public.learning_paths
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

-- A project generated for a step of a path. One project per step.
alter table public.generated_projects
  add column if not exists path_id text references public.learning_paths (id) on delete set null,
  add column if not exists path_step integer check (path_step between 1 and 5);

create unique index if not exists generated_projects_path_step_idx
  on public.generated_projects (path_id, path_step)
  where path_id is not null;

grant select (path_id, path_step) on public.generated_projects to authenticated;

commit;
