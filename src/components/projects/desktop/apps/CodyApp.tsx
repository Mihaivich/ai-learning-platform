"use client";

import { useState } from "react";
import type { ProjectView } from "@/lib/projects/runtime";
import { Avatar } from "../icons";
import { reviewRepo, type Send } from "../config";

/** The AI assistant (Cody in Harbour Clinic): the learner writes its task here. */
export function CodyApp({ view, busy, send, onOpenReview }: { view: ProjectView; busy: boolean; send: Send; onOpenReview: () => void }) {
  const writing = view.stage.id === "brief" && view.status === "active";
  const [text, setText] = useState("");
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [manual, setManual] = useState(false);
  const engineering = view.track === "engineering";
  const agent = view.scenario.assistant.name;

  const slots = view.briefComposer;
  const composed = slots
    .map((slot) => slot.options.find((opt) => opt.id === selected[slot.id])?.text)
    .filter(Boolean)
    .join(" ");
  const activeText = manual ? text : composed;
  const allPicked = slots.length > 0 && slots.every((slot) => Boolean(selected[slot.id]));

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#14121c] font-mono text-[13px] text-violet-100">
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3 font-sans">
        <Avatar initials="C" tone="from-violet-500 to-fuchsia-500" size={32} />
        <div>
          <p className="font-semibold text-white">{agent}</p>
          <p className="text-[12px] text-violet-300/70">Autonomous coding agent · builds exactly what the task says</p>
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <p className="text-violet-300/80">
          <span className="text-fuchsia-400">{agent.toLowerCase()}</span> ready. Waiting for a task for <span className="text-white">{reviewRepo(view)}</span>.
        </p>
        {view.brief && (
          <>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <p className="mb-1 text-[11px] uppercase tracking-wide text-violet-300/60">Your task</p>
              <p className="whitespace-pre-line font-sans text-[13px] text-white">{view.brief.text}</p>
            </div>
            <div className="space-y-1 text-violet-200/80">
              <p>▸ reading task… done</p>
              <p>▸ planning changes… done</p>
              <p>▸ writing code and migrations… done</p>
              <p className="text-emerald-300">✓ {engineering ? "opened a pull request" : "recorded a walkthrough"}: {view.work?.prTitle ?? view.scenario.words.deliverable}</p>
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
          <p className="text-violet-300/60">You&apos;ll brief {agent} once the requirements are written.</p>
        )}
      </div>
      {writing && (
        <form
          className="max-h-[55%] overflow-y-auto border-t border-white/10 p-3 font-sans"
          onSubmit={(event) => {
            event.preventDefault();
            void send({ op: "brief", text: activeText });
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label htmlFor="cody-task" className="text-[12px] font-medium text-violet-200">Task for {agent}</label>
            <div className="inline-flex rounded-md border border-white/15 bg-white/5 p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setManual(false)}
                className={`rounded px-2 py-0.5 font-medium ${!manual ? "bg-violet-600 text-white" : "text-violet-200"}`}
              >
                Build from cards
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!text.trim() && composed) setText(composed);
                  setManual(true);
                }}
                className={`rounded px-2 py-0.5 font-medium ${manual ? "bg-violet-600 text-white" : "text-violet-200"}`}
              >
                Write / edit custom prompt
              </button>
            </div>
          </div>
          {manual ? (
            <textarea
              id="cody-task"
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={6}
              maxLength={3000}
              placeholder={
                engineering
                  ? `Describe the task, the constraints ${agent} must respect, what's out of scope and how you'll check the result.`
                  : `Describe what ${agent} should make, what it must never do, and what's out of scope.`
              }
              className="mt-1.5 w-full resize-y rounded-lg border border-white/15 bg-white/5 p-3 text-[13px] text-white placeholder:text-violet-300/40 outline-none focus:border-fuchsia-400"
            />
          ) : (
            <div className="mt-2 space-y-2.5">
              {slots.map((slot) => (
                <fieldset key={slot.id} className="rounded-lg border border-white/10 bg-white/5 p-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <legend className="text-[12px] font-medium text-violet-100">{slot.prompt}</legend>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        slot.unlocked ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-200"
                      }`}
                    >
                      {slot.unlocked ? "Backed by call notes" : "Unverified assumption — not discussed on call"}
                    </span>
                  </div>
                  <div className="mt-1.5 grid gap-1.5">
                    {slot.options.map((opt) => {
                      const isPicked = selected[slot.id] === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setSelected((prev) => ({ ...prev, [slot.id]: opt.id }))}
                          aria-pressed={isPicked}
                          className={`rounded-md border px-2.5 py-1.5 text-left text-[12px] transition ${
                            isPicked
                              ? "border-fuchsia-400 bg-fuchsia-500/20 text-white"
                              : "border-white/10 bg-black/20 text-violet-100/85 hover:border-violet-400/60"
                          }`}
                        >
                          {opt.text}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
              {composed && (
                <div className="rounded-md border border-white/10 bg-black/30 p-2 text-[12px] text-violet-100">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] uppercase tracking-wide text-violet-300/70">Composed prompt</span>
                    <button
                      type="button"
                      onClick={() => {
                        setText(composed);
                        setManual(true);
                      }}
                      className="text-[11px] font-medium text-fuchsia-300 hover:underline"
                    >
                      Edit wording manually
                    </button>
                  </div>
                  <p className="mt-1 leading-relaxed">{composed}</p>
                </div>
              )}
            </div>
          )}
          <div className="mt-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={busy || !activeText.trim() || (!manual && !allPicked)}
              className="rounded-md bg-fuchsia-600 px-4 py-1.5 font-medium text-white disabled:opacity-40"
            >
              {busy ? `${agent} is working…` : "Run task"}
            </button>
            <span className="tabular-nums text-violet-300/60">{activeText.length} / 3000</span>
          </div>
        </form>
      )}
    </div>
  );
}
