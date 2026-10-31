"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Ticks a built-in project on or off for the class; saved at once. */
export function AssignProjects({ classId, projects, assigned }: { classId: string; projects: { id: string; title: string }[]; assigned: string[] }) {
  const router = useRouter();
  const [chosen, setChosen] = useState(assigned);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function toggle(id: string) {
    const next = chosen.includes(id) ? chosen.filter((item) => item !== id) : [...chosen, id];
    setBusy(true);
    setError("");
    const res = await fetch(`/api/classes/${classId}/projects`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ projects: next }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not save. Please try again.");
      return;
    }
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
                disabled={busy}
                onClick={() => void toggle(project.id)}
                className={`rounded-full border px-4 py-2 text-sm ${on ? "border-cyan-300 bg-cyan-300/10 text-white" : "border-white/15 text-white/70 hover:border-white/40"} disabled:opacity-60`}
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
