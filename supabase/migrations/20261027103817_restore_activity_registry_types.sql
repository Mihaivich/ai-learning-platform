-- Keep the existing course constraint in sync with the Activity Registry.
-- No row or existing migration is replaced; this only expands valid types
-- and rejects missing structural fields which SQL NULL comparisons skipped.
begin;

create or replace function private.course_document_ok(course_id uuid, doc jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  lesson jsonb;
  block jsonb;
  ids text[] := array[]::text[];
  lid text;
  bid text;
begin
  if jsonb_typeof(doc) is distinct from 'object' then return false; end if;
  if doc->>'id' is distinct from course_id::text then return false; end if;
  if jsonb_typeof(doc->'lessons') is distinct from 'array' then return false; end if;
  if jsonb_array_length(doc->'lessons') > 30 then return false; end if;
  for lesson in select value from jsonb_array_elements(doc->'lessons')
  loop
    if jsonb_typeof(lesson) is distinct from 'object' then return false; end if;
    lid := lesson->>'id';
    if lid is null or length(btrim(lid)) < 1 or length(lid) > 300 then return false; end if;
    if lid = any (ids) then return false; end if;
    ids := ids || lid;
    if jsonb_typeof(lesson->'blocks') is distinct from 'array' then return false; end if;
    if jsonb_array_length(lesson->'blocks') > 40 then return false; end if;
    for block in select value from jsonb_array_elements(lesson->'blocks')
    loop
      if jsonb_typeof(block) is distinct from 'object' then return false; end if;
      bid := block->>'id';
      if bid is null or length(btrim(bid)) < 1 or length(bid) > 300 then return false; end if;
      if bid = any (ids) then return false; end if;
      ids := ids || bid;
      if block->>'type' is distinct from 'activity' then return false; end if;
      if block->>'version' is distinct from '1' then return false; end if;
      if coalesce(block->>'activityType', '') not in
        ('reading', 'choice', 'response', 'quiz', 'ordering', 'conversation',
         'code-review', 'simulation', 'project') then
        return false;
      end if;
      if jsonb_typeof(block->'config') is distinct from 'object' then return false; end if;
    end loop;
  end loop;
  return true;
end;
$$;
revoke all on function private.course_document_ok(uuid, jsonb) from public;
grant execute on function private.course_document_ok(uuid, jsonb) to anon, authenticated, service_role;


commit;
