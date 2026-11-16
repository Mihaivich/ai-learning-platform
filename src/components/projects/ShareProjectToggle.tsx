"use client";

import { useState } from "react";

export function ShareProjectToggle({
  projectId,
  initialPublic,
}: {
  projectId: string;
  initialPublic: boolean;
}) {
  const [isPublic, setIsPublic] = useState(initialPublic);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/gallery/${projectId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isPublic: !isPublic }),
      });
      const data = (await res.json().catch(() => null)) as { isPublic?: boolean; error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? "Could not update sharing setting.");
        return;
      }
      setIsPublic(Boolean(data?.isPublic));
    } catch {
      setError("Could not update sharing setting.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={() => void toggle()}
        aria-pressed={isPublic}
        className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
          isPublic
            ? "border-teal-300/40 bg-teal-400/15 text-teal-100 hover:bg-teal-400/25"
            : "border-white/20 text-white/70 hover:border-white/45 hover:text-white"
        } disabled:opacity-50`}
      >
        {busy ? "Saving…" : isPublic ? "Shared in community" : "Share to community"}
      </button>
      {error && <p className="text-[11px] text-rose-300">{error}</p>}
    </div>
  );
}
