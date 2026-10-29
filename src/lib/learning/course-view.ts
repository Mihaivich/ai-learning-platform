import { interpretStoredCourse } from "./read";
import { redactCourseSimulations } from "./simulation/public";

export type StoredCourseRow = {
  id: string;
  owner_id: string;
  status: string;
  visibility: string;
  revision: number;
  document: unknown;
  created_at?: string;
  updated_at?: string;
};

/**
 * Accessible catalogue rows keep the course a learner renders.
 * Another owner's id and bookkeeping columns stay on the server.
 * The caller's own rows stay intact for the studio.
 */
export function courseForClient(
  row: StoredCourseRow,
  userId: string,
  accessibleList: boolean,
) {
  if (!accessibleList || row.owner_id === userId) return row;
  const interpreted = interpretStoredCourse(row.document);
  return {
    id: row.id,
    status: row.status,
    visibility: row.visibility,
    document: interpreted.course ? redactCourseSimulations(interpreted.course) : row.document,
  };
}
