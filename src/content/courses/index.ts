import type { Course, Lesson } from "@/lib/types";
import { activityForTutor, validateActivity } from "@/lib/learning/registry";
import { aiCodingAgents } from "./ai-coding-agents";
import { presentationDemos } from "./presentation-demos";
import { seEssentials } from "./se-essentials";

/** Cross-domain demos that belong in the public catalogue. */
const publicPresentationDemos = presentationDemos.filter((course) =>
  ["demo-english-negotiation", "demo-business-negotiation"].includes(course.id),
);

/**
 * Public catalogue. Includes at least one non-software subject so the platform
 * demonstrates general-purpose learning, not only SE examples.
 */
export const catalogCourses: Course[] = [
  seEssentials,
  aiCodingAgents,
  ...publicPresentationDemos,
];

export const courses: Course[] = [...catalogCourses, ...presentationDemos].filter(
  (course, index, all) => all.findIndex((item) => item.id === course.id) === index,
);

export function isPresentationDemo(id: string): boolean {
  return presentationDemos.some((course) => course.id === id);
}

export function getCourse(courseId: string): Course | undefined {
  return courses.find((c) => c.id === courseId);
}

export function getLesson(courseId: string, lessonId: string): { course: Course; lesson: Lesson } | undefined {
  const course = getCourse(courseId);
  const lesson = course?.lessons.find((l) => l.id === lessonId);
  return course && lesson ? { course, lesson } : undefined;
}

/** Plain-text version of a lesson, given to the AI tutor as context. */
export function lessonAsText(lesson: Lesson): string {
  return lesson.blocks
    .map((block) => {
      const parsed = validateActivity(block);
      if (!parsed.success) return `Unsupported activity (${block.activityType}).`;
      return JSON.stringify({
        objectives: parsed.data.objectives,
        ...((activityForTutor(parsed.data) as object) ?? {}),
      });
    })
    .join("\n\n");
}
