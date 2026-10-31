"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// A step's project takes about a minute, like any generated project.
const STAGES = [
  { after: 0, text: "Writing this step's client and what goes wrong…" },
  { after: 30, text: "Checking that every path through it plays fairly…" },
  { after: 70, text: "Fixing what the checks found. This can take another minute…" },
];

/** Generates the project for a step of a path, then reloads the page to show it. */
export function CreatePathStep({ pathId, step }: { pathId: string; step: number }) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!working) return;
    const started = Date.now();
    const timer = window.setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [working]);

  async function create() {
    setWorking(true);
    setSeconds(0);
    setError("");
    try {
      const res = await fetch(`/api/paths/${pathId}/steps`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ step }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
      router.refresh();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setWorking(false);
    }
  }

  const stage = [...STAGES].reverse().find((item) => seconds >= item.after) ?? STAGES[0];
  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-4">
        <button type="button" onClick={create} disabled={working} className="inline-flex rounded-full bg-white px-6 py-2.5 text-[15px] font-medium text-black hover:bg-white/85 disabled:opacity-60">
          {working ? "Creating…" : "Create this project"}
        </button>
        {working ? (
          <p className="text-sm text-white/70" aria-live="polite">
            {stage.text} <span className="tabular-nums text-white/45">{seconds}s</span>
          </p>
        ) : (
          <p className="text-sm text-white/45">Takes about a minute.</p>
        )}
      </div>
      {error && <p className="mt-4 rounded-2xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-100">{error}</p>}
    </div>
  );
}
