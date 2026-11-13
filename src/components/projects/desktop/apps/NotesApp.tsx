"use client";

import { useState } from "react";
import type { ProjectView } from "@/lib/projects/runtime";
import { firstName, type Send } from "../config";

/** Notes: the call notes (facts) and the click-first requirements spec builder. */
export function NotesApp({ view, busy, send }: { view: ProjectView; busy: boolean; send: Send }) {
  const writing = view.stage.id === "requirements" && view.status === "active";
  const client = firstName(view.scenario.client.name);
  const slots = view.requirementsComposer ?? [];
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [manualMode, setManualMode] = useState(false);
  const [manualText, setManualText] = useState("");
  const [doc, setDoc] = useState<"requirements" | "call">("requirements");

  const assembled = slots
    .map((slot) => {
      const chosenId = picks[slot.id];
      return slot.options.find((opt) => opt.id === chosenId)?.text ?? "";
    })
    .filter(Boolean)
    .join(" ");

  const allSlotsPicked = slots.length > 0 && slots.every((slot) => Boolean(picks[slot.id]));
  const finalSpec = manualMode || slots.length === 0 ? manualText : assembled;
  const canSubmit = manualMode || slots.length === 0 ? Boolean(manualText.trim()) : allSlotsPicked;

  return (
    <div className="flex h-full min-h-0 text-[13px]">
      <nav className="w-44 shrink-0 border-r border-black/10 bg-[#f6f3e8] p-2 max-sm:hidden">
        <p className="px-2 pb-1 pt-1 text-[11px] font-semibold text-stone-400">{view.scenario.client.organisation}</p>
        {[
          { id: "requirements" as const, label: "Requirements", meta: view.requirements ? "Saved" : writing ? "Building" : "Empty" },
          { id: "call" as const, label: "Call notes", meta: `${view.notes.length} facts` },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setDoc(item.id)}
            className={`block w-full rounded-md px-2 py-1.5 text-left ${doc === item.id ? "bg-amber-200/70" : "hover:bg-black/5"}`}
          >
            <span className="block font-medium text-stone-800">{item.label}</span>
            <span className="block text-[11px] text-stone-500">{item.meta}</span>
          </button>
        ))}
      </nav>

      <div className="min-w-0 flex-1 overflow-y-auto bg-[#fffdf6] p-5">
        <div className="mb-3 flex gap-2 sm:hidden">
          {(["requirements", "call"] as const).map((id) => (
            <button key={id} type="button" onClick={() => setDoc(id)} className={`rounded-full px-3 py-1 ${doc === id ? "bg-amber-200" : "bg-black/5"}`}>
              {id === "requirements" ? "Requirements" : `Call notes (${view.notes.length})`}
            </button>
          ))}
        </div>

        {doc === "call" ? (
          <>
            <h2 className="text-xl font-bold text-stone-900">Call notes</h2>
            {view.notes.length ? (
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[14px] text-stone-800">
                {view.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-stone-500">Nothing yet. Facts from your call with {client} land here.</p>
            )}
          </>
        ) : view.requirements ? (
          <>
            <h2 className="text-xl font-bold text-stone-900">Requirements</h2>
            <p className="mt-1 text-stone-500">Shared with the team.</p>
            <p className="mt-4 whitespace-pre-line text-[14px] leading-relaxed text-stone-800">{view.requirements.text}</p>
          </>
        ) : writing ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!canSubmit) return;
              void send({ op: "requirements", text: finalSpec });
            }}
            className="space-y-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-xl font-bold text-stone-900">Requirements builder</h2>
                <p className="mt-0.5 text-stone-600">
                  Select one clause in each section based on what {client} told you on the call (check <button type="button" onClick={() => setDoc("call")} className="font-medium text-amber-800 underline">Call notes</button> anytime).
                </p>
              </div>
              {slots.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (!manualMode && !manualText.trim() && assembled) setManualText(assembled);
                    setManualMode((v) => !v);
                  }}
                  className="rounded-full border border-stone-300 bg-white px-3 py-1 text-[11px] font-medium text-stone-600 hover:border-stone-400"
                >
                  {manualMode ? "← Use click-to-build cards" : "Edit text manually"}
                </button>
              )}
            </div>

            {!manualMode && slots.length > 0 ? (
              <div className="space-y-3.5">
                {slots.map((slot) => {
                  const selectedId = picks[slot.id];
                  return (
                    <div key={slot.id} className="rounded-xl border border-stone-200/90 bg-white p-3.5 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold text-stone-900">{slot.title}</p>
                          <p className="text-[12px] text-stone-500">{slot.hint}</p>
                        </div>
                        {slot.unlocked && (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                            ✓ Uncovered on call
                          </span>
                        )}
                      </div>
                      <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                        {slot.options.map((opt) => {
                          const active = selectedId === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setPicks((prev) => ({ ...prev, [slot.id]: opt.id }))}
                              aria-pressed={active}
                              className={`rounded-lg border p-3 text-left text-[13px] leading-snug transition ${
                                active
                                  ? "border-amber-500 bg-amber-50/90 text-stone-900 ring-1 ring-amber-400"
                                  : "border-stone-200 bg-stone-50/50 text-stone-700 hover:border-amber-300 hover:bg-amber-50/30"
                              }`}
                            >
                              {opt.text}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {assembled && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-800">
                      Assembled specification ({Object.keys(picks).length}/{slots.length} sections selected)
                    </p>
                    <p className="mt-1 text-[13px] leading-relaxed text-stone-800">{assembled}</p>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label htmlFor="requirements-note" className="sr-only">Requirements</label>
                <textarea
                  id="requirements-note"
                  value={manualText}
                  onChange={(event) => setManualText(event.target.value)}
                  rows={8}
                  maxLength={3000}
                  placeholder="Write or refine your requirements note…"
                  className="w-full resize-y rounded-lg border border-black/15 bg-white p-3 text-[14px] leading-relaxed text-stone-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                />
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <span className="text-[12px] text-stone-500">
                {!manualMode && slots.length > 0 && !allSlotsPicked
                  ? `Pick 1 option in each section (${Object.keys(picks).length}/${slots.length} chosen)`
                  : "Ready to share with the team."}
              </span>
              <button
                type="submit"
                disabled={busy || !canSubmit}
                className="rounded-md bg-amber-500 px-4 py-2 font-medium text-white shadow-sm hover:bg-amber-600 disabled:opacity-40"
              >
                {busy ? "Sharing…" : "Share with the team"}
              </button>
            </div>
          </form>
        ) : (
          <p className="text-stone-500">You&apos;ll assemble the requirements after the call with {client}.</p>
        )}
      </div>
    </div>
  );
}
