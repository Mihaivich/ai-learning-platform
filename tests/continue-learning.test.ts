import test from "node:test";
import assert from "node:assert/strict";
import {
  continueLearningTarget,
  courseLearningStatus,
} from "../src/lib/learning/continue";
import { featuredCourses } from "../src/lib/learning/featured";
import type { Course } from "../src/lib/types";
import type { ProgressMap } from "../src/lib/learner-progress";

function course(id: string, lessons: string[]): Course {
  return {
    id,
    title: id,
    tagline: "",
    description: "",
    level: "Beginner",
    audience: [],
    emoji: "📘",
    lessons: lessons.map((lessonId) => ({
      id: lessonId,
      title: lessonId,
      summary: "",
      minutes: 10,
      blocks: [],
    })),
  };
}

test("continue learning prefers an active course over an untouched catalogue course", () => {
  const courses = [course("a", ["a1", "a2"]), course("b", ["b1", "b2"])];
  const progress: ProgressMap = {
    "b/b1": { blocks: { x: { done: true } } },
  };
  const target = continueLearningTarget(courses, progress);
  assert.equal(target?.course.id, "b");
  assert.equal(target?.lesson.id, "b1");
  assert.equal(target?.started, true);
});

test("continue learning falls back to the first unfinished course when none are active", () => {
  const courses = [course("a", ["a1"]), course("b", ["b1"])];
  const target = continueLearningTarget(courses, {});
  assert.equal(target?.course.id, "a");
  assert.equal(target?.started, false);
});

test("course learning status covers not started, in progress and completed", () => {
  const sample = course("c", ["l1", "l2"]);
  assert.equal(courseLearningStatus({}, sample), "not_started");
  assert.equal(
    courseLearningStatus({ "c/l1": { blocks: { a: { done: true } } } }, sample),
    "in_progress",
  );
  assert.equal(
    courseLearningStatus(
      {
        "c/l1": { completedAt: "2026-01-01", blocks: {} },
        "c/l2": { completedAt: "2026-01-02", blocks: {} },
      },
      sample,
    ),
    "completed",
  );
});

test("featured courses reuse catalogue objects in preferred order", () => {
  const courses = [
    course("ai-coding-agents", ["l"]),
    course("demo-english-negotiation", ["l"]),
    course("se-essentials", ["l"]),
    course("other", ["l"]),
  ];
  const featured = featuredCourses(courses, 3);
  assert.deepEqual(
    featured.map((item) => item.id),
    ["se-essentials", "demo-english-negotiation", "ai-coding-agents"],
  );
  assert.equal(featured[0], courses[2]);
});
