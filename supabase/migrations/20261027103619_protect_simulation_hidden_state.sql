-- Raw session state includes hidden variables, action rules and project facts.
-- Both project and generic simulation APIs already authorize the caller and
-- read through the server-only writer, then return a public projection.
-- Preserve every row and RLS; remove the direct browser read bypass.
begin;
revoke select on public.simulation_sessions from anon, authenticated;
drop policy if exists "simulation sessions: own rows" on public.simulation_sessions;
grant all on public.simulation_sessions to service_role;
commit;
