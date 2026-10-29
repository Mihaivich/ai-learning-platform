import type { Course, Lesson } from "@/lib/types";
import type { ProgressMap } from "@/lib/learner-progress";

export type ContinueTarget = {
  course: Course;
  lesson: Lesson;
  started: boolean;
};

function lessonProgress(progress: ProgressMap, courseId: string, lessonId: string) {
  return progress[`${courseId}/${lessonId}`];
}

export function isCourseStarted(progress: ProgressMap, course: Course) {
  return course.lessons.some((lesson) => {
    const p = lessonProgress(progress, course.id, lesson.id);
    return !!p?.completedAt || Object.values(p?.blocks ?? {}).some((b) => b.done);
  });
}

export function isCourseCompleted(progress: ProgressMap, course: Course) {
  return (
    course.lessons.length > 0 &&
    course.lessons.every((lesson) => !!lessonProgress(progress, course.id, lesson.id)?.completedAt)
  );
}

function courseRecency(progress: ProgressMap, course: Course) {
  let latest = 0;
  for (const lesson of course.lessons) {
    const p = lessonProgress(progress, course.id, lesson.id);
    if (!p) continue;
    if (p.completedAt) {
      const ts = Date.parse(p.completedAt);
      if (!Number.isNaN(ts)) latest = Math.max(latest, ts);
    }
    // Activity completion timestamps are not stored per block; treat any
    // in-progress lesson as more recent than untouched courses via presence.
    if (Object.values(p.blocks ?? {}).some((b) => b.done) && !p.completedAt) {
      latest = Math.max(latest, 1);
    }
  }
  return latest;
}

/**
 * Prefer a genuinely active course over the first unfinished lesson of an
 * untouched catalogue course.
 */
export function continueLearningTarget(
  courses: Course[],
  progress: ProgressMap,
): ContinueTarget | null {
  const active = courses
    .filter((course) => isCourseStarted(progress, course) && !isCourseCompleted(progress, course))
    .sort((a, b) => courseRecency(progress, b) - courseRecency(progress, a));

  const pool = active.length ? active : courses.filter((course) => !isCourseCompleted(progress, course));

  for (const course of pool) {
    const lesson = course.lessons.find(
      (item) => !lessonProgress(progress, course.id, item.id)?.completedAt,
    );
    if (lesson) {
      return {
        course,
        lesson,
        started: isCourseStarted(progress, course),
      };
    }
  }
  return null;
}

export function courseLearningStatus(
  progress: ProgressMap,
  course: Course,
): "not_started" | "in_progress" | "completed" {
  if (isCourseCompleted(progress, course)) return "completed";
  if (isCourseStarted(progress, course)) return "in_progress";
  return "not_started";
}
