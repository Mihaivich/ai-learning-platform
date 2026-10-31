"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** A student enters the code their instructor gave them. */
export function JoinClass() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/classes/join", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMessage({ ok: false, text: data.error ?? "Could not join. Please try again." });
      return;
    }
    setCode("");
    setMessage({ ok: true, text: `You joined ${data.name}.` });
    router.refresh();
  }

  return (
    <form onSubmit={submit}>
      <label htmlFor="class-code" className="font-semibold">Join a class</label>
      <p className="mt-1 text-sm text-white/50">Enter the six-character code from your instructor. Your instructor will see your progress on the projects they assign.</p>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <input
          id="class-code"
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          maxLength={6}
          required
          autoComplete="off"
          placeholder="K7M2QX"
          className="w-full rounded-2xl border border-white/20 bg-black/30 px-5 py-3 font-mono tracking-[0.3em] text-white outline-none placeholder:text-white/30 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20 sm:w-56"
        />
        <button type="submit" disabled={busy || code.trim().length !== 6} className="shrink-0 self-start rounded-full bg-white px-7 py-3 text-[15px] font-medium text-black hover:bg-white/85 disabled:opacity-60">
          {busy ? "Joining…" : "Join"}
        </button>
      </div>
      {message && <p className={`mt-3 text-sm ${message.ok ? "text-emerald-200" : "text-rose-200"}`}>{message.text}</p>}
    </form>
  );
}
