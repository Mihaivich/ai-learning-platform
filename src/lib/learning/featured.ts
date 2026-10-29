import type { Course } from "@/lib/types";

/** Prefer a cross-domain mix for the homepage; fall back to catalogue order. */
const FEATURED_IDS = [
  "se-essentials",
  "demo-english-negotiation",
  "ai-coding-agents",
] as const;

/**
 * Shared featured subset for the landing page. Uses the same course objects
 * returned by listCourses() / the catalogue — never a second hardcoded list.
 */
export function featuredCourses(courses: Course[], limit = 3): Course[] {
  const byId = new Map(courses.map((course) => [course.id, course]));
  const selected: Course[] = [];
  for (const id of FEATURED_IDS) {
    const course = byId.get(id);
    if (course) selected.push(course);
    if (selected.length >= limit) return selected;
  }
  for (const course of courses) {
    if (selected.some((item) => item.id === course.id)) continue;
    selected.push(course);
    if (selected.length >= limit) break;
  }
  return selected;
}
