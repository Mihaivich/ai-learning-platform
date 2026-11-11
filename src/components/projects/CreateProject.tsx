"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { glass } from "@/components/home/glass";
import { useAuth } from "@/lib/auth-store";
import { LEVEL_LABELS, LEVELS, readProfile, type Level } from "@/lib/projects/generated/profile";
import { getSupabase } from "@/lib/supabase/client";

const SUBJECTS = [
  "Clinical Statistics",
  "Behavioural Economics",
  "Data Privacy & Law",
  "Analytical Chemistry",
  "Financial Accounting",
  "Cognitive Psychology",
  "Media & Journalism Ethics",
  "Supply Chain Operations",
  "Software Engineering",
];

const BACKGROUNDS = [
  "Nursing student",
  "Business & finance major",
  "Law & policy student",
  "Chemistry / lab science",
  "Journalism & media",
  "Hospitality & design",
  "CS undergraduate",
];

const REMIX_TWISTS = [
  "Set in a busy hospital ward",
  "Set on a university campus",
  "Adapt for retail & e-commerce",
  "Set in a public museum or NGO",
];

const TOPIC_IDEAS = [
  "Auditing ward infection rates",
  "Launching a café loyalty pass",
  "Reviewing a daycare fee policy",
  "Validating a river water lab SOP",
];

// What the learner sees while the AI works; a generation takes about a minute.
const STAGES = [
  { after: 0, text: "Designing the stakeholder, hidden constraints, and domain concepts…" },
  { after: 20, text: "Building the specialist deliverable (table, clauses, SOP, or code) & flaws…" },
  { after: 45, text: "Simulating every path, primer card, and Viva check for fairness…" },
  { after: 75, text: "Polishing details flagged by the automated verifier…" },
];

const MODES = [
  ["project", "One mini-course", "Primer + Spot-the-Trap game + simulated desktop mission (~1 min to generate)."],
  ["path", "3-step learning path", "Three progressive mini-courses teaching six concepts from your level up."],
] as const;

const input =
  "mt-2 w-full rounded-2xl border border-white/20 bg-black/30 px-5 py-3 text-white outline-none placeholder:text-white/35 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20";

