"use client";

import { useLearner } from "@/lib/learner-store";

export function ProgressSyncStatus() {
  const { syncStatus: status, retrySync } = useLearner();
  if (!status.error && !status.pending && status.localSaved) return null;
  return (
    <div role="status" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
      {!status.localSaved ? (
        <p>Browser storage is unavailable. Progress that has not reached the server is only kept on this page.</p>
      ) : (
        <p>Progress is saved in this browser and has not finished syncing.</p>
      )}
      {status.error && <p>{status.error}</p>}
      {status.syncing ? <p>Syncing progress…</p> : (
        <button type="button" className="mt-1 underline" onClick={() => { void retrySync(); }}>
          Retry saving progress
        </button>
      )}
    </div>
  );
}
