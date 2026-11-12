-- Add roster imports without changing project drafts, classes or join codes.
begin;

create table public.class_invitations (
  class_id uuid not null references public.classes(id) on delete cascade,
  email text not null check (email = lower(trim(email)) and char_length(email) between 3 and 254),
  created_at timestamptz not null default now(),
  primary key (class_id, email)
);
create index class_invitations_email_idx on public.class_invitations(email);
alter table public.class_invitations enable row level security;
revoke all on public.class_invitations from public, anon, authenticated;
grant select, delete on public.class_invitations to authenticated;
grant all on public.class_invitations to service_role;
create policy "class invitations: owner reads" on public.class_invitations for select to authenticated
  using (private.owns_class(class_id));
create policy "class invitations: owner cancels" on public.class_invitations for delete to authenticated
  using (private.owns_class(class_id));

-- The email lookup is confined to an owned class, never exposed as a directory.
create function public.import_class_roster(p_class_id uuid, p_emails text[])
returns table(email text, status text)
language plpgsql security definer set search_path = '' as $$
declare address text; account_id uuid; written integer;
begin
  if auth.uid() is null or not private.is_teacher() or not private.owns_class(p_class_id) then
    raise exception 'Instructor class ownership required' using errcode = '42501';
  end if;
  if p_emails is null or cardinality(p_emails) not between 1 and 500 then
    raise exception 'Import between 1 and 500 emails' using errcode = '22023';
  end if;
  -- Check the entire batch before writing; malformed direct RPC calls are atomic.
  if exists (select 1 from unnest(p_emails) e(value) where value is null
    or char_length(trim(value)) not between 3 and 254
    or trim(value) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') then
    raise exception 'Invalid email list' using errcode = '22023';
  end if;
  for address in select distinct lower(trim(value)) from unnest(p_emails) e(value) order by 1 loop
    account_id := null;
    select u.id into account_id from auth.users u
      where lower(u.email) = address and u.email_confirmed_at is not null order by u.id limit 1;
    if account_id is not null then
      insert into public.class_members(class_id, student_id) values(p_class_id, account_id) on conflict do nothing;
      get diagnostics written = row_count;
      delete from public.class_invitations i where i.class_id = p_class_id and i.email = address;
      return query select address, case when written = 1 then 'added' else 'already-member' end;
    else
      insert into public.class_invitations(class_id, email) values(p_class_id, address) on conflict do nothing;
      get diagnostics written = row_count;
      return query select address, case when written = 1 then 'pending' else 'already-pending' end;
    end if;
  end loop;
end; $$;
revoke all on function public.import_class_roster(uuid, text[]) from public, anon;
grant execute on function public.import_class_roster(uuid, text[]) to authenticated;

-- No email or user id argument: only the caller's verified account can claim.
create function public.claim_class_invitations() returns integer
language plpgsql security definer set search_path = '' as $$
declare address text; claimed integer;
begin
  select lower(u.email) into address from auth.users u
    where u.id = auth.uid() and u.email_confirmed_at is not null;
  if address is null then return 0; end if;
  -- DELETE RETURNING locks each invitation so cancellation/claims cannot race
  -- into a later re-enrolment. The insert and deletion are one transaction.
  with accepted as (
    delete from public.class_invitations i where i.email = address returning i.class_id
  )
  insert into public.class_members(class_id, student_id)
    select class_id, auth.uid() from accepted on conflict do nothing;
  get diagnostics claimed = row_count;
  return claimed;
end; $$;
revoke all on function public.claim_class_invitations() from public, anon;
grant execute on function public.claim_class_invitations() to authenticated;

commit;
