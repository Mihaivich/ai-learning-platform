"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { glass } from "@/components/home/glass";
import { useAuth } from "@/lib/auth-store";
import { LEVEL_LABELS, LEVELS, readProfile, type Level } from "@/lib/projects/generated/profile";
import { getSupabase } from "@/lib/supabase/client";

const FIELDS = ["Healthcare", "Marketing", "Event planning", "Data analysis", "Teaching", "Journalism", "Hospitality"];

const SUBJECTS = ["Statistics", "Economics", "Psychology", "Chemistry", "Accounting", "Ethics"];

const EXAMPLES: Record<string, string> = {
  Healthcare: "whether a new hand gel reduced infections on a ward",
  Marketing: "a loyalty programme for a neighbourhood café",
  "Event planning": "a charity fun run for a primary school",
  "Data analysis": "a weekly sales report for a bike shop",
  Teaching: "a revision timetable for a Year 11 class",
  Journalism: "a fact-checking workflow for a student newspaper",
  Hospitality: "a breakfast menu change for a small hotel",
};

// What the learner sees while the AI works; a generation takes about a minute.
const STAGES = [
  { after: 0, text: "Writing the client, the problem and what the client knows…" },
  { after: 20, text: "Writing what the AI teammate delivers, and how it can go wrong…" },
  { after: 45, text: "Checking that every path through the project plays fairly…" },
  { after: 75, text: "Fixing what the checks found. This can take another minute…" },
];

const input =
  "mt-2 w-full rounded-2xl border border-white/20 bg-black/30 px-5 py-3 text-white outline-none placeholder:text-white/35 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20";

export function CreateProject() {
  const { ready, user } = useAuth();
  const [domain, setDomain] = useState("");
  const [topic, setTopic] = useState("");
  const [subject, setSubject] = useState("");
  const [background, setBackground] = useState("");
  const [level, setLevel] = useState<Level | null>(null);
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ id: string; title: string } | null>(null);
  const [seconds, setSeconds] = useState(0);

  // The profile from earlier projects fills the form in.
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
    try {
      const res = await fetch("/api/projects/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ domain, topic, subject, profile: { background, level } }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
      setCreated({ id: data.id, title: data.title });
      setStatus("done");
    } catch (cause) {
      setError((cause as Error).message);
      setStatus("error");
    }
  }

  if (!ready) return <div className={`${glass} p-7 text-white/60`}>Loading…</div>;

  if (!user) {
    return (
      <div className={`${glass} p-7`}>
        <p className="text-lg text-white/80">Sign in to create a project. It&apos;s saved to your account, and only you can see it.</p>
        <Link href="/login" className="mt-6 inline-flex rounded-full bg-white px-7 py-3 text-[15px] font-medium text-black hover:bg-white/85">
          Sign in
        </Link>
      </div>
    );
  }

  if (status === "done" && created) {
    return (
      <div className={`${glass} p-7`}>
        <p className="text-sm text-emerald-300">Ready to play</p>
        <h2 className="mt-2 text-2xl font-semibold">{created.title}</h2>
        <p className="mt-3 text-white/65">It passed every check: each fact can be found, and every way the work can go wrong leads somewhere fair.</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href={`/projects/${created.id}`} className="inline-flex rounded-full bg-white px-7 py-3 text-[15px] font-medium text-black hover:bg-white/85">
            Open the desktop
          </Link>
          <button
            type="button"
            onClick={() => {
              setStatus("idle");
              setCreated(null);
            }}
            className="inline-flex rounded-full border border-white/20 px-7 py-3 text-[15px] font-medium text-white/80 hover:border-white/50 hover:bg-white/10"
          >
            Create another
          </button>
        </div>
      </div>
    );
  }

  const working = status === "working";
  const stage = [...STAGES].reverse().find((item) => seconds >= item.after) ?? STAGES[0];
  const example = EXAMPLES[domain] ?? "a loyalty programme for a neighbourhood café";
  const chip = (on: boolean) =>
    `rounded-full border px-3 py-1 text-sm ${on ? "border-cyan-300 bg-cyan-300/10 text-white" : "border-white/15 text-white/70 hover:border-white/40"}`;

  return (
    <form onSubmit={submit} className={`${glass} p-7`}>
      <fieldset disabled={working} className="space-y-6">
        <div>
          <label htmlFor="project-background" className="font-semibold">About you</label>
          <p className="mt-1 text-sm text-white/50">The project is set in your world, and the Handbook explains ideas with examples from it. Saved for next time.</p>
          <input id="project-background" value={background} onChange={(event) => setBackground(event.target.value)} maxLength={160} placeholder="a second-year nursing student" className={input} />
        </div>
        <div>
          <label htmlFor="project-subject" className="font-semibold">Subject to learn <span className="font-normal text-white/45">(optional)</span></label>
          <p className="mt-1 text-sm text-white/50">The job then teaches two of its ideas. Your AI teammate gets them wrong, and you catch it.</p>
          <input id="project-subject" value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={80} placeholder="Statistics" className={input} />
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
        <div>
          <label htmlFor="project-field" className="font-semibold">Field</label>
          <input id="project-field" value={domain} onChange={(event) => setDomain(event.target.value)} maxLength={80} required minLength={2} placeholder="Marketing" className={input} />
          <div className="mt-3 flex flex-wrap gap-2">
            {FIELDS.map((field) => (
              <button
                key={field}
                type="button"
                onClick={() => setDomain(field)}
                className={chip(domain === field)}
              >
                {field}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="project-topic" className="font-semibold">
            What is the job? {subject.trim() && <span className="font-normal text-white/45">(optional)</span>}
          </label>
          <p className="mt-1 text-sm text-white/50">
            {subject.trim()
              ? `Leave it blank and the AI picks a job in this field where ${subject.trim().toLowerCase()} matters.`
              : "One line about the client and what they want. The AI works out what goes wrong."}
          </p>
          <input id="project-topic" value={topic} onChange={(event) => setTopic(event.target.value)} maxLength={200} required={!subject.trim()} minLength={4} placeholder={example} className={input} />
        </div>
      </fieldset>

      {error && <p className="mt-5 rounded-2xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-100">{error}</p>}

      <div className="mt-7 flex flex-wrap items-center gap-4">
        <button type="submit" disabled={working} className="inline-flex rounded-full bg-white px-7 py-3 text-[15px] font-medium text-black hover:bg-white/85 disabled:opacity-60">
          {working ? "Creating…" : "Create the project"}
        </button>
        {working ? (
          <p className="text-sm text-white/70" aria-live="polite">
            {stage.text} <span className="tabular-nums text-white/45">{seconds}s</span>
          </p>
        ) : (
          <p className="text-sm text-white/45">Takes about a minute.</p>
        )}
      </div>
    </form>
  );
}
