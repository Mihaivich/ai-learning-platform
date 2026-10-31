"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

/** Ticks a built-in project on or off for the class. It shows at once and saves behind; only the latest save counts. */
export function AssignProjects({ classId, projects, assigned }: { classId: string; projects: { id: string; title: string }[]; assigned: string[] }) {
  const router = useRouter();
  const [chosen, setChosen] = useState(assigned);
  const [error, setError] = useState("");
  const latest = useRef(assigned);
  const saves = useRef(0);

  async function toggle(id: string) {
    const next = latest.current.includes(id) ? latest.current.filter((item) => item !== id) : [...latest.current, id];
    latest.current = next;
    setChosen(next);
    setError("");
    const save = ++saves.current;
    const res = await fetch(`/api/classes/${classId}/projects`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ projects: next }) });
    const data = await res.json().catch(() => ({}));
    if (save !== saves.current) return;
    if (!res.ok) {
      setError(data.error ?? "Could not save. Please try again.");
      return;
    }
    latest.current = data.projects;
    setChosen(data.projects);
    router.refresh();
  }

  return (
    <div>
      <ul className="flex flex-wrap gap-2">
        {projects.map((project) => {
          const on = chosen.includes(project.id);
          return (
            <li key={project.id}>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                onClick={() => void toggle(project.id)}
                className={`rounded-full border px-4 py-2 text-sm ${on ? "border-cyan-300 bg-cyan-300/10 text-white" : "border-white/15 text-white/70 hover:border-white/40"}`}
              >
                {on ? "✓ " : ""}
                {project.title}
              </button>
            </li>
          );
        })}
      </ul>
      {error && <p className="mt-3 text-sm text-rose-200">{error}</p>}
    </div>
  );
}