export function CreateProject({
  remixTarget = null,
}: {
  remixTarget?: { id: string; title: string; domain: string } | null;
}) {
  const { ready, user } = useAuth();
  const router = useRouter();
  const [activeRemix, setActiveRemix] = useState(remixTarget);
  const [mode, setMode] = useState<"project" | "path">("project");
  const [topic, setTopic] = useState("");
  const [subject, setSubject] = useState("");
  const [instructions, setInstructions] = useState("");
  const [background, setBackground] = useState("");
  const [level, setLevel] = useState<Level | null>(null);
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ id: string; title: string } | null>(null);
  const [shared, setShared] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const supabase = getSupabase();
    if (!user || !supabase) return;
    let cancelled = false;
    supabase
      .from("profiles")
      .select("background,experience")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return;
        const profile = readProfile(data);
        setBackground((current) => current || profile.background);
        setLevel((current) => current ?? profile.level);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (status !== "working") return;
    const started = Date.now();
    const timer = window.setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [status]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("working");
    setSeconds(0);
    setError("");
    setShared(false);
    try {
      const path = !activeRemix && mode === "path";
      const profile = { background, level };
      const body = path
        ? { subject, profile }
        : activeRemix
          ? { remixBase: activeRemix.id, instructions, subject, profile }
          : { topic, subject, profile };
      const res = await fetch(path ? "/api/paths" : "/api/projects/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
      if (path) {
        router.push(`/paths/${data.id}`);
        return;
      }
      setCreated({ id: data.id, title: data.title });
      setStatus("done");
    } catch (cause) {
      setError((cause as Error).message);
      setStatus("error");
    }
  }

  async function toggleShareAfterCreate() {
    if (!created) return;
    const next = !shared;
    const res = await fetch(`/api/projects/gallery/${created.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isPublic: next }),
    });
    if (res.ok) setShared(next);
  }

  if (!ready) return <div className={`${glass} p-7 text-white/60`}>Loading…</div>;

  if (!user) {
    return (
      <div className={`${glass} p-7`}>
        <p className="text-lg text-white/80">Sign in to generate or remix a mini-course. It&apos;s saved to your account, and you can optionally share it to the Community Gallery.</p>
        <Link href="/login" className="mt-6 inline-flex rounded-full bg-white px-7 py-3 text-[15px] font-medium text-black hover:bg-white/85">
          Sign in
        </Link>
      </div>
    );
  }

  if (status === "done" && created) {
    return (
      <div className={`${glass} p-7`}>
        <p className="text-sm font-medium text-emerald-300">Verified & ready to learn</p>
        <h2 className="mt-2 text-2xl font-semibold">{created.title}</h2>
        <p className="mt-3 text-white/65">
          Passed every automated playability check: start with the 3-minute interactive visual primer and Spot-the-Trap game, or jump straight onto the click-first simulated desktop.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href={`/projects/${created.id}/learn`} className="inline-flex rounded-full bg-white px-7 py-3 text-[15px] font-medium text-black hover:bg-white/85">
            Start 3-Act Mini-Course →
          </Link>
          <Link href={`/projects/${created.id}`} className="inline-flex rounded-full border border-white/25 bg-white/[0.06] px-6 py-3 text-[15px] font-medium text-white hover:border-white/50 hover:bg-white/15">
            Open Desktop directly
          </Link>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
          <button
            type="button"
            onClick={toggleShareAfterCreate}
            className={`rounded-full border px-4 py-2 text-xs font-medium transition ${
              shared
                ? "border-emerald-300/40 bg-emerald-400/15 text-emerald-100"
                : "border-white/20 text-white/75 hover:border-white/45"
            }`}
          >
            {shared ? "✓ Shared to Community Gallery" : "Share to Community Gallery"}
          </button>
          <button
            type="button"
            onClick={() => {
              setStatus("idle");
              setCreated(null);
            }}
            className="text-xs text-white/55 hover:text-white"
          >
            Create another
          </button>
        </div>
      </div>
    );
  }

  const working = status === "working";
  const path = !activeRemix && mode === "path";
  const stage = path
    ? { text: "Planning three progressive mini-courses, two concepts in each…" }
    : ([...STAGES].reverse().find((item) => seconds >= item.after) ?? STAGES[0]);
  const chip = (on: boolean) =>
    `rounded-full border px-3 py-1 text-sm transition ${on ? "border-cyan-300 bg-cyan-300/15 text-white" : "border-white/15 text-white/70 hover:border-white/40"}`;

  return (
    <form onSubmit={submit} className={`${glass} p-7`}>
      <fieldset disabled={working} className="space-y-6">
        {activeRemix ? (
          <div className="flex items-start justify-between gap-3 rounded-2xl border border-cyan-300/35 bg-cyan-300/10 p-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-cyan-200">Remixing base course</p>
              <p className="mt-1 font-semibold text-white">{activeRemix.title}</p>
              <p className="text-xs text-white/65">Original domain: {activeRemix.domain}</p>
            </div>
            <button
              type="button"
              onClick={() => setActiveRemix(null)}
              className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/75 hover:border-white/50 hover:text-white"
            >
              Start from scratch instead
            </button>
          </div>
        ) : (
          <div role="radiogroup" aria-label="What to create" className="grid gap-2 sm:grid-cols-2">
            {MODES.map(([value, title, note]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={mode === value}
                onClick={() => setMode(value)}
                className={`rounded-2xl border p-4 text-left ${mode === value ? "border-cyan-300 bg-cyan-300/10" : "border-white/15 hover:border-white/40"}`}
              >
                <span className="block font-semibold">{title}</span>
                <span className="mt-1 block text-sm text-white/55">{note}</span>
              </button>
            ))}
          </div>
        )}

        <div>
          <label htmlFor="project-background" className="font-semibold">About you</label>
          <p className="mt-1 text-sm text-white/50">Click a background below (or type your own)—analogies and scenarios adapt to your world.</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {BACKGROUNDS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setBackground(background === item ? "" : item)}
                className={chip(background === item)}
              >
                {item}
              </button>
            ))}
          </div>
          <input
            id="project-background"
            value={background}
            onChange={(event) => setBackground(event.target.value)}
            maxLength={160}
            placeholder="Or type your own major / profession…"
            className={input}
          />
        </div>

        {activeRemix ? (
          <div>
            <label htmlFor="remix-instructions" className="font-semibold">
              How should we remix it? <span className="font-normal text-white/45">(optional)</span>
            </label>
            <p className="mt-1 text-sm text-white/50">
              Pick a twist with one click—or leave blank to adapt it automatically to your background above.
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {REMIX_TWISTS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setInstructions(instructions === item ? "" : item)}
                  className={chip(instructions === item)}
                >
                  {item}
                </button>
              ))}
            </div>
            <input
              id="remix-instructions"
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
              maxLength={800}
              placeholder="Or describe a custom setting / twist…"
              className={input}
            />
          </div>
        ) : null}

        <div>
          <label htmlFor="project-subject" className="font-semibold">
            Subject or discipline {!path && <span className="font-normal text-white/45">(optional)</span>}
          </label>
          <p className="mt-1 text-sm text-white/50">
            {path ? "Each step teaches two core concepts of this subject." : "Pick any academic or professional subject—your AI teammate will get its classic traps wrong so you learn by catching them."}
          </p>
          <input
            id="project-subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            maxLength={80}
            required={path}
            minLength={2}
            placeholder="e.g., Clinical Statistics, Contract Law, Behavioural Economics…"
            className={input}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {SUBJECTS.map((item) => (
              <button key={item} type="button" onClick={() => setSubject(subject === item ? "" : item)} className={chip(subject === item)}>
                {item}
              </button>
            ))}
          </div>
          {subject.trim() && (
            <div className="mt-4" role="radiogroup" aria-label="Your level in the subject">
              <p className="text-sm text-white/70">How much {subject.trim()} do you know?</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {LEVELS.map((item) => (
                  <button key={item} type="button" role="radio" aria-checked={level === item} onClick={() => setLevel(item)} className={chip(level === item)}>
                    {LEVEL_LABELS[item]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {!path && !activeRemix && (
          <div>
            <label htmlFor="project-topic" className="font-semibold">
              What is the real-world mission? {subject.trim() && <span className="font-normal text-white/45">(optional)</span>}
            </label>
            <p className="mt-1 text-sm text-white/50">
              {subject.trim()
                ? `Leave blank and the AI invents a realistic job in your world where ${subject.trim().toLowerCase()} decides the outcome—or pick an idea:`
                : "Pick a mission idea with one click, or write one line about the client:"}
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {TOPIC_IDEAS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setTopic(topic === item ? "" : item)}
                  className={chip(topic === item)}
                >
                  {item}
                </button>
              ))}
            </div>
            <input
              id="project-topic"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              maxLength={200}
              required={!subject.trim()}
              minLength={4}
              placeholder="Or type your own mission topic…"
              className={input}
            />
          </div>
        )}
      </fieldset>

      {error && <p className="mt-5 rounded-2xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-100">{error}</p>}

      <div className="mt-7 flex flex-wrap items-center gap-4">
        <button type="submit" disabled={working} className="inline-flex rounded-full bg-white px-7 py-3 text-[15px] font-medium text-black hover:bg-white/85 disabled:opacity-60">
          {working ? "Generating…" : activeRemix ? "Remix mini-course" : path ? "Plan learning path" : "Create mini-course"}
        </button>
        {working ? (
          <p className="text-sm text-white/70" aria-live="polite">
            {stage.text} <span className="tabular-nums text-white/45">{seconds}s</span>
          </p>
        ) : (
          <p className="text-sm text-white/45">
            {path ? "Plans 3 courses in seconds." : "Automatically chooses the right artifact (table, document, SOP, or code)."}
          </p>
        )}
      </div>
    </form>
  );
}
