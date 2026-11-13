"use client";

import { useState } from "react";
import type { ProjectView } from "@/lib/projects/runtime";
import type { CodeFile } from "@/lib/projects/types";
import { Avatar } from "../icons";
import { initials, reviewRepo, type Send } from "../config";

function FileViewer({
  file,
  picked,
  disabled,
  onPick,
}: {
  file: CodeFile;
  picked: { path: string; line: number } | null;
  disabled: boolean;
  onPick: (choice: { path: string; line: number } | null) => void;
}) {
  const kind = file.kind ?? "code";

  if (kind === "table") {
    const headers = file.columns ?? [];
    return (
      <div className="overflow-hidden rounded-lg border border-black/10 bg-white">
        <div className="flex items-center justify-between border-b border-black/10 bg-stone-50 px-3 py-1.5">
          <span className="font-mono text-[12px] font-medium text-stone-700">{file.path}</span>
          <span className="text-[11px] text-stone-500">Click any flawed row to flag</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-[12.5px]">
            {headers.length > 0 && (
              <thead>
                <tr className="border-b border-black/10 bg-stone-100/80 text-[11px] uppercase tracking-wide text-stone-500">
                  <th className="w-10 px-2.5 py-2 text-right font-semibold">#</th>
                  {headers.map((col, idx) => (
                    <th key={idx} className="px-3 py-2 font-semibold text-stone-700">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody className="divide-y divide-black/5">
              {file.lines.map((row, index) => {
                const line = index + 1;
                const selected = picked?.path === file.path && picked.line === line;
                const cells = row.split("|").map((cell) => cell.trim());
                return (
                  <tr
                    key={line}
                    onClick={() => !disabled && onPick(selected ? null : { path: file.path, line })}
                    className={`transition-colors ${
                      selected
                        ? "bg-amber-200/90"
                        : disabled
                          ? "bg-white"
                          : "cursor-pointer bg-white hover:bg-blue-50/80"
                    }`}
                  >
                    <td className="w-10 select-none border-r border-black/5 px-2.5 py-2 text-right font-mono text-[11px] text-stone-400">
                      {line}
                    </td>
                    {cells.map((cell, cIdx) => (
                      <td key={cIdx} className="px-3 py-2 text-stone-800">
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={(event) => {
                            event.stopPropagation();
                            onPick(selected ? null : { path: file.path, line });
                          }}
                          aria-pressed={selected}
                          className="w-full text-left disabled:cursor-default"
                        >
                          {cell}
                        </button>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (kind === "document") {
    return (
      <div className="overflow-hidden rounded-lg border border-black/10 bg-stone-50/40">
        <div className="flex items-center justify-between border-b border-black/10 bg-stone-50 px-3 py-1.5">
          <span className="font-mono text-[12px] font-medium text-stone-700">{file.path}</span>
          <span className="text-[11px] text-stone-500">Click any flawed clause to redline</span>
        </div>
        <div className="divide-y divide-black/10 bg-white">
          {file.lines.map((clause, index) => {
            const line = index + 1;
            const selected = picked?.path === file.path && picked.line === line;
            return (
              <button
                key={line}
                type="button"
                disabled={disabled}
                onClick={() => onPick(selected ? null : { path: file.path, line })}
                aria-pressed={selected}
                className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${
                  selected ? "bg-amber-100 ring-1 ring-inset ring-amber-400" : "hover:bg-blue-50/70"
                } disabled:cursor-default`}
              >
                <span
                  className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold ${
                    selected ? "bg-amber-600 text-white" : "bg-stone-100 text-stone-500"
                  }`}
                >
                  §{line}
                </span>
                <span className="leading-relaxed text-stone-800">{clause}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (kind === "steps") {
    return (
      <div className="overflow-hidden rounded-lg border border-black/10 bg-white">
        <div className="flex items-center justify-between border-b border-black/10 bg-stone-50 px-3 py-1.5">
          <span className="font-mono text-[12px] font-medium text-stone-700">{file.path}</span>
          <span className="text-[11px] text-stone-500">Click any flawed step to flag</span>
        </div>
        <ol className="space-y-2 p-3">
          {file.lines.map((step, index) => {
            const line = index + 1;
            const selected = picked?.path === file.path && picked.line === line;
            return (
              <li key={line}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onPick(selected ? null : { path: file.path, line })}
                  aria-pressed={selected}
                  className={`flex w-full items-start gap-3 rounded-lg border px-3.5 py-2.5 text-left transition-colors ${
                    selected
                      ? "border-amber-500 bg-amber-100/90 shadow-sm"
                      : "border-black/10 bg-stone-50/50 hover:border-blue-400 hover:bg-blue-50/60"
                  } disabled:cursor-default`}
                >
                  <span
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full font-mono text-[11px] font-bold ${
                      selected ? "bg-amber-600 text-white" : "bg-stone-200 text-stone-700"
                    }`}
                  >
                    {line}
                  </span>
                  <span className="pt-0.5 leading-relaxed text-stone-800">{step}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-black/10">
      <p className="border-b border-black/10 bg-stone-50 px-3 py-1.5 font-mono text-[12px] text-stone-700">{file.path}</p>
      <div className="overflow-x-auto font-mono text-[12.5px] leading-6">
        {file.lines.map((text, index) => {
          const line = index + 1;
          const selected = picked?.path === file.path && picked.line === line;
          return (
            <button
              key={line}
              type="button"
              disabled={disabled}
              onClick={() => onPick(selected ? null : { path: file.path, line })}
              aria-pressed={selected}
              className={`flex w-full min-w-max text-left ${selected ? "bg-amber-200" : "bg-emerald-50/60 hover:bg-blue-50"} disabled:cursor-default`}
            >
              <span className="w-10 shrink-0 select-none border-r border-black/5 pr-2 text-right text-stone-400">{line}</span>
              <span className="w-5 shrink-0 select-none text-center text-emerald-600">+</span>
              <span className="whitespace-pre pr-4 text-stone-800">{text || " "}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function pickedActionLabel(kind: ProjectView["scenario"]["artifactKind"], picked: { path: string; line: number } | null): string {
  if (!picked) {
    if (kind === "table") return "Click a row to flag an issue";
    if (kind === "document") return "Click a clause to flag an issue";
    if (kind === "steps") return "Click a step to flag an issue";
    return "Click a line to request changes";
  }
  const short = picked.path.split("/").pop();
  if (kind === "table") return `Send back row ${picked.line} of ${short}`;
  if (kind === "document") return `Send back §${picked.line} of ${short}`;
  if (kind === "steps") return `Send back step ${picked.line} of ${short}`;
  return `Request changes on ${short}:${picked.line}`;
}

export function ReviewApp({ view, busy, send }: { view: ProjectView; busy: boolean; send: Send }) {
  const work = view.work;
  const reviewing = view.stage.id === "review" && view.status === "active";
  const [picked, setPicked] = useState<{ path: string; line: number } | null>(null);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [customNoteMode, setCustomNoteMode] = useState(false);
  const engineering = view.track === "engineering";
  const artifactKind = view.scenario.artifactKind;
  const isCodePr = engineering && (!artifactKind || artifactKind === "code");
  const agent = view.scenario.assistant.name;
  const approve = view.actions.find((action) => action.id === "approve");
  // Where the job teaches concepts, a change request explains itself, as a real one would.
  const needsNote = view.conceptCount > 0;
  const hasTarget = engineering ? Boolean(picked) : Boolean(reason);
  const ready = hasTarget && (!needsNote || note.trim().length >= 15);

  if (!work) {
    return <p className="grid h-full place-items-center p-6 text-[13px] text-stone-400">Nothing to review yet. {agent}&apos;s work appears here.</p>;
  }

  const failing = work.checks.some((check) => !check.passed);
  const settled = !reviewing;
  // Every version has at most one problem, so once it's fixed the only thing left is to approve.
  const fixed = work.reviews.some((review) => review.correct);

  return (
    <div className="h-full overflow-y-auto bg-white text-[13px]">
      <div className="border-b border-black/10 px-5 py-4">
        <p className="text-stone-500">{reviewRepo(view).replace("/", " / ")}</p>
        <h2 className="mt-1 text-lg font-semibold text-stone-900">
          {work.prTitle} {isCodePr && <span className="font-normal text-stone-400">#12</span>}
        </h2>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-medium text-white ${settled ? "bg-violet-600" : "bg-emerald-600"}`}>
            {isCodePr ? (settled ? "Merged" : "Open") : settled ? "Approved" : "Ready for review"}
          </span>
          {isCodePr ? (
            <span className="text-stone-500">
              {agent} wants to merge into <code className="rounded bg-blue-50 px-1 text-blue-700">main</code>
            </span>
          ) : (
            <span className="text-stone-500">
              {agent} submitted {view.scenario.words.deliverable} for sign-off
            </span>
          )}
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div className="flex gap-3">
          <Avatar initials={initials(agent)} tone="from-violet-500 to-fuchsia-500" size={32} />
          <div className="min-w-0 flex-1 rounded-lg border border-black/10">
            <p className="border-b border-black/10 bg-stone-50 px-3 py-1.5 text-stone-500">
              <span className="font-semibold text-stone-800">{agent}</span> {isCodePr ? "commented" : "summary"}
            </p>
            <p className="p-3 text-stone-800">{work.prSummary}</p>
          </div>
        </div>

        {engineering && work.checks.length > 0 && (
          <div className={`rounded-lg border p-3 ${failing ? "border-rose-200 bg-rose-50" : "border-emerald-200 bg-emerald-50"}`}>
            <p className="font-semibold text-stone-900">{failing ? "Some checks flagged an issue" : "All verification checks passed"}</p>
            <ul className="mt-1 space-y-0.5">
              {work.checks.map((check) => (
                <li key={check.name} className={check.passed ? "text-emerald-700" : "text-rose-700"}>
                  {check.passed ? "✓" : "✗"} <span className="font-mono">{check.name}</span>: {check.detail}
                </li>
              ))}
            </ul>
          </div>
        )}

        {engineering ? (
          <div className="space-y-4">
            <p className="font-semibold text-stone-900">
              {isCodePr ? "Files changed" : "Deliverable contents"}{" "}
              <span className="font-normal text-stone-400">{work.files.length}</span>
            </p>
            {work.files.map((file) => (
              <FileViewer key={file.path} file={file} picked={picked} disabled={!reviewing || fixed} onPick={setPicked} />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="font-semibold text-stone-900">Walkthrough</p>
            {work.demo.map((step, index) => (
              <div key={index} className="rounded-lg border border-black/10 p-3">
                <p className="font-medium text-stone-900">
                  {index + 1}. {step.action}
                </p>
                <p className="mt-1 text-stone-700">→ {step.result}</p>
              </div>
            ))}
          </div>
        )}

        {work.reviews.length > 0 && (
          <div className="rounded-lg border border-black/10 p-3">
            <p className="font-semibold text-stone-900">Your change requests</p>
            <ul className="mt-1 space-y-0.5 text-stone-700">
              {work.reviews.map((review, index) => (
                <li key={index}>
                  {review.label}: {review.correct ? `${agent} fixed it and updated the work.` : `${agent} found nothing to change.`}
                  {review.explained && (
                    <p className={`mt-1 rounded-md px-2.5 py-1.5 ${review.explained.rating === "strong" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
                      {review.explained.feedback}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {reviewing && (
          <div className="sticky bottom-0 -mx-5 border-t border-black/10 bg-white/95 px-5 py-3 backdrop-blur">
            {fixed && <p className="mb-3 text-stone-700">{agent} has fixed what you found. Check the new version, then approve it.</p>}
            {!engineering && !fixed && (
              <fieldset className="mb-3">
                <legend className="font-medium text-stone-900">If you send it back, why?</legend>
                <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                  {work.reasons.map((item) => (
                    <label key={item.id} className={`flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 ${reason === item.id ? "border-blue-500 bg-blue-50" : "border-black/10"}`}>
                      <input type="radio" name="review-reason" value={item.id} checked={reason === item.id} onChange={() => setReason(item.id)} />
                      {item.label}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            {needsNote && !fixed && hasTarget && (
              <div className="mb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-medium text-stone-900">Your diagnosis note for {agent}</span>
                    <span className="ml-1.5 text-[12px] text-stone-500">Pick what goes wrong &amp; why:</span>
                  </div>
                  {work.noteOptions.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setCustomNoteMode((v) => !v)}
                      className="text-[11px] text-stone-500 underline-offset-2 hover:text-stone-800 hover:underline"
                    >
                      {customNoteMode ? "← Pick from diagnosis cards" : "Write custom note"}
                    </button>
                  )}
                </div>

                {!customNoteMode && work.noteOptions.length > 0 ? (
                  <div className="mt-1.5 grid max-h-36 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
                    {work.noteOptions.map((opt) => {
                      const active = note === opt.text;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setNote(opt.text)}
                          aria-pressed={active}
                          className={`rounded-md border p-2 text-left text-[12px] leading-snug transition ${
                            active
                              ? "border-blue-500 bg-blue-50 text-stone-900 ring-1 ring-blue-400"
                              : "border-black/10 bg-stone-50/70 text-stone-700 hover:border-blue-300 hover:bg-blue-50/40"
                          }`}
                        >
                          {opt.text}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    maxLength={1000}
                    rows={2}
                    placeholder="This goes wrong when… because…"
                    className="mt-1.5 w-full resize-none rounded-md border border-black/15 px-2.5 py-1.5 text-stone-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                )}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              {!fixed && (
                <button
                  type="button"
                  disabled={busy || !ready}
                  onClick={async () => {
                    const explanation = needsNote ? note.trim() : undefined;
                    const ok = engineering
                      ? picked && (await send({ op: "request-changes", path: picked.path, line: picked.line, explanation }))
                      : await send({ op: "request-changes", reasonId: reason, explanation });
                    if (ok) {
                      setPicked(null);
                      setReason("");
                      setNote("");
                    }
                  }}
                  className="rounded-md border border-black/15 bg-white px-3 py-1.5 font-medium text-stone-800 shadow-sm disabled:opacity-40"
                >
                  {engineering ? pickedActionLabel(artifactKind, picked) : "Send it back"}
                </button>
              )}
              {approve && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void send({ op: "choose", actionId: approve.id })}
                  className="rounded-md bg-emerald-600 px-3 py-1.5 font-medium text-white shadow-sm disabled:opacity-40"
                >
                  {isCodePr ? "Approve and merge" : "Approve"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
