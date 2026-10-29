"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CourseCard } from "@/components/CourseCard";
import {
  courseLearningStatus,
  isCourseStarted,
} from "@/lib/learning/continue";
import { useLearner } from "@/lib/learner-store";
import type { Course } from "@/lib/types";

type StatusFilter = "All" | "Not started" | "In progress" | "Completed";

/**
 * The course catalogue is a library, not a landing page: search, subject and
 * status filters, then the courses themselves.
 */
export function CourseCatalogue({
  courses,
  signedIn,
}: {
  courses: Course[];
  signedIn: boolean;
}) {
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("All");
  const [domain, setDomain] = useState("All");
  const [status, setStatus] = useState<StatusFilter>("All");
  const { progress } = useLearner();

  const levels = useMemo(
    () => ["All", ...Array.from(new Set(courses.map((course) => course.level)))],
    [courses],
  );

  const domains = useMemo(
    () => [
      "All",
      ...Array.from(
        new Set(
          courses
            .map((course) => course.domain?.trim())
            .filter((value): value is string => !!value),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    ],
    [courses],
  );

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return courses
      .map((course, index) => ({ course, index }))
      .filter(({ course }) => {
        if (level !== "All" && course.level !== level) return false;
        if (domain !== "All" && (course.domain ?? "General") !== domain) return false;
        const learningStatus = courseLearningStatus(progress, course);
        if (status === "Not started" && learningStatus !== "not_started") return false;
        if (status === "In progress" && learningStatus !== "in_progress") return false;
        if (status === "Completed" && learningStatus !== "completed") return false;
        if (!q) return true;
        return [course.title, course.tagline, course.description, course.domain ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(q);
      })
      .sort(
        (a, b) =>
          Number(isCourseStarted(progress, b.course)) -
            Number(isCourseStarted(progress, a.course)) || a.index - b.index,
      )
      .map(({ course }) => course);
  }, [courses, domain, level, progress, query, status]);

  const statusFilters: StatusFilter[] = [
    "All",
    "Not started",
    "In progress",
    "Completed",
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-12 sm:pt-16">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
            Courses
          </h1>
          <p className="mt-2 max-w-xl leading-relaxed text-stone-600">
            A learning library across subjects — guided lessons, interactive practice
            and immersive projects in one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={signedIn ? "/my-courses" : "/login?next=/my-courses"}
            className="inline-flex items-center justify-center rounded-full bg-stone-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-stone-700"
          >
            Create with AI
          </Link>
          <Link
            href={signedIn ? "/dashboard" : "/login?next=/dashboard"}
            className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-5 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
          >
            {signedIn ? "My Learning" : "Sign in"}
          </Link>
        </div>
      </header>

      <div className="mt-8 space-y-4 border-b border-stone-200 pb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label htmlFor="course-search" className="sr-only">
              Search courses
            </label>
            <input
              id="course-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search courses"
              className="w-full rounded-full border border-stone-300 bg-white px-4 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 sm:w-64"
            />
          </div>
          <p className="ml-auto text-sm text-stone-500">
            {shown.length} {shown.length === 1 ? "course" : "courses"}
          </p>
        </div>

        <FilterRow label="Subject" options={domains} value={domain} onChange={setDomain} />
        <FilterRow label="Level" options={levels} value={level} onChange={setLevel} />
        <FilterRow
          label="Status"
          options={statusFilters}
          value={status}
          onChange={(value) => setStatus(value as StatusFilter)}
        />
      </div>

      {shown.length ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      ) : (
        <div className="mt-10 rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center">
          <p className="text-sm font-medium text-stone-800">No courses match these filters</p>
          <p className="mt-2 text-sm text-stone-600">
            Try another subject, level or learning status — or clear the search.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setLevel("All");
              setDomain("All");
              setStatus("All");
            }}
            className="mt-5 rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}

function FilterRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  if (options.length <= 1) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-16 text-xs font-semibold uppercase tracking-wide text-stone-400">
        {label}
      </span>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          aria-pressed={value === option}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
            value === option
              ? "bg-stone-900 text-white"
              : "border border-stone-300 bg-white text-stone-600 hover:bg-stone-100"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
