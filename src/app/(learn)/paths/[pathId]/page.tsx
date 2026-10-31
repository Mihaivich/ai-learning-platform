import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { glass } from "@/components/home/glass";
import { Reveal } from "@/components/home/Reveal";
import { CreatePathStep } from "@/components/projects/CreatePathStep";
import { isPathId, pathPlanSchema, pathProgress, type StepStatus } from "@/lib/projects/generated/path";
import { LEVEL_LABELS } from "@/lib/projects/generated/profile";
import { serverDb } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Learning path · DevPath" };

const STATUS: Record<StepStatus, { label: string; className: string }> = {
  done: { label: "Done", className: "bg-emerald-400/15 text-emerald-200" },
  playing: { label: "In progress", className: "bg-cyan-400/15 text-cyan-200" },
  ready: { label: "Up next", className: "bg-white/15 text-white" },
  locked: { label: "Locked", className: "bg-white/5 text-white/45" },
};

const OUTCOMES: Record<string, string> = {
  success: "It worked.",
  partial: "Partly there.",
  failure: "It went wrong. The report says why.",
  incomplete: "Ran out of time.",
};

export default async function PathPage({ params }: { params: Promise<{ pathId: string }> }) {
  const { pathId } = await params;
  if (!isPathId(pathId)) notFound();
  const db = await serverDb();
  const { data: auth } = (await db?.auth.getUser()) ?? { data: { user: null } };
  if (!db || !auth.user) redirect("/login");

  // Row-level security returns only the owner's own path.
  const { data } = await db.from("learning_paths").select("id,subject,domain,title,summary,plan").eq("id", pathId).maybeSingle();
  const plan = pathPlanSchema.safeParse(data?.plan);
  if (!data || !plan.success) notFound();
  const progress = await pathProgress(db, pathId, plan.data.steps.length);
  const { data: projects } = await db.from("generated_projects").select("id,title,tagline").eq("path_id", pathId);
  const done = progress.filter((item) => item.status === "done").length;

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-12 text-white lg:px-0 lg:pt-16">
      <Reveal>
        <p className="text-sm text-white/50">
          Learning path · {data.subject} · {data.domain}
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">{data.title}</h1>
        <p className="mt-4 text-lg text-white/65">{data.summary}</p>
        <p className="mt-4 text-sm text-white/50">
          {done} of {plan.data.steps.length} projects done. Each one opens when you finish the one before.
        </p>
      </Reveal>

      <ol className="mt-10 space-y-5">
        {plan.data.steps.map((step, index) => {
          const state = progress[index];
          const project = projects?.find((item) => item.id === state.projectId);
          const status = STATUS[state.status];
          return (
            <li key={index} className={`${glass} p-7 ${state.status === "locked" ? "opacity-60" : ""}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-white/50">
                  Step {index + 1} · {LEVEL_LABELS[step.level]}
                </p>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${status.className}`}>{status.label}</span>
              </div>
              <h2 className="mt-2 text-2xl font-semibold">{project?.title ?? step.title}</h2>
              <p className="mt-2 text-white/70">{project?.tagline ?? step.topic}</p>
              <p className="mt-3 text-sm leading-relaxed text-white/55">{step.why}</p>
              <ul className="mt-4 flex flex-wrap gap-2" aria-label="Ideas you'll learn">
                {step.concepts.map((concept) => (
                  <li key={concept} className="rounded-full border border-teal-300/30 bg-teal-300/10 px-3 py-1 text-xs text-teal-100">{concept}</li>
                ))}
              </ul>
              {state.outcome && <p className="mt-4 text-sm text-white/65">{OUTCOMES[state.outcome] ?? ""}</p>}
              {state.projectId ? (
                <Link href={`/projects/${state.projectId}`} className="mt-6 inline-flex rounded-full bg-white px-6 py-2.5 text-[15px] font-medium text-black hover:bg-white/85">
                  {state.status === "done" ? "Open it again" : "Open the desktop"}
                </Link>
              ) : state.status === "ready" ? (
                <CreatePathStep pathId={pathId} step={index + 1} />
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
