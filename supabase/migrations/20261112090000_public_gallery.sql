-- Public Community Gallery and optional subject metadata for generated projects.
--
-- Security invariants:
--   1. Preserve existing column grants on generated_projects (including path_id, path_step).
--   2. Never expose owner_id or draft publicly on generated_projects: public discovery
--      goes exclusively through public.list_public_projects(int).
begin;

alter table public.generated_projects
  add column if not exists subject text not null default '' check (char_length(subject) <= 120),
  add column if not exists is_public boolean not null default false;

create index if not exists generated_projects_public_idx
  on public.generated_projects (created_at desc)
  where is_public = true;

-- Additive grants only: keep id, owner_id, domain, topic, title, tagline, summary, created_at, path_id, path_step.
grant select (subject, is_public)
  on public.generated_projects to authenticated;

grant update (is_public)
  on public.generated_projects to authenticated;

drop policy if exists "generated projects: owner toggles public" on public.generated_projects;
create policy "generated projects: owner toggles public"
  on public.generated_projects
  for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create or replace function public.list_public_projects(p_limit int default 24)
returns table (
  id text,
  domain text,
  subject text,
  topic text,
  title text,
  tagline text,
  summary text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    gp.id,
    gp.domain,
    gp.subject,
    gp.topic,
    gp.title,
    gp.tagline,
    gp.summary,
    gp.created_at
  from public.generated_projects gp
  where gp.is_public = true
  order by gp.created_at desc
  limit greatest(1, least(coalesce(p_limit, 24), 60));
$$;

revoke all on function public.list_public_projects(int) from public;
grant execute on function public.list_public_projects(int) to anon, authenticated, service_role;

commit;
