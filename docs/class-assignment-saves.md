# Reliable class project assignment

Apply `supabase/migrations/20261112130000_atomic_class_assignments.sql` before deploying. It adds `classes.projects_version` and the transactional `replace_class_projects` RPC. Direct authenticated inserts/deletes on `class_projects` are revoked so writes cannot bypass the version check. The class owner can still read assignments; student membership, roster imports and join codes are unchanged.

The class page shows selections immediately. It sends one save at a time and combines any further clicks into the latest unsent selection. **Saving…** becomes **Saved** only after the last selection is acknowledged. A failed request keeps the choices and offers **Retry save**. If another tab changed the version, **Reload assignments** loads the current saved state; stale writes cannot overwrite it.

Each save checks the expected version, replaces the selected project set and increments the version in one database transaction under a class-row lock. A failed insertion rolls the entire change back. The API verifies the instructor, class ownership and available projects; the RPC also checks class ownership and ownership of generated projects. Existing callers must send `expectedVersion` with the project list.

Manual checks:

1. Delay the first save, select A, then B, then unselect A. Keep clicking available while saving. After **Saved**, refresh: only B remains.
2. Unselect the final project, wait for **Saved**, refresh: the list remains empty.
3. Fail a save, check that the choices remain, then retry. A lost response after a committed save may produce a conflict on retry; reload to inspect the saved state.
4. Open two tabs at the same version. Save in one, then try the other: it must show a conflict and require reload rather than overwrite the first tab.
5. Confirm students and another class owner cannot assign projects to this class.
