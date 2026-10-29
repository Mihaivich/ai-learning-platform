"use client";

import Link from "next/link";
import { courseLearningStatus } from "@/lib/learning/continue";
import { useLearner } from "@/lib/learner-store";
import type { Course } from "@/lib/types";

const STATUS_LABEL = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
} as const;

const STATUS_TONE = {
  not_started: "bg-stone-100 text-stone-600",
  in_progress: "bg-amber-50 text-amber-800",
  completed: "bg-emerald-50 text-emerald-800",
} as const;

export function CourseCard({ course }: { course: Course }) {
  const { progress } = useLearner();
  const done = course.lessons.filter(
    (l) => progress[`${course.id}/${l.id}`]?.completedAt,
  ).length;
  const pct = Math.round((done / Math.max(course.lessons.length, 1)) * 100);
  const minutes =
    course.estimatedMinutes ??
    course.lessons.reduce((sum, l) => sum + l.minutes, 0);
  const status = courseLearningStatus(progress, course);
  const continueLesson = course.lessons.find(
    (lesson) => !progress[`${course.id}/${lesson.id}`]?.completedAt,
  );

  return (
    <article className="flex flex-col rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <span className="text-3xl" aria-hidden>
          {course.emoji}
        </span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_TONE[status]}`}
        >
          {STATUS_LABEL[status]}
        </span>
      </div>
      <Link href={`/courses/${course.id}`} className="group mt-4 block">
        <h3 className="text-lg font-semibold text-stone-900 group-hover:text-indigo-700">
          {course.title}
        </h3>
        <p className="mt-1 text-sm text-stone-600">{course.tagline}</p>
      </Link>
      <p className="mt-4 text-xs text-stone-500">
        {course.domain ? `${course.domain} · ` : ""}
        {course.level} · {course.lessons.length} lessons · ~{minutes} min
      </p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-stone-100">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-stone-500">
        {done === 0
          ? "Not started"
          : `${done} of ${course.lessons.length} lessons done`}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={`/courses/${course.id}`}
          className="rounded-full border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
        >
          View course
        </Link>
        {status !== "completed" && continueLesson && (
          <Link
            href={`/courses/${course.id}/${continueLesson.id}`}
            className="rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
          >
            {status === "in_progress" ? "Continue learning" : "Start learning"}
          </Link>
        )}
      </div>
    </article>
  );
}
