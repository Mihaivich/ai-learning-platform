"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { glass } from "@/components/home/glass";
import type { QuotaOverrides } from "@/lib/ai/quota-shared";
import {
  BACKGROUND_PRESETS,
  LEVEL_LABELS,
  LEVELS,
  type AccountProfile,
  type Level,
} from "@/lib/projects/generated/profile";

export interface JoinedClassCard {
  id: string;
  name: string;
  quotas: QuotaOverrides;
  projects: Array<{ id: string; title: string }>;
}

const ROLE_BADGE: Record<string, { label: string; style: string }> = {
  admin: {
    label: "Administrator",
    style: "border-amber-300/35 bg-amber-300/15 text-amber-100",
  },
  instructor: {
    label: "Instructor",
    style: "border-cyan-300/35 bg-cyan-300/15 text-cyan-100",
  },
  student: {
    label: "Student",
    style: "border-white/20 bg-white/10 text-white/85",
  },
};

const inputClass =
  "mt-2 w-full rounded-2xl border border-white/20 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20";

export function ProfileClient({
  email,
  role,
  initialProfile,
  initialClasses,
}: {
  email: string | null;
  role: string;
  initialProfile: AccountProfile;
  initialClasses: JoinedClassCard[];
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initialProfile.displayName);
  const [background, setBackground] = useState(initialProfile.background);
  const [level, setLevel] = useState<Level | null>(initialProfile.level);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinNotice, setJoinNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const badge = ROLE_BADGE[role] ?? ROLE_BADGE.student;

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName, background, level }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice({ kind: "err", text: data.error ?? "Could not save profile." });
        return;
      }
      setNotice({
        kind: "ok",
        text: "Saved! Your display name and learner preferences now sync automatically when creating mini-courses.",
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleJoinClass(event: React.FormEvent) {
    event.preventDefault();
    if (!joinCode.trim()) return;
    setJoining(true);
    setJoinNotice(null);
    try {
      const res = await fetch("/api/classes/join", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: joinCode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setJoinNotice({ kind: "err", text: data.error ?? "Could not join class." });
        return;
      }
      setJoinCode("");
      setJoinNotice({ kind: "ok", text: `Joined "${data.name ?? "class"}".` });
      router.refresh();
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Unified Account + Learner Profile form */}
      <form onSubmit={handleSave} className={`${glass} space-y-6 p-6 sm:p-8`}>
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <h2 className="text-xl font-semibold text-white">Identity &amp; Learner Profile</h2>
            <p className="mt-1 text-sm text-white/60">
              Your account details and learning background live in one place and pre-fill AI course generation on{" "}
              <Link href="/projects/new" className="text-cyan-200 hover:underline">
                Create
              </Link>
              .
            </p>
          </div>
          <span className={`rounded-full border px-3.5 py-1 text-xs font-semibold ${badge.style}`}>
            {badge.label}
          </span>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="profile-display-name" className="block text-sm font-medium text-white/85">
              Display name
            </label>
            <input
              id="profile-display-name"
              type="text"
              maxLength={80}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="How instructors & classmates see you"
              className={inputClass}
            />
          </div>

          <div>
            <span className="block text-sm font-medium text-white/85">Sign-in email</span>
            <div className="mt-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/65">
              {email ?? "Signed-in account"}
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="profile-background" className="block text-sm font-medium text-white/85">
            Your field or study background
          </label>
          <p className="mt-0.5 text-xs text-white/50">
            Used to ground examples, stakeholders, and specialist artifacts in your discipline.
          </p>
          <input
            id="profile-background"
            type="text"
            maxLength={160}
            value={background}
            onChange={(e) => setBackground(e.target.value)}
            placeholder="e.g., Nursing student, Law & policy, CS undergraduate…"
            className={inputClass}
          />
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {BACKGROUND_PRESETS.map((preset) => {
              const active = background === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setBackground(preset)}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    active
                      ? "border-cyan-300 bg-cyan-300/15 text-cyan-100"
                      : "border-white/15 text-white/65 hover:border-white/35 hover:text-white"
                  }`}
                >
                  {preset}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <span className="block text-sm font-medium text-white/85">Default starting level</span>
          <p className="mt-0.5 text-xs text-white/50">
            Controls how much scaffolding new mini-courses and 3-step learning paths provide by default.
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {LEVELS.map((item) => {
              const selected = level === item;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setLevel(selected ? null : item)}
                  className={`rounded-full border px-4 py-2 text-xs font-medium transition ${
                    selected
                      ? "border-cyan-300 bg-cyan-300/20 text-cyan-100"
                      : "border-white/15 text-white/70 hover:border-white/35 hover:text-white"
                  }`}
                >
                  {LEVEL_LABELS[item]}
                </button>
              );
            })}
          </div>
        </div>

        {notice && (
          <p
            className={`rounded-xl border px-4 py-2.5 text-xs ${
              notice.kind === "ok"
                ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-100"
                : "border-rose-300/30 bg-rose-400/10 text-rose-200"
            }`}
          >
            {notice.text}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black transition hover:bg-white/85 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save profile"}
          </button>

          {(role === "instructor" || role === "admin") && (
            <Link
              href="/teach"
              className="rounded-full border border-white/20 px-4 py-2 text-xs font-medium text-white/80 hover:border-white/45 hover:text-white"
            >
              Manage classes &amp; student quotas →
            </Link>
          )}
        </div>
      </form>

      {/* Joined Classes & Class Quota Rules */}
      <section className={`${glass} space-y-5 p-6 sm:p-8`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Joined Classes</h2>
            <p className="mt-1 text-sm text-white/60">
              Enter a 6-character code from your instructor to see assigned courses and class AI quota rules.
            </p>
          </div>

          <form onSubmit={handleJoinClass} className="flex items-center gap-2">
            <input
              type="text"
              maxLength={8}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="6-char code"
              aria-label="Class join code"
              className="w-32 rounded-full border border-white/20 bg-black/35 px-3.5 py-2 font-mono text-xs uppercase tracking-wider text-white outline-none placeholder:text-white/35 focus:border-cyan-300"
            />
            <button
              type="submit"
              disabled={joining || !joinCode.trim()}
              className="rounded-full border border-cyan-300/40 bg-cyan-400/15 px-4 py-2 text-xs font-semibold text-cyan-100 hover:bg-cyan-400/25 disabled:opacity-50"
            >
              {joining ? "Joining…" : "Join"}
            </button>
          </form>
        </div>

        {joinNotice && (
          <p className={`text-xs ${joinNotice.kind === "ok" ? "text-emerald-200" : "text-rose-200"}`}>
            {joinNotice.text}
          </p>
        )}

        {initialClasses.length === 0 ? (
          <p className="text-sm text-white/50">You haven&apos;t joined any classes yet.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {initialClasses.map((cls) => {
              const hasCaps =
                cls.quotas.generation !== null ||
                cls.quotas.roleplay !== null ||
                cls.quotas.feedback !== null;
              return (
                <li key={cls.id} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <p className="font-semibold text-white">{cls.name}</p>
                  <p className="mt-1 text-xs text-white/50">
                    {hasCaps
                      ? `Instructor hourly caps — Generate: ${cls.quotas.generation ?? "default"}, Call: ${cls.quotas.roleplay ?? "default"}, Grading: ${cls.quotas.feedback ?? "default"}`
                      : "Uses standard student AI allowance"}
                  </p>
                  {cls.projects.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {cls.projects.map((proj) => (
                        <Link
                          key={proj.id}
                          href={`/projects/${proj.id}/learn`}
                          className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-xs text-cyan-100 hover:border-cyan-300/45"
                        >
                          {proj.title} →
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2.5 text-xs text-white/40">No courses assigned yet.</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
