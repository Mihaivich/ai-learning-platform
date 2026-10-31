-- Classes (src/lib/classes.ts): an instructor's group of students and the
-- projects assigned to it. Students join with the class's code, through
-- join_class only; the instructor reads their runs on the server, after the
-- ownership check, with the service role.
begin;

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  -- Six characters without look-alikes (no I, O, 0 or 1).
  join_code text not null unique check (join_code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  created_at timestamptz not null default now()
);

create index if not exists classes_owner_idx on public.classes (owner_id, created_at desc);

create table if not exists public.class_members (
  class_id uuid not null references public.classes (id) on delete cascade,
  student_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (class_id, student_id)
);

create index if not exists class_members_student_idx on public.class_members (student_id);

-- A built-in project assigned to the class, by its id ("harbour-clinic").
create table if not exists public.class_projects (
  class_id uuid not null references public.classes (id) on delete cascade,
  project_id text not null check (project_id ~ '^[a-z0-9-]{1,64}$'),
  assigned_at timestamptz not null default now(),
  primary key (class_id, project_id)
);

-- Lookups that would otherwise recurse through these tables' own policies.
create or replace function private.owns_class(cid uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists(select 1 from public.classes where id = cid and owner_id = auth.uid());
$$;
create or replace function private.in_class(cid uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists(select 1 from public.class_members where class_id = cid and student_id = auth.uid());
$$;
revoke all on function private.owns_class(uuid), private.in_class(uuid) from public;
grant execute on function private.owns_class(uuid), private.in_class(uuid) to authenticated;

alter table public.classes enable row level security;
alter table public.class_members enable row level security;
alter table public.class_projects enable row level security;
revoke all on public.classes, public.class_members, public.class_projects from anon, authenticated;
grant select, insert, delete on public.classes to authenticated;
grant update (name) on public.classes to authenticated;
grant select, delete on public.class_members to authenticated;
grant select, insert, delete on public.class_projects to authenticated;
grant all on public.classes, public.class_members, public.class_projects to service_role;

drop policy if exists "classes: owner or member reads" on public.classes;
create policy "classes: owner or member reads" on public.classes for select to authenticated
  using (owner_id = (select auth.uid()) or private.in_class(id));
drop policy if exists "classes: instructors create" on public.classes;
create policy "classes: instructors create" on public.classes for insert to authenticated
  with check (owner_id = (select auth.uid()) and private.is_teacher());
drop policy if exists "classes: owner renames" on public.classes;
create policy "classes: owner renames" on public.classes for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
drop policy if exists "classes: owner deletes" on public.classes;
create policy "classes: owner deletes" on public.classes for delete to authenticated
  using (owner_id = (select auth.uid()));

-- No insert policy: students join through join_class.
drop policy if exists "class members: self or owner reads" on public.class_members;
create policy "class members: self or owner reads" on public.class_members for select to authenticated
  using (student_id = (select auth.uid()) or private.owns_class(class_id));
drop policy if exists "class members: self leaves, owner removes" on public.class_members;
create policy "class members: self leaves, owner removes" on public.class_members for delete to authenticated
  using (student_id = (select auth.uid()) or private.owns_class(class_id));

drop policy if exists "class projects: owner or member reads" on public.class_projects;
create policy "class projects: owner or member reads" on public.class_projects for select to authenticated
  using (private.owns_class(class_id) or private.in_class(class_id));
drop policy if exists "class projects: owner assigns" on public.class_projects;
create policy "class projects: owner assigns" on public.class_projects for insert to authenticated
  with check (private.owns_class(class_id));
drop policy if exists "class projects: owner unassigns" on public.class_projects;
create policy "class projects: owner unassigns" on public.class_projects for delete to authenticated
  using (private.owns_class(class_id));

-- Joins the signed-in user to the class with this code. Takes only the code.
create or replace function public.join_class(code text) returns table (id uuid, name text)
language plpgsql security definer set search_path = '' as $$
declare found_id uuid; found_name text;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  select c.id, c.name into found_id, found_name from public.classes c where c.join_code = upper(trim(code));
  if found_id is null then raise exception 'No class has that code' using errcode = 'P0002'; end if;
  insert into public.class_members (class_id, student_id) values (found_id, auth.uid()) on conflict do nothing;
  return query select found_id, found_name;
end; $$;
revoke all on function public.join_class(text) from public, anon;
grant execute on function public.join_class(text) to authenticated;

commit;
