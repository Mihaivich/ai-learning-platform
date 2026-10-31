"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RemoveStudent({ classId, studentId, name }: { classId: string; studentId: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        if (!window.confirm(`Remove ${name} from this class? Their runs are kept.`)) return;
        setBusy(true);
        await fetch(`/api/classes/${classId}/members/${studentId}`, { method: "DELETE" });
        router.refresh();
      }}
      className="text-xs text-white/45 hover:text-rose-200 disabled:opacity-60"
    >
      Remove
    </button>
  );
}
