import { sameActivityContent, type LearningActivity } from "./registry";

export const MODEL_HISTORY_LIMIT = 8;

export type ActivityAttempt = {
  activity_id?: string;
  lesson_id?: string;
  activity_snapshot?: unknown;
  response: string;
  feedback?: unknown;
};

/** Count current evidence before trimming the conversation sent to the model. */
export function activityHistory<T extends ActivityAttempt>(
  rows: T[],
  activity: LearningActivity,
  lessonId: string,
  options: { ephemeral?: boolean; previewAttemptCount?: number } = {},
) {
  const { ephemeral = false, previewAttemptCount } = options;
  const attempts = rows.filter(row =>
    (row.activity_id === activity.id || (ephemeral && row.activity_id === undefined)) &&
    (row.lesson_id === lessonId || (ephemeral && row.lesson_id === undefined)) &&
    (row.activity_snapshot === undefined && ephemeral || sameActivityContent(row.activity_snapshot, activity)),
  );
  return {
    attempts,
    // Only a non-persisted preview may use a browser-provided count. Real
    // learning evidence is always counted from server-read, matching snapshots.
    previousAttemptCount: ephemeral
      ? Math.max(attempts.length, previewAttemptCount ?? 0)
      : attempts.length,
    previous: attempts.slice(-MODEL_HISTORY_LIMIT).map(row => ({
      response: row.response,
      feedback: row.feedback,
    })),
  };
}
