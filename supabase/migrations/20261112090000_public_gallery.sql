-- Community Gallery & Cross-Disciplinary Subject Metadata for Generated Mini-Courses.
--
-- Security invariant: `draft` (which contains hidden facts, checklists, and flawed
-- variants) remains strictly unreadable by `anon` and `authenticated`. Browsers can
-- read ONLY safe listing metadata on their own rows or rows shared to the gallery.
begin;

alter table public.generated_projects
  add column if not exists subject text check (subject is null or char_length(subject) <= 80),
  add column if not exists is_public boolean not null default false;

create index if not exists generated_projects_public_idx
  on public.generated_projects (created_at desc)
  where is_public = true;

revoke all on public.generated_projects from anon, authenticated;

grant select (id, owner_id, domain, subject, topic, title, tagline, summary, is_public, created_at)
  on public.generated_projects to anon, authenticated;

grant update (is_public)
  on public.generated_projects to authenticated;

grant all on public.generated_projects to service_role;

drop policy if exists "generated projects: public gallery" on public.generated_projects;
create policy "generated projects: public gallery"
  on public.generated_projects
  for select
  to anon, authenticated
  using (is_public = true);

drop policy if exists "generated projects: owner toggles public" on public.generated_projects;
create policy "generated projects: owner toggles public"
  on public.generated_projects
  for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

commit;
