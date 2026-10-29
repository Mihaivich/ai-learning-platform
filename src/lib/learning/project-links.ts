/** Browser-safe links. Paths are constructed from IDs, never from a return URL. */
export type ProjectCourseContext = { courseId: string; lessonId: string; activityId: string };

export function lessonHref(context: ProjectCourseContext) {
  return `/courses/${encodeURIComponent(context.courseId)}/${encodeURIComponent(context.lessonId)}`;
}

export function projectHref(scenarioId: string, context?: ProjectCourseContext) {
  const path = `/projects/${encodeURIComponent(scenarioId)}`;
  return context ? `${path}?${new URLSearchParams(context)}` : path;
}
