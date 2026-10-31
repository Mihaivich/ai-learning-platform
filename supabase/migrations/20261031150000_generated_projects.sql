-- Projects written by the AI for a user (src/lib/projects/generated). Private
-- to their owner for now.
--
-- The draft holds the hidden facts and flawed deliverables, so the browser may
-- read only the listing columns of its own rows. The server reads the draft
-- with the service role after checking ownership, and is the only writer.
begin;

create table if not exists public.generated_projects (
  id text primary key check (id ~ '^gen-[a-z0-9]{10,32}$'),
  owner_id uuid not null references auth.users (id) on delete cascade,
  domain text not null check (char_length(domain) between 1 and 80),
  topic text not null check (char_length(topic) between 1 and 200),
  title text not null check (char_length(title) between 1 and 80),
  tagline text not null check (char_length(tagline) between 1 and 200),
  summary text not null check (char_length(summary) between 1 and 600),
  draft jsonb not null,
  -- The template version the draft was built with; runs restart when it changes.
  template_version integer not null check (template_version > 0),
  model text not null,
  created_at timestamptz not null default now()
);

create index if not exists generated_projects_owner_idx
  on public.generated_projects (owner_id, created_at desc);

alter table public.generated_projects enable row level security;
revoke all on public.generated_projects from anon, authenticated;
grant select (id, owner_id, domain, topic, title, tagline, summary, created_at)
  on public.generated_projects to authenticated;
grant all on public.generated_projects to service_role;

drop policy if exists "generated projects: own rows" on public.generated_projects;
create policy "generated projects: own rows"
  on public.generated_projects
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

commit;
