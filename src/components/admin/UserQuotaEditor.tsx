"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BUCKET_META, ROLE_DEFAULT_QUOTA, type ActiveAiBucket, type QuotaOverrides } from "@/lib/ai/quota-shared";

function parseCap(raw: string): number | null | "invalid" {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isInteger(n) || n < 0 || n > 500) return "invalid";
  return n;
}

export function UserQuotaEditor({
  userId,
  role,
  initialQuotas,
}: {
  userId: string;
  role: string;
  initialQuotas: QuotaOverrides;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState<QuotaOverrides>(initialQuotas);
  const [draft, setDraft] = useState<Record<ActiveAiBucket, string>>({
    generation: initialQuotas.generation === null ? "" : String(initialQuotas.generation),
    roleplay: initialQuotas.roleplay === null ? "" : String(initialQuotas.roleplay),
    feedback: initialQuotas.feedback === null ? "" : String(initialQuotas.feedback),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const roleKey = role === "instructor" || role === "admin" ? role : "student";
  const defaults = ROLE_DEFAULT_QUOTA[roleKey];
  const hasOverride = saved.generation !== null || saved.roleplay !== null || saved.feedback !== null;

  async function persist(payload: QuotaOverrides) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not save quota override.");
        return;
      }
      const next = (data.quotas ?? payload) as QuotaOverrides;
      setSaved(next);
      setDraft({
        generation: next.generation === null ? "" : String(next.generation),
        roleplay: next.roleplay === null ? "" : String(next.roleplay),
        feedback: next.feedback === null ? "" : String(next.feedback),
      });
      setOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  function handleSave() {
    const gen = parseCap(draft.generation);
    const roleCap = parseCap(draft.roleplay);
    const feed = parseCap(draft.feedback);
    if (gen === "invalid" || roleCap === "invalid" || feed === "invalid") {
      setError("Enter integers 0–500, or leave blank for default.");
      return;
    }
    void persist({ generation: gen, roleplay: roleCap, feedback: feed });
  }

  return (
    <div className="w-full sm:w-auto">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
          hasOverride
            ? "border-cyan-300/40 bg-cyan-400/15 text-cyan-100 hover:bg-cyan-400/25"
            : "border-white/15 text-white/65 hover:border-white/35 hover:text-white"
        }`}
      >
        {hasOverride
          ? `Quota: ${saved.generation ?? defaults.generation}/${saved.roleplay ?? defaults.roleplay}/${saved.feedback ?? defaults.feedback} hr`
          : `Quota (${defaults.generation}/${defaults.roleplay}/${defaults.feedback})`}
      </button>

      {open && (
        <div className="mt-3 w-full rounded-2xl border border-white/15 bg-black/45 p-3.5 text-xs">
          <p className="text-white/60">
            Custom hourly caps for this account (0–500). Blank uses {roleKey} or class defaults.
          </p>
          <div className="mt-2.5 grid grid-cols-3 gap-2">
            {(["generation", "roleplay", "feedback"] as const).map((bucket) => (
              <label key={bucket} className="block">
                <span className="text-[11px] text-white/65">{BUCKET_META[bucket].shortLabel}</span>
                <input
                  type="number"
                  min={0}
                  max={500}
                  placeholder={String(defaults[bucket])}
                  value={draft[bucket]}
                  onChange={(e) => setDraft((prev) => ({ ...prev, [bucket]: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-white/20 bg-black/50 px-2.5 py-1.5 font-mono text-xs text-white outline-none focus:border-cyan-300"
                />
              </label>
            ))}
          </div>
          {error && <p className="mt-2 text-rose-200">{error}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={handleSave}
              className="rounded-full bg-white px-3 py-1 font-medium text-black hover:bg-white/85 disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save"}
            </button>
            {hasOverride && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void persist({ generation: null, roleplay: null, feedback: null })}
                className="rounded-full border border-white/20 px-3 py-1 text-white/70 hover:border-white/45 disabled:opacity-50"
              >
                Reset default
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => setOpen(false)}
              className="rounded-full px-2 py-1 text-white/50 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
