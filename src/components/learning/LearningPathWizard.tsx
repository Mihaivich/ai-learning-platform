"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { newCourse, outlineSchema, type CourseDocument } from "@/lib/learning/model";
import { useLearner } from "@/lib/learner-store";

type Step = "form" | "working" | "done" | "error";

/**
 * Student-first AI path: topic → outline → lessons → open the first lesson.
 * Reuses /api/courses and /api/builder; advanced editing stays in Course Studio.
 */
export function LearningPathWizard() {
  const router = useRouter();
  const { user } = useLearner();
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState("Beginner");
  const [language, setLanguage] = useState("English");
  const [goal, setGoal] = useState("Understand the core ideas and practise them.");
  const [minutes, setMinutes] = useState("45");
  const [step, setStep] = useState<Step>("form");
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [firstLessonId, setFirstLessonId] = useState<string | null>(null);

  if (!user) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-stone-900">
          Create a learning path with AI
        </h2>
        <p className="mt-2 text-sm text-stone-600">
          Sign in, enter a topic, and DevPath will draft a private mini-course you can
          start immediately.
        </p>
        <Link
          href="/login?next=/my-courses"
          className="mt-4 inline-flex rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-stone-700"
        >
          Sign in to continue
        </Link>
      </div>
    );
  }

  async function run() {
    const trimmed = topic.trim();
    if (!trimmed) {
      setError("Enter a topic to generate a learning path.");
      return;
    }
    setStep("working");
    setError(null);
    setStatus("Creating your private course…");

    try {
      const draft = newCourse();
      draft.title = trimmed;
      draft.domain = trimmed;
      draft.tagline = `A personal path for ${trimmed}`;
      draft.description = goal.trim() || draft.tagline;
      draft.level = level;
      draft.language = language;
      draft.objectives = goal
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 8);
      draft.estimatedMinutes = Math.max(10, Number.parseInt(minutes, 10) || 45);

      const created = await fetchJson<{
        id: string;
        revision: number;
        document: CourseDocument;
      }>("/api/courses", "POST", draft);
      setCourseId(created.id);

      const goals = {
        topic: trimmed,
        audience: "Self-paced learner",
        objectives: goal.trim() || `Learn the essentials of ${trimmed}`,
        difficulty: level,
        requirements: `Keep the course around ${minutes} minutes of study time.`,
        references: "",
        length: `${minutes} minutes`,
        language,
      };

      setStatus("Generating an outline…");
      const outline = outlineSchema.parse(
        await fetchJson("/api/builder", "POST", { action: "outline", goals }),
      );

      setStatus("Generating lessons and activities…");
      const lessons: CourseDocument["lessons"] = [];
      for (let index = 0; index < outline.lessons.length; index += 1) {
        setStatus(`Generating lesson ${index + 1}/${outline.lessons.length}…`);
        const lesson = await fetchJson<CourseDocument["lessons"][number]>(
          "/api/builder",
          "POST",
          { action: "lesson", goals, outline, index },
        );
        lessons.push(lesson);
      }

      const document: CourseDocument = {
        ...created.document,
        title: outline.title,
        domain: outline.domain,
        tagline: created.document.tagline || outline.title,
        description: created.document.description,
        level,
        language,
        objectives: goals.objectives.split("\n").filter(Boolean),
        lessons,
        estimatedMinutes: lessons.reduce((sum, lesson) => sum + lesson.minutes, 0) ||
          draft.estimatedMinutes,
      };

      setStatus("Saving your learning path…");
      await fetchJson("/api/courses", "PUT", {
        document,
        status: "draft",
        visibility: "private",
        revision: created.revision,
      });

      const first = lessons[0]?.id ?? null;
      setFirstLessonId(first);
      setStep("done");
      setStatus("Your learning path is ready.");
      if (first) {
        router.push(`/courses/${created.id}/${first}`);
        router.refresh();
      }
    } catch (err) {
      setStep("error");
      setError((err as Error).message);
    }
  }

  return (
    <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-stone-900">
        Create a learning path with AI
      </h2>
      <p className="mt-1 text-sm text-stone-600">
        Enter a topic. AI drafts the outline and lessons. You can refine later in Course
        Studio.
      </p>

      {step === "form" || step === "error" ? (
        <form
          className="mt-5 grid gap-4 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            void run();
          }}
        >
          <label className="sm:col-span-2 block text-sm">
            <span className="font-medium text-stone-800">Topic</span>
            <input
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="e.g. Workplace English Communication"
              className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2"
              required
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-stone-800">Level</span>
            <select
              value={level}
              onChange={(event) => setLevel(event.target.value)}
              className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2"
            >
              <option>Beginner</option>
              <option>Intermediate</option>
              <option>Advanced</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium text-stone-800">Language</span>
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2"
            >
              <option>English</option>
              <option>简体中文</option>
              <option>繁體中文</option>
            </select>
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="font-medium text-stone-800">Goals</span>
            <textarea
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
              rows={3}
              className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-stone-800">Available study time (minutes)</span>
            <input
              type="number"
              min={15}
              max={300}
              value={minutes}
              onChange={(event) => setMinutes(event.target.value)}
              className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2"
            />
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              className="rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Generate and start
            </button>
          </div>
          {error && (
            <p className="sm:col-span-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {error}
            </p>
          )}
        </form>
      ) : null}

      {step === "working" && (
        <p className="mt-5 rounded-xl border border-indigo-100 bg-white px-4 py-3 text-sm text-indigo-900">
          {status}
        </p>
      )}

      {step === "done" && courseId && (
        <div className="mt-5 space-y-3 text-sm text-stone-700">
          <p>{status}</p>
          <div className="flex flex-wrap gap-2">
            {firstLessonId && (
              <Link
                href={`/courses/${courseId}/${firstLessonId}`}
                className="rounded-full bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700"
              >
                Start learning
              </Link>
            )}
            <Link
              href={`/courses/${courseId}`}
              className="rounded-full border border-stone-300 px-4 py-2 font-medium text-stone-700 hover:bg-stone-50"
            >
              Open course
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

async function fetchJson<T>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof payload.error === "string" ? payload.error : "Request failed.",
    );
  }
  return payload as T;
}
