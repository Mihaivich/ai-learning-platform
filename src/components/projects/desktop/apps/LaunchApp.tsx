"use client";

import { useState } from "react";
import type { ProjectView } from "@/lib/projects/runtime";
import { Avatar } from "../icons";
import { CAST_TONE, firstName, initials, type Send } from "../config";

const RATING_BADGE: Record<string, string> = {
  strong: "bg-emerald-100 text-emerald-800 border-emerald-200",
  mixed: "bg-amber-100 text-amber-900 border-amber-200",
  weak: "bg-rose-100 text-rose-800 border-rose-200",
};

export function LaunchApp({ view, busy, send, onReport }: { view: ProjectView; busy: boolean; send: Send; onReport: () => void }) {
  const deciding = view.stage.id === "release" && view.status === "active";
  const chosen = view.history.find((event) => event.stageId === "release");
  const [selectedCard, setSelectedCard] = useState("");
  const [customMode, setCustomMode] = useState(false);
  const [vivaDraft, setVivaDraft] = useState("");
  const client = view.scenario.client;
  const viva = view.viva;

  const options = viva?.options ?? [];
  const activeVivaAnswer = customMode || options.length === 0 ? vivaDraft : selectedCard;

  return (
    <div className="h-full space-y-5 overflow-y-auto bg-gradient-to-b from-orange-50 to-white p-5 text-[13px]">
      <div>
        <h2 className="text-lg font-semibold text-stone-900">Release plan</h2>
        <p className="mt-1 text-stone-600">
          How does {view.scenario.words.deliverable} reach {client.organisation}?
        </p>
      </div>

      {viva && (deciding || viva.response) && (
        <div className="rounded-xl border border-orange-200/90 bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <Avatar initials={initials(client.name)} tone={CAST_TONE.client} size={36} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-stone-900">
                  {firstName(client.name)}&apos;s sign-off check <span className="font-normal text-stone-500">· Live Viva</span>
                </p>
                <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-medium text-orange-800">
                  {viva.response ? "Answered" : "1-click defense · +1 trust if strong"}
                </span>
              </div>
              <p className="mt-1.5 leading-relaxed text-stone-700">&ldquo;{viva.question}&rdquo;</p>
            </div>
          </div>

          {viva.response ? (
            <div className="mt-3 space-y-2 border-t border-black/5 pt-3">
              <p className="italic text-stone-700">&ldquo;{viva.response.text}&rdquo;</p>
              <div className={`rounded-lg border px-3 py-2 ${RATING_BADGE[viva.response.rating] ?? RATING_BADGE.mixed}`}>
                <span className="font-semibold uppercase text-[11px]">{viva.response.rating}</span> · {viva.response.feedback}
                {viva.response.trustDelta > 0 && <span className="ml-1 font-semibold">(+{viva.response.trustDelta} trust)</span>}
              </div>
            </div>
          ) : (
            <form
              className="mt-3 space-y-2.5 border-t border-black/5 pt-3"
              onSubmit={async (event) => {
                event.preventDefault();
                if (!activeVivaAnswer.trim()) return;
                if (await send({ op: "viva", text: activeVivaAnswer })) {
                  setSelectedCard("");
                  setVivaDraft("");
                }
              }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[12px] font-medium text-stone-700">
                  Pick your spoken response to {firstName(client.name)}:
                </span>
                {options.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCustomMode((v) => !v)}
                    className="text-[11px] text-stone-500 underline-offset-2 hover:text-stone-800 hover:underline"
                  >
                    {customMode ? "← Pick from response cards" : "Or answer in your own words"}
                  </button>
                )}
              </div>

              {!customMode && options.length > 0 ? (
                <div className="grid gap-2">
                  {options.map((opt) => {
                    const active = selectedCard === opt.text;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSelectedCard(opt.text)}
                        aria-pressed={active}
                        className={`rounded-lg border p-3 text-left text-[12.5px] leading-snug transition ${
                          active
                            ? "border-orange-500 bg-orange-50/90 text-stone-900 ring-1 ring-orange-400"
                            : "border-stone-200 bg-stone-50/60 text-stone-700 hover:border-orange-300 hover:bg-orange-50/40"
                        }`}
                      >
                        &ldquo;{opt.text}&rdquo;
                      </button>
                    );
                  })}
                </div>
              ) : (
                <>
                  <label htmlFor="viva-answer" className="sr-only">
                    Your answer to {client.name}
                  </label>
                  <textarea
                    id="viva-answer"
                    value={vivaDraft}
                    onChange={(event) => setVivaDraft(event.target.value)}
                    rows={3}
                    maxLength={1000}
                    placeholder={`Explain the main trap to watch for and how you'll verify ${view.scenario.words.deliverable} worked…`}
                    className="w-full resize-none rounded-lg border border-black/15 px-3 py-2 text-stone-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                  />
                </>
              )}

              <div className="flex items-center justify-between gap-2 pt-0.5">
                <span className="text-[12px] text-stone-500">
                  {activeVivaAnswer.trim() ? `Ready to answer ${firstName(client.name)}.` : "Select a response card above, or skip straight to rollout below."}
                </span>
                <button
                  type="submit"
                  disabled={busy || activeVivaAnswer.trim().length < 10}
                  className="shrink-0 rounded-md bg-stone-900 px-3.5 py-1.5 font-medium text-white hover:bg-stone-800 disabled:opacity-40"
                >
                  Answer {firstName(client.name)}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {deciding ? (
        <div className="grid gap-2">
          {view.actions.map((action) => (
            <button
              key={action.id}
              type="button"
              disabled={busy}
              onClick={() => void send({ op: "choose", actionId: action.id })}
              className="rounded-xl border border-black/10 bg-white px-4 py-3 text-left font-medium text-stone-800 shadow-sm hover:border-orange-400 disabled:opacity-50"
            >
              {action.label}
            </button>
          ))}
          <p className="mt-1 text-stone-500">Options depend on the target you set earlier. There&apos;s no undo.</p>
        </div>
      ) : chosen ? (
        <div className="space-y-3">
          <p className="rounded-xl border border-black/10 bg-white p-3 text-stone-800">
            You chose: <span className="font-medium">{chosen.actionLabel}</span>
          </p>
          {view.completion && (
            <button type="button" onClick={onReport} className="rounded-md bg-orange-500 px-3 py-1.5 font-medium text-white">
              Open the project report
            </button>
          )}
        </div>
      ) : (
        <p className="text-stone-500">Nothing to release yet.</p>
      )}
    </div>
  );
}
