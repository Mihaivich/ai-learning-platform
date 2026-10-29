"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { PreferenceChoice } from "@/components/learning/PreferenceChoice";
import { safeSignInReturn } from "@/lib/auth-redirect";
import { useLearner } from "@/lib/learner-store";
import {
  GOAL_LABELS,
  LANGUAGE_LABELS,
  LEARNING_STYLE_LABELS,
  type Goal,
  type Language,
  type LearnerProfile,
  type LearningStyle,
} from "@/lib/types";

type Intention = "learn" | "teach";
type AccountInfo = {
  isTeacher: boolean;
  onboardingCompleted: boolean;
  intendedWorkspace: Intention | null;
  emailVerified: boolean;
  needsInstructorActivation?: boolean;
};

function OnboardingInner() {
  const router = useRouter();
  const params = useSearchParams();
  const nextPath = safeSignInReturn(params.get("next"));
  const intentParam = params.get("intent");
  const forceTeach = intentParam === "teach";

  const { profile, saveProfile, ready, user } = useLearner();
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [step, setStep] = useState<"intention" | "preferences">("intention");
  const [intention, setIntention] = useState<Intention | null>(
    forceTeach ? "teach" : null,
  );
  const [displayName, setDisplayName] = useState("");
  const [language, setLanguage] = useState<Language>("en");
  const [goal, setGoal] = useState<Goal>("understand");
  const [learningStyle, setLearningStyle] =
    useState<LearningStyle>("balanced");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.displayName);
    setLanguage(profile.language);
    setGoal(profile.goal);
    setLearningStyle(profile.learningStyle);
  }, [profile]);

  useEffect(() => {
    if (!user) {
      setAccount(null);
      return;
    }
    let active = true;
    fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: AccountInfo | null) => {
        if (!active || !data) return;
        setAccount(data);
        if (data.intendedWorkspace && !forceTeach) {
          setIntention(data.intendedWorkspace);
        }
        // Stuck teach intention without instructor role → recovery activation UI.
        if (data.needsInstructorActivation && !forceTeach) {
          window.location.replace("/onboarding?intent=teach");
          return;
        }
        // Returning users land on preferences unless they explicitly start teaching.
        if (data.onboardingCompleted && !forceTeach) {
          setStep("preferences");
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user, forceTeach]);

  async function activateTeaching() {
    setActivating(true);
    setError(null);
    try {
      const res = await fetch("/api/me/activate-instructor", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || "Could not activate Teaching Studio.");
      }
      router.replace("/teach");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setActivating(false);
    }
  }

  async function completeIntention(choice: Intention) {
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/onboarding?intent=${choice}`)}`);
      return;
    }
    setIntention(choice);
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intention: choice,
          displayName: displayName.trim() || profile?.displayName || "",
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || "Could not save your choice.");
      }
      setAccount(body as AccountInfo);
      if (choice === "teach") {
        router.replace("/teach");
        router.refresh();
        return;
      }
      const destination =
        nextPath && nextPath !== "/" && nextPath !== "/onboarding"
          ? nextPath
          : "/dashboard";
      if (profile) {
        router.replace(destination);
        router.refresh();
        return;
      }
      setStep("preferences");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function submitPreferences(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    const next: LearnerProfile = {
      displayName: displayName.trim(),
      language,
      goal,
      learningStyle,
      background: profile?.background ?? null,
      experience: profile?.experience ?? null,
    };
    try {
      await saveProfile(next);
      if (intention === "teach" || forceTeach) {
        await activateTeaching();
        return;
      }
      const destination =
        nextPath && nextPath !== "/" && nextPath !== "/onboarding"
          ? nextPath
          : "/dashboard";
      router.replace(destination);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (!ready) return null;

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
        <header>
          <p className="text-sm font-semibold text-indigo-600">DevPath</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-900">
            How do you want to use DevPath?
          </h1>
          <p className="mt-2 text-stone-600">
            Sign in first. One account can both learn and teach.
          </p>
        </header>
        <div className="mt-8">
          <Link
            href={`/login?next=${encodeURIComponent(
              forceTeach ? "/onboarding?intent=teach" : "/onboarding",
            )}`}
            className="inline-flex rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-white hover:bg-stone-700"
          >
            Sign in to continue
          </Link>
        </div>
      </div>
    );
  }

  if (forceTeach && account?.isTeacher) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
        <h1 className="text-3xl font-bold text-stone-900">Teaching Studio is ready</h1>
        <p className="mt-2 text-stone-600">
          Your account already has instructor access. You can keep learning as a
          student on the same account.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/teach"
            className="rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-stone-700"
          >
            Open Teaching Studio
          </Link>
          <Link
            href="/dashboard"
            className="rounded-full border border-stone-300 px-5 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            Back to My Learning
          </Link>
        </div>
      </div>
    );
  }

  if (forceTeach && account && !account.isTeacher) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
        <h1 className="text-3xl font-bold text-stone-900">Start Teaching</h1>
        <p className="mt-2 text-stone-600">
          Activate Teaching Studio on this account. You keep full student access.
          Administrator privileges are never granted here.
        </p>
        {!account.emailVerified && (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Confirm your email before activating instructor access.
          </p>
        )}
        {error && (
          <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </p>
        )}
        <button
          type="button"
          disabled={activating || !account.emailVerified}
          onClick={() => void activateTeaching()}
          className="mt-6 rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
        >
          {activating ? "Activating…" : "Activate Teaching Studio"}
        </button>
      </div>
    );
  }

  if (step === "intention" && (!account?.onboardingCompleted || forceTeach)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
        <header>
          <p className="text-sm font-semibold text-indigo-600">Welcome to DevPath</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-900">
            How do you intend to use DevPath?
          </h1>
          <p className="mt-2 max-w-2xl text-stone-600">
            These are onboarding intentions, not exclusive account types. You can
            learn and teach from the same account.
          </p>
        </header>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <IntentionCard
            title="I'm here to learn"
            description="Explore courses, create personal learning paths, and track your progress."
            disabled={saving}
            onClick={() => void completeIntention("learn")}
          />
          <IntentionCard
            title="I'm here to teach"
            description="Create courses with AI, invite students, and monitor learning outcomes."
            disabled={saving}
            onClick={() => void completeIntention("teach")}
          />
        </div>
        {error && (
          <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </p>
        )}
        <p className="mt-6 text-sm text-stone-500">
          You can change preferences later. Students can activate Teaching Studio
          any time from the account menu.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
      <header>
        <p className="text-sm font-semibold text-indigo-600">DevPath</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-900">
          Make learning yours.
        </h1>
        <p className="mt-2 text-stone-600">
          Set your learning preferences. You can always change them later.
        </p>
      </header>

      <form onSubmit={submitPreferences} className="mt-8 space-y-7" noValidate>
        <label className="block">
          <span className="font-medium text-stone-900">
            Display name <span className="font-normal text-stone-500">(optional)</span>
          </span>
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            maxLength={40}
            className="mt-2 w-full rounded-xl border border-stone-300 px-3 py-2 text-stone-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            placeholder="How should we greet you?"
          />
        </label>

        <PreferenceChoice
          label="Preferred language"
          hint="The AI tutor will explain and reply in this language."
          name="language"
          options={LANGUAGE_LABELS}
          value={language}
          onChange={setLanguage}
          columns={3}
        />
        <PreferenceChoice
          label="Main learning goal"
          name="goal"
          options={GOAL_LABELS}
          value={goal}
          onChange={setGoal}
        />
        <PreferenceChoice
          label="Learning style"
          hint="Optional. This shapes how the tutor explains and guides you."
          name="learning-style"
          options={LEARNING_STYLE_LABELS}
          value={learningStyle}
          onChange={setLearningStyle}
        />

        {error && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save preferences"}
          </button>
          {!account?.isTeacher && (
            <Link
              href="/onboarding?intent=teach"
              className="rounded-full border border-stone-300 px-5 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              Start Teaching
            </Link>
          )}
        </div>
      </form>
    </div>
  );
}

function IntentionCard({
  title,
  description,
  disabled,
  onClick,
}: {
  title: string;
  description: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-2xl border border-stone-200 bg-white p-6 text-left shadow-sm transition hover:border-indigo-300 hover:shadow-md disabled:opacity-50"
    >
      <h2 className="text-xl font-semibold text-stone-900">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-stone-600">{description}</p>
      <p className="mt-4 text-sm font-medium text-indigo-600">Continue →</p>
    </button>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={null}>
      <OnboardingInner />
    </Suspense>
  );
}
