"use client";

import { useState } from "react";
import type { ProjectView } from "@/lib/projects/runtime";
import { Avatar } from "../icons";
import { initials, reviewRepo, type Send } from "../config";

/** The AI specialist: click-first directive builder (with optional manual prompt edit). */
export function CodyApp({ view, busy, send, onOpenReview }: { view: ProjectView; busy: boolean; send: Send; onOpenReview: () => void }) {
  const writing = (view.stage.id === "brief" || view.stage.id === "brief-test") && view.status === "active";
  const slots = view.briefComposer ?? [];
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [manualMode, setManualMode] = useState(false);
  const [manualText, setManualText] = useState("");

  const engineering = view.track === "engineering";
  const isCode = view.scenario.artifactKind === "code";
  const agent = view.scenario.assistant.name;
  const kind = view.scenario.assistant.kind;
  const steps =
    view.scenario.assistant.workSteps ??
    (isCode
      ? ["reading task", "planning changes", "writing code and migrations"]
      : ["reading your brief", `drafting ${view.scenario.words.deliverable}`, "running consistency checks"]);

  const deliveryLabel = engineering
    ? isCode
      ? "opened a pull request"
      : "prepared the deliverable for specialist review"
    : "recorded a walkthrough";

  const assembled = slots
    .map((slot) => {
      const chosenId = picks[slot.id];
      return slot.options.find((opt) => opt.id === chosenId)?.text ?? "";
    })
    .filter(Boolean)
    .join(" ");

  const allSlotsPicked = slots.length > 0 && slots.every((slot) => Boolean(picks[slot.id]));
  const finalBrief = manualMode || slots.length === 0 ? manualText : assembled;
  const canSubmit = manualMode || slots.length === 0 ? Boolean(manualText.trim()) : allSlotsPicked;

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#14121c] font-mono text-[13px] text-violet-100">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 font-sans">
        <div className="flex items-center gap-3">
          <Avatar initials={initials(agent)} tone="from-violet-500 to-fuchsia-500" size={32} />
          <div>
            <p className="font-semibold text-white">{agent}</p>
            <p className="text-[12px] text-violet-300/70">{kind} · follows your brief literally</p>
          </div>
        </div>
        {writing && slots.length > 0 && (
          <button
            type="button"
            onClick={() => {
              if (!manualMode && !manualText.trim() && assembled) setManualText(assembled);
              setManualMode((v) => !v);
            }}
            className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] text-violet-200 hover:border-white/35"
          >
            {manualMode ? "← Use directive cards" : "Write custom prompt"}
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <p className="text-violet-300/80">
          <span className="text-fuchsia-400">{agent.toLowerCase()}</span> ready. Target workspace:{" "}
          <span className="text-white">{reviewRepo(view)}</span>.
        </p>

        {writing && (
          <form
            id="cody-brief-form"
            className="space-y-3.5 font-sans"
            onSubmit={(event) => {
              event.preventDefault();
              if (!canSubmit) return;
              void send({ op: "brief", text: finalBrief });
            }}
          >
            {!manualMode && slots.length > 0 ? (
              <>
                <p className="text-[12px] text-violet-200/80">
                  Pick one instruction in each block below. Watch out for plausible shortcuts—{agent} builds whatever you select, flaws and all.
                </p>
                {slots.map((slot) => {
                  const selectedId = picks[slot.id];
                  return (
                    <div key={slot.id} className="rounded-xl border border-white/10 bg-white/[0.04] p-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold text-white">{slot.title}</p>
                          <p className="text-[12px] text-violet-300/70">{slot.hint}</p>
                        </div>
                        {slot.unlocked && (
                          <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                            ✓ Backed by call notes
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
                              className={`rounded-lg border p-3 text-left text-[12.5px] leading-snug transition ${
                                active
                                  ? "border-fuchsia-400 bg-fuchsia-500/20 text-white ring-1 ring-fuchsia-400"
                                  : "border-white/10 bg-black/25 text-violet-100/85 hover:border-violet-400/50 hover:bg-white/[0.07]"
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
                  <div className="rounded-xl border border-fuchsia-400/30 bg-fuchsia-500/10 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-fuchsia-300">
                      Assembled brief ({Object.keys(picks).length}/{slots.length} directives)
                    </p>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-violet-50">{assembled}</p>
                  </div>
                )}
              </>
            ) : (
              <div>
                <label htmlFor="cody-task" className="text-[12px] font-medium text-violet-200">
                  Custom brief for {agent}
                </label>
                <textarea
                  id="cody-task"
                  value={manualText}
                  onChange={(event) => setManualText(event.target.value)}
                  rows={6}
                  maxLength={3000}
                  placeholder={`Describe what ${agent} should produce, what must never happen, and what stays out of scope.`}
                  className="mt-1.5 w-full resize-y rounded-lg border border-white/15 bg-white/5 p-3 text-[13px] text-white placeholder:text-violet-300/40 outline-none focus:border-fuchsia-400"
                />
              </div>
            )}
          </form>
        )}

        {view.brief && (
          <>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <p className="mb-1 text-[11px] uppercase tracking-wide text-violet-300/60">Your brief</p>
              <p className="whitespace-pre-line font-sans text-[13px] text-white">{view.brief.text}</p>
            </div>
            <div className="space-y-1 text-violet-200/80">
              {steps.map((step, index) => (
                <p key={index}>▸ {step}… done</p>
              ))}
              <p className="text-emerald-300">
                ✓ {deliveryLabel}: {view.work?.prTitle ?? view.scenario.words.deliverable}
              </p>
            </div>
            {view.work && (
              <button type="button" onClick={onOpenReview} className="rounded-md bg-violet-600 px-3 py-1.5 font-sans font-medium text-white hover:bg-violet-500">
                Open in Review
              </button>
            )}
            {view.work && view.work.reviews.length > 0 && (
              <div className="space-y-1 text-violet-200/80">
                {view.work.reviews.map((review, index) => (
                  <p key={index}>
                    ▸ change request: {review.label} →{" "}
                    {review.correct ? <span className="text-emerald-300">fixed and updated</span> : <span className="text-amber-300">nothing to change for that reason</span>}
                  </p>
                ))}
              </div>
            )}
          </>
        )}

        {!view.brief && !writing && (
          <p className="text-violet-300/60">You&apos;ll brief {agent} once the requirements are saved.</p>
        )}
      </div>

      {writing && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-black/30 px-4 py-3 font-sans">
          <span className="text-[12px] text-violet-300/75">
            {!manualMode && slots.length > 0 && !allSlotsPicked
              ? `Select 1 directive per block (${Object.keys(picks).length}/${slots.length} chosen)`
              : `${agent} is ready to execute your brief.`}
          </span>
          <button
            type="submit"
            form="cody-brief-form"
            disabled={busy || !canSubmit}
            className="rounded-md bg-fuchsia-600 px-4 py-1.5 font-medium text-white hover:bg-fuchsia-500 disabled:opacity-40"
          >
            {busy ? `${agent} is working…` : "Run task"}
          </button>
        </div>
      )}
    </div>
  );
}
