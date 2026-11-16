-- Template changes and instructor edits are independent version boundaries.
begin;

do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public'
    and table_name = 'generated_projects' and column_name = 'content_revision') then
    alter table public.generated_projects add column content_revision integer not null default 1 check (content_revision > 0);
    -- Old runs did not record instructor edits. Their compatibility cannot be
    -- established, so require one fresh run for existing generated projects.
    update public.generated_projects set content_revision = 2;
  end if;
end $$;

grant select (content_revision) on public.generated_projects to authenticated;

create or replace function private.bump_project_content_revision()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.draft is distinct from old.draft then
    new.content_revision := old.content_revision + 1;
  else
    new.content_revision := old.content_revision;
  end if;
  return new;
end $$;
revoke all on function private.bump_project_content_revision() from public;
drop trigger if exists generated_project_content_revision on public.generated_projects;
create trigger generated_project_content_revision before update on public.generated_projects
for each row execute function private.bump_project_content_revision();

commit;
