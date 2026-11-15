export type AssignmentSaveStatus = { saving: boolean; saved: boolean; error: string | null; conflict: boolean };
export class AssignmentConflict extends Error {}

/** One write at a time, coalescing unsent changes into the latest selection. */
export function createAssignmentSaver(
  initialVersion: number,
  write: (projects: string[], version: number) => Promise<number>,
  report: (status: AssignmentSaveStatus) => void,
  onSaved: () => void,
) {
  let version = initialVersion;
  let pending: string[] | null = null;
  let running = false;
  let conflict = false;

  async function flush() {
    if (running || conflict || pending === null) return;
    running = true;
    report({ saving: true, saved: false, error: null, conflict: false });
    while (pending !== null) {
      const selection = pending;
      pending = null;
      try {
        version = await write(selection, version);
      } catch (error) {
        // Keep newer clicks, or the failed selection when nothing superseded it.
        pending ??= selection;
        conflict = error instanceof AssignmentConflict;
        running = false;
        report({ saving: false, saved: false, conflict,
          error: error instanceof Error ? error.message : "Could not save. Your choices are kept. Please retry." });
        return;
      }
    }
    running = false;
    report({ saving: false, saved: true, error: null, conflict: false });
    onSaved();
  }

  return {
    choose(projects: string[]) {
      if (conflict) return;
      pending = [...projects];
      void flush();
    },
    retry() { void flush(); },
    /** A router refresh must not erase unsaved clicks or move the version back. */
    sync(nextVersion: number) {
      if (running || pending !== null || conflict || nextVersion <= version) return false;
      version = nextVersion;
      return true;
    },
  };
}
