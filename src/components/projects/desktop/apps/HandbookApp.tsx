"use client";

import { useState } from "react";
import type { ProjectView } from "@/lib/projects/runtime";

/** The ideas the job depends on, unlocked as the learner uncovers them. */
export function HandbookApp({ view }: { view: ProjectView }) {
  const { entries, total } = view.handbook;
  const [openId, setOpenId] = useState<string | null>(null);
  const open = entries.find((entry) => entry.id === openId) ?? entries[0] ?? null;
  const locked = total - entries.length;

  return (
    <div className="flex h-full min-h-0 text-[13px]">
      <nav className="w-48 shrink-0 overflow-y-auto border-r border-black/10 bg-teal-50/60 p-2">
        <p className="px-2 pb-1 pt-1 text-[11px] font-semibold text-stone-400">Concepts</p>
        {entries.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => setOpenId(entry.id)}
            className={`block w-full rounded-md px-2 py-1.5 text-left font-medium ${open?.id === entry.id ? "bg-teal-600 text-white" : "text-stone-800 hover:bg-black/5"}`}
          >
            {entry.name}
          </button>
        ))}
        {locked > 0 && (
          <p className="px-2 py-2 text-[12px] text-stone-500">
            {locked} more {locked === 1 ? "note unlocks" : "notes unlock"} as you find out what&apos;s really going on.
          </p>
        )}
      </nav>
      <article className="min-w-0 flex-1 overflow-y-auto bg-white p-5">
        {open ? (
          <div className="max-w-prose space-y-4">
            <h2 className="text-lg font-semibold text-stone-900">{open.name}</h2>
            <p className="text-[14px] leading-relaxed text-stone-800">{open.explanation}</p>
            <section className="rounded-xl border border-teal-200 bg-teal-50 p-3">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-teal-800">Think of it like this</p>
              <p className="mt-1 leading-relaxed text-stone-800">{open.bridge}</p>
            </section>
            <section className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-amber-800">A common mistake</p>
              <p className="mt-1 leading-relaxed text-stone-800">{open.misconception}</p>
            </section>
            <section>
              <p className="text-[12px] font-semibold uppercase tracking-wide text-stone-500">In this job</p>
              <p className="mt-1 leading-relaxed text-stone-700">{open.inTheJob}</p>
            </section>
          </div>
        ) : (
          <p className="grid h-full place-items-center text-center text-stone-400">
            Nothing here yet. Notes appear as you find out what the job really involves.
          </p>
        )}
      </article>
    </div>
  );
}
