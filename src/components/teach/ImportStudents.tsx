"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MAX_ROSTER_TEXT, parseRoster, type PendingStudent, type RosterFormat, type RosterPreview, type RosterResult } from "@/lib/roster-input";

export function ImportStudents({ classId, pending }: { classId: string; pending: PendingStudent[] }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [format, setFormat] = useState<RosterFormat>("emails");
  const [preview, setPreview] = useState<RosterPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const fileRequest = useRef(0);
  function clear() { setPreview(null); setMessage(""); setError(""); }

  async function readFile(file: File | undefined) {
    if (!file) return;
    const request = ++fileRequest.current;
    clear(); setBusy(true);
    try {
      if (file.size > 200_000) throw new Error("CSV must be smaller than 200 KB. Split large lists before importing.");
      const value = await file.text();
      if (value.length > MAX_ROSTER_TEXT) throw new Error("The file is too large. Split it into smaller lists.");
      if (request !== fileRequest.current) return;
      setText(value); setFormat("csv");
    } catch (error) { setError(error instanceof Error ? error.message : "Could not read this file."); }
    finally { if (request === fileRequest.current) setBusy(false); }
  }

  async function importList() {
    setBusy(true); setError(""); setMessage("");
    try {
      const res = await fetch(`/api/classes/${classId}/roster`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, format }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not import. Please retry.");
      const results = data.results as RosterResult[];
      const count = (status: RosterResult["status"]) => results.filter((row) => row.status === status).length;
      setMessage(`${count("added")} added; ${count("already-member")} already in class; ${count("pending")} pending; ${count("already-pending")} already pending. ${data.skipped} invalid entries skipped; ${data.duplicates} duplicates ignored.`);
      setText(""); setPreview(null); router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "Could not import. Please retry the same list."); }
    finally { setBusy(false); }
  }

  async function cancel(email: string) {
    setBusy(true); setError(""); setMessage("");
    try {
      const res = await fetch(`/api/classes/${classId}/roster`, { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not cancel. Please retry.");
      setMessage(`Pending entry cancelled for ${email}.`); router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "Could not cancel. Please retry."); }
    finally { setBusy(false); }
  }

  return (
    <div className="mt-4 rounded-2xl border border-white/15 bg-slate-950/80 p-5">
      <h3 className="font-semibold">Import students</h3>
      <p className="mt-2 text-sm text-white/70">Add registered students now. Other emails stay pending until the learner signs in with that verified email and opens the catalogue. No notification emails are sent; share the site link or class code with your students.</p>
      <fieldset disabled={busy} className="mt-4 min-w-0 space-y-3 disabled:opacity-60">
        <label className="block text-sm" htmlFor="roster-format">List format</label>
        <select id="roster-format" value={format} onChange={(event) => { setFormat(event.target.value as RosterFormat); clear(); }} className="rounded-lg border border-white/25 bg-slate-900 px-3 py-2 text-white">
          <option value="emails">Email list</option><option value="csv">CSV with an email column</option>
        </select>
        <label htmlFor="roster-file" className="block text-sm">Or choose a CSV file</label>
        <input id="roster-file" type="file" accept=".csv,text/csv" onChange={(event) => { void readFile(event.target.files?.[0]); event.target.value = ""; }} className="block max-w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-white/15 file:px-3 file:py-2 file:text-white" />
        <label htmlFor="roster-text" className="block text-sm">{format === "csv" ? "CSV content" : "Email addresses"}</label>
        <textarea id="roster-text" value={text} maxLength={MAX_ROSTER_TEXT} onChange={(event) => { setText(event.target.value); clear(); }} rows={5} placeholder={format === "csv" ? 'email,name\nstudent@example.com,Alex' : 'alex@example.com\nsam@example.com'} className="w-full rounded-xl border border-white/25 bg-slate-950/50 p-3 text-sm text-white placeholder:text-slate-400" aria-describedby="roster-help" />
        <p id="roster-help" className="text-sm text-white/65">Up to 500 entries. Email lists use commas, semicolons or new lines. CSV needs one column named email; extra columns are ignored. Case and repeated emails are normalised.</p>
        <button type="button" onClick={() => { clear(); try { setPreview(parseRoster(text, format)); } catch (error) { setError((error as Error).message); } }} className="rounded-full border border-white/30 px-4 py-2 text-sm hover:bg-white/10">Preview list</button>
        {preview && (
          <div className="space-y-3" aria-live="polite">
            <p className="text-sm">{preview.emails.length} valid, {preview.duplicates} duplicates, {preview.invalid.length} invalid.</p>
            <ul className="max-h-36 overflow-y-auto rounded-lg bg-white/5 p-3 text-sm">{preview.emails.map((email) => <li key={email} className="break-all">{email}</li>)}</ul>
            {preview.invalid.length > 0 && <div className="text-sm text-amber-200"><p>These entries will be skipped. Correct them and preview again, or import the valid emails.</p><ul className="mt-1 max-h-32 overflow-y-auto">{preview.invalid.map((row) => <li key={row.row} className="break-all">{format === "csv" ? "CSV row" : "Entry"} {row.row}: {row.value || "(empty email)"}</li>)}</ul></div>}
            <button type="button" disabled={!preview.emails.length} onClick={() => void importList()} className="rounded-full bg-white px-5 py-2 text-sm font-medium text-black disabled:opacity-40">Import {preview.emails.length} valid emails</button>
          </div>
        )}
      </fieldset>
      {busy && <p className="mt-3 text-sm text-white/70" role="status">Working…</p>}
      {error && <p className="mt-3 text-sm text-rose-200" role="alert">{error}</p>}
      {message && <p className="mt-3 text-sm text-emerald-200" role="status">{message}</p>}
      {pending.length > 0 && <div className="mt-5"><h4 className="text-sm font-semibold">Pending students ({pending.length})</h4><ul className="mt-2 space-y-2">{pending.map(({ email }) => <li key={email} className="flex flex-wrap items-center justify-between gap-2 text-sm"><span className="break-all text-white/75">{email}</span><button disabled={busy} type="button" onClick={() => void cancel(email)} aria-label={`Cancel pending entry for ${email}`} className="rounded-full border border-white/25 px-3 py-1 hover:bg-white/10 disabled:opacity-50">Cancel pending</button></li>)}</ul></div>}
    </div>
  );
}
