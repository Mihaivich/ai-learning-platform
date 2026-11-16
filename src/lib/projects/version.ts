import type { ProjectScenario } from "./types";

type VersionedProject = Pick<ProjectScenario, "id" | "version" | "contentRevision">;

export function projectSnapshot(project: VersionedProject) {
  return {
    project: project.id,
    version: project.version,
    ...(project.contentRevision === undefined ? {} : { contentRevision: project.contentRevision }),
  };
}

/** Older snapshots refer to revision 1; missing snapshots never prove completion. */
export function matchesProjectVersion(snapshot: unknown, project: VersionedProject) {
  if (!snapshot || typeof snapshot !== "object") return false;
  const saved = snapshot as Record<string, unknown>;
  return saved.project === project.id && saved.version === project.version &&
    (project.contentRevision === undefined || (saved.contentRevision ?? 1) === project.contentRevision);
}
