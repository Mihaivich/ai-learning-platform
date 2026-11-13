"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/lib/auth-store";
import {
  FEEDBACK_KIND_LABELS,
  FEEDBACK_KINDS,
  type FeedbackKind,
  type FeedbackSurface,
} from "@/lib/feedback-shared";

const QUICK_REASONS: Record<FeedbackKind, string[]> = {
  content_error: [
    "Domain fact or concept explanation is inaccurate",
    "Analogy or misconception statement doesn't match the concept",
    "Deliverable entry contradicts the scenario rules",
  ],
  grading_issue: [
    "My answer covered the point but wasn't counted",
    "Review reason or Viva check felt unfair",
    "Directive card wording was ambiguous",
  ],
  unclear: [
    "Wording is confusing or hard to follow",
    "Typo or formatting glitch on this screen",
    "Not clear what to do next",
  ],
  diagram_broken: [
    "Diagram failed to render or looks blank",
    "Nodes or edge labels overlap / clip",
    "Diagram arrows contradict the concept text",
  ],
};

export function FeedbackTrigger({
  projectId,
  surface,
  targetId,
  targetLabel,
  defaultKind = "content_error",
  context,
  label = "Report issue",
  tone = "dark",
  compact = false,
}: {
  projectId: string;
  surface: FeedbackSurface;
  targetId?: string;
  targetLabel?: string;
  defaultKind?: FeedbackKind;
  context?: Record<string, unknown>;
  label?: string;
  tone?: "dark" | "light";
  compact?: boolean;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<FeedbackKind>(defaultKind);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  function openModal() {
    setKind(defaultKind);
    setError("");
    setDone(false);
    setOpen(true);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!message.trim()) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          projectId,
          kind,
          surface,
          targetId,
          targetLabel,
          message: message.trim(),
          context,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not send feedback. Please try again.");
      setDone(true);
      setMessage("");
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const triggerClass =
    tone === "dark"
      ? compact
        ? "inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-white/60 transition hover:border-amber-300/45 hover:text-amber-100"
        : "inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/65 transition hover:border-white/40 hover:text-white"
      : compact
        ? "inline-flex items-center gap-1 rounded px-2 py-0.5 text-[12px] font-medium text-stone-700 hover:bg-white/60"
        : "inline-flex items-center gap-1.5 rounded-lg border border-black/15 bg-white px-3 py-1.5 text-[13px] font-medium text-stone-700 hover:border-stone-400 hover:text-stone-950";

  return (
    <>
      <button type="button" onClick={openModal} className={triggerClass}>
        <span aria-hidden>{defaultKind === "diagram_broken" ? "⚠" : "⚑"}</span>
        <span>{label}</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[990] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Report teaching content or diagram issue"
            className="w-full max-w-lg rounded-2xl border border-white/20 bg-zinc-950/95 p-6 text-left font-sans text-white shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-wider text-cyan-300">Course &amp; Diagram Feedback</p>
                <h3 className="mt-1 text-lg font-semibold text-white">
                  {defaultKind === "diagram_broken" ? "Report diagram display issue" : "Flag content or grading issue"}
                </h3>
                {targetLabel && (
                  <p className="mt-0.5 text-xs text-white/55">
                    Location: {surface} · {targetLabel}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close feedback dialog"
                className="rounded-full border border-white/15 px-2.5 py-1 text-xs text-white/65 hover:border-white/40 hover:text-white"
              >
                ✕
              </button>
            </div>

            {!user ? (
              <div className="mt-5 rounded-xl border border-white/15 bg-white/5 p-4 text-sm text-white/75">
                <p>Sign in to send feedback to the course instructor or platform administrators.</p>
                <Link
                  href="/login"
                  className="mt-3 inline-flex rounded-full bg-white px-5 py-2 text-xs font-semibold text-black hover:bg-white/85"
                >
                  Sign in
                </Link>
              </div>
            ) : done ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-xl border border-emerald-300/35 bg-emerald-400/10 p-4 text-sm text-emerald-100">
                  Thank you — your report was saved with this step&apos;s context so the instructor or administrator can review and fix it.
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full bg-white px-5 py-2 text-xs font-semibold text-black hover:bg-white/85"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-5 space-y-4">
                <div>
                  <span className="text-xs font-medium text-white/70">What kind of issue is it?</span>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {FEEDBACK_KINDS.map((item) => {
                      const active = kind === item;
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setKind(item)}
                          className={`rounded-xl border px-3 py-2 text-left text-xs font-medium transition ${
                            active
                              ? "border-cyan-300 bg-cyan-300/15 text-cyan-100"
                              : "border-white/15 bg-white/[0.04] text-white/70 hover:border-white/35"
                          }`}
                        >
                          {FEEDBACK_KIND_LABELS[item]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <span className="text-xs font-medium text-white/70">One-click quick notes</span>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {QUICK_REASONS[kind].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setMessage((prev) => (prev ? `${prev.trim()} — ${preset}` : preset))}
                        className="rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-[11px] text-white/75 transition hover:border-cyan-300/45 hover:text-white"
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="block">
                  <span className="text-xs font-medium text-white/70">Details</span>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    required
                    minLength={3}
                    maxLength={1000}
                    placeholder="Briefly describe what looks wrong or broken…"
                    className="mt-1.5 w-full resize-y rounded-xl border border-white/20 bg-black/40 p-3 text-sm text-white placeholder:text-white/35 outline-none focus:border-cyan-300"
                  />
                </label>

                {error && (
                  <p className="rounded-xl border border-rose-400/35 bg-rose-400/10 px-3.5 py-2.5 text-xs text-rose-100">
                    {error}
                  </p>
                )}

                <div className="flex items-center justify-end gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-full border border-white/20 px-4 py-2 text-xs text-white/75 hover:border-white/45"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={busy || message.trim().length < 3}
                    className="rounded-full bg-white px-5 py-2 text-xs font-semibold text-black hover:bg-white/85 disabled:opacity-45"
                  >
                    {busy ? "Sending…" : "Submit feedback"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
