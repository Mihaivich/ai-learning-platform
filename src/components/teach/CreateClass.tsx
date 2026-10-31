"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const input =
  "w-full rounded-2xl border border-white/20 bg-black/30 px-5 py-3 text-white outline-none placeholder:text-white/35 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20";

export function CreateClass() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/classes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Something went wrong. Please try again.");
      setBusy(false);
      return;
    }
    router.push(`/teach/${data.id}`);
  }

  return (
    <form onSubmit={submit}>
      <label htmlFor="class-name" className="font-semibold">New class</label>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <input id="class-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required placeholder="COMP5241 Group A" className={input} />
        <button type="submit" disabled={busy || !name.trim()} className="shrink-0 rounded-full bg-white px-7 py-3 text-[15px] font-medium text-black hover:bg-white/85 disabled:opacity-60">
          {busy ? "Creating…" : "Create class"}
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-rose-200">{error}</p>}
    </form>
  );
}
