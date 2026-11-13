"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { glass } from "@/components/home/glass";
import { BUCKET_META, ROLE_DEFAULT_QUOTA, type ActiveAiBucket, type QuotaOverrides } from "@/lib/ai/quota-shared";

const PRESETS: Array<{ label: string; sub: string; values: QuotaOverrides }> = [
  {
    label: "Platform default",
    sub: "12 gen · 40 call · 40 grading / hr",
    values: { generation: null, roleplay: null, feedback: null },
  },
  {
    label: "Classroom workshop",
    sub: "4 gen · 25 call · 25 grading / hr",
    values: { generation: 4, roleplay: 25, feedback: 25 },
  },
  {
    label: "Assigned courses only",
    sub: "0 gen (paused) · 40 call · 40 grading / hr",
    values: { generation: 0, roleplay: 40, feedback: 40 },
  },
];

function parseCap(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(500, Math.trunc(n)));
}

export function ClassQuotaSettings({
  classId,
  initial,
}: {
  classId: string;
  initial: QuotaOverrides;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<ActiveAiBucket, string>>({
    generation: initial.generation === null ? "" : String(initial.generation),
    roleplay: initial.roleplay === null ? "" : String(initial.roleplay),
    feedback: initial.feedback === null ? "" : String(initial.feedback),
  });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  function applyPreset(preset: QuotaOverrides) {
    setValues({
      generation: preset.generation === null ? "" : String(preset.generation),
      roleplay: preset.roleplay === null ? "" : String(preset.roleplay),
      feedback: preset.feedback === null ? "" : String(preset.feedback),
    });
    setNotice(null);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    const payload: QuotaOverrides = {
      generation: parseCap(values.generation),
      roleplay: parseCap(values.roleplay),
      feedback: parseCap(values.feedback),
    };
    try {
      const res = await fetch(`/api/classes/${classId}/quota`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not save class limits.");
      setNotice({ ok: true, text: "Saved. Limits apply immediately to students in this class." });
      router.refresh();
    } catch (cause) {
      setNotice({ ok: false, text: (cause as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className={`${glass} p-6`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">Student hourly AI quota limits</h3>
          <p className="mt-1 max-w-2xl text-xs text-white/55">
            Set hourly per-student caps for this class (leave blank for the platform student default, or set 0 to pause AI generation while keeping click-first &amp; keyword-graded play active).
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => applyPreset(preset.values)}
            className="rounded-xl border border-white/15 bg-white/[0.04] px-3.5 py-2 text-left text-xs transition hover:border-cyan-300/50 hover:bg-white/[0.08]"
          >
            <span className="block font-semibold text-white">{preset.label}</span>
            <span className="block text-[11px] text-white/55">{preset.sub}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {(["generation", "roleplay", "feedback"] as const).map((bucket) => {
          const meta = BUCKET_META[bucket];
          const def = ROLE_DEFAULT_QUOTA.student[bucket];
          return (
            <label key={bucket} className="rounded-xl border border-white/10 bg-black/25 p-3.5">
              <span className="block text-xs font-semibold text-white">{meta.label}</span>
              <span className="mt-0.5 block text-[11px] text-white/50">Default: {def} / hr</span>
              <input
                type="number"
                min={0}
                max={500}
                value={values[bucket]}
                onChange={(e) => setValues((prev) => ({ ...prev, [bucket]: e.target.value }))}
                placeholder={`${def} (default)`}
                className="mt-2 w-full rounded-lg border border-white/20 bg-black/40 px-3 py-1.5 font-mono text-sm text-white placeholder:text-white/35 outline-none focus:border-cyan-300"
              />
            </label>
          );
        })}
      </div>

      {notice && (
        <p className={`mt-3 text-xs ${notice.ok ? "text-emerald-200" : "text-rose-200"}`}>{notice.text}</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-white px-5 py-2 text-xs font-semibold text-black hover:bg-white/85 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save student limits"}
        </button>
      </div>
    </form>
  );
}
