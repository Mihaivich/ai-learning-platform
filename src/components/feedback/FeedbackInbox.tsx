"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { glass } from "@/components/home/glass";
import { FEEDBACK_KIND_LABELS, type FeedbackItem, type FeedbackKind, type FeedbackStatus } from "@/lib/feedback-shared";

const KIND_BADGE: Record<FeedbackKind, string> = {
  diagram_broken: "border-amber-300/35 bg-amber-400/15 text-amber-100",
  content_error: "border-rose-300/35 bg-rose-400/15 text-rose-100",
  grading_issue: "border-fuchsia-300/35 bg-fuchsia-400/15 text-fuchsia-100",
  unclear: "border-cyan-300/35 bg-cyan-400/15 text-cyan-100",
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Hong_Kong",
  });
}

export function FeedbackInbox({
  initialItems,
  showProjectLink = false,
  emptyText = "No learner feedback reported yet.",
}: {
  initialItems: FeedbackItem[];
  showProjectLink?: boolean;
  emptyText?: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState<FeedbackItem[]>(initialItems);
  const [filter, setFilter] = useState<"open" | "all">("open");
  const [busyId, setBusyId] = useState<string | null>(null);

  const visible = filter === "open" ? items.filter((item) => item.status === "open") : items;
  const openCount = items.filter((item) => item.status === "open").length;

  async function updateStatus(id: string, status: FeedbackStatus) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/feedback/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setItems((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)));
        router.refresh();
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-white/60">
          <span className="font-semibold text-white">{openCount}</span> open{" "}
          {openCount === 1 ? "report" : "reports"} · {items.length} total
        </p>
        <div className="flex items-center gap-1.5 text-xs">
          {(["open", "all"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={`rounded-full border px-3 py-1 font-medium transition ${
                filter === tab
                  ? "border-cyan-300 bg-cyan-300/15 text-cyan-100"
                  : "border-white/15 text-white/65 hover:border-white/40"
              }`}
            >
              {tab === "open" ? `Open (${openCount})` : `All (${items.length})`}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className={`${glass} p-5 text-sm text-white/55`}>
          {filter === "open" && items.length > 0 ? "All reported issues have been resolved or dismissed." : emptyText}
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((item) => {
            const busy = busyId === item.id;
            return (
              <li key={item.id} className={`${glass} p-5`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className={`rounded-full border px-2.5 py-0.5 font-medium ${KIND_BADGE[item.kind]}`}>
                        {FEEDBACK_KIND_LABELS[item.kind]}
                      </span>
                      {item.status !== "open" && (
                        <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 text-white/70">
                          {item.status}
                        </span>
                      )}
                      <span className="text-white/45">
                        {item.surface}
                        {item.targetLabel ? ` · ${item.targetLabel}` : ""}
                      </span>
                      <span className="text-white/35">{formatTime(item.createdAt)}</span>
                    </div>
                    {showProjectLink && (
                      <p className="text-sm font-semibold text-white">
                        <Link href={`/projects/${item.projectId}/learn`} className="hover:text-cyan-200 hover:underline">
                          {item.projectTitle}
                        </Link>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    {item.status === "open" ? (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void updateStatus(item.id, "resolved")}
                          className="rounded-full border border-emerald-300/35 bg-emerald-400/15 px-3 py-1 font-medium text-emerald-100 hover:bg-emerald-400/25 disabled:opacity-50"
                        >
                          ✓ Resolve
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void updateStatus(item.id, "dismissed")}
                          className="rounded-full border border-white/20 px-3 py-1 text-white/70 hover:border-white/45 disabled:opacity-50"
                        >
                          Dismiss
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void updateStatus(item.id, "open")}
                        className="rounded-full border border-white/20 px-3 py-1 text-white/70 hover:border-white/45 disabled:opacity-50"
                      >
                        Reopen
                      </button>
                    )}
                  </div>
                </div>

                <p className="mt-2.5 whitespace-pre-line text-sm leading-relaxed text-white/85">{item.message}</p>

                {Object.keys(item.context).length > 0 && (
                  <details className="mt-2.5 text-xs text-white/50">
                    <summary className="cursor-pointer hover:text-white/75">Diagnostic snapshot</summary>
                    <pre className="mt-1.5 max-h-40 overflow-auto rounded-xl border border-white/10 bg-black/40 p-3 font-mono text-[11px] text-white/70">
                      {JSON.stringify(item.context, null, 2)}
                    </pre>
                  </details>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
