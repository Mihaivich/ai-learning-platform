-- A class may share only its owner's generated projects. Non-generated
-- (built-in) project assignments retain their existing behaviour.
begin;

create or replace function private.can_assign_project(pid text)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (
    left(pid, 4) <> 'gen-' or exists (
      select 1 from public.generated_projects
      where id = pid and owner_id = auth.uid()
    )
  );
$$;
revoke all on function private.can_assign_project(text) from public;
grant execute on function private.can_assign_project(text) to authenticated;

drop policy if exists "class projects: owner assigns" on public.class_projects;
create policy "class projects: owner assigns" on public.class_projects
  for insert to authenticated
  with check (private.owns_class(class_id) and private.can_assign_project(project_id));

-- Remove previously accepted cross-owner and dangling generated assignments.
-- Projects and student runs themselves are retained.
delete from public.class_projects as assignment
where left(assignment.project_id, 4) = 'gen-'
  and not exists (
    select 1 from public.generated_projects as project
    join public.classes as class on class.owner_id = project.owner_id
    where project.id = assignment.project_id and class.id = assignment.class_id
  );

commit;
