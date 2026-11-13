import type { Metadata } from "next";
import Link from "next/link";
import { glass } from "@/components/home/glass";
import { Reveal } from "@/components/home/Reveal";
import { HourlyUsageChart, QuotaRingGauges } from "@/components/quota/QuotaCharts";
import { CreateClass } from "@/components/teach/CreateClass";
import { loadUserQuotaSummary } from "@/lib/ai/quota";
import { listOwnClasses } from "@/lib/classes";
import { openFeedbackCountsForProjects } from "@/lib/feedback";
import { instructor } from "@/lib/instructor";
import { listOwnGeneratedProjects } from "@/lib/projects/generated/store";
import type { serverDb } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Teach · DevPath" };

export default async function TeachPage() {
  const teacher = await instructor();
  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-12 text-white lg:px-0 lg:pt-16">
      <Reveal>
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">Your classes</h1>
        <p className="mt-4 max-w-2xl text-lg text-white/65">
          Give each class a code, assign courses, set student AI quota caps, and track how every student progresses through concepts and teach-back.
        </p>
      </Reveal>
      {!teacher ? (
        <div className={`${glass} mt-10 p-7 text-white/75`}>
          <p className="text-lg">This page is for instructors.</p>
          <p className="mt-2 text-white/55">Ask an administrator to make your account an instructor. Students join a class with its code on the Courses page.</p>
        </div>
      ) : (
        <TeacherClasses db={teacher.db} ownerId={teacher.user.id} />
      )}
    </div>
  );
}

async function TeacherClasses({ db, ownerId }: { db: NonNullable<Awaited<ReturnType<typeof serverDb>>>; ownerId: string }) {
  const [classes, quotaSummary, ownProjects] = await Promise.all([
    listOwnClasses(db, ownerId),
    loadUserQuotaSummary(db, ownerId),
    listOwnGeneratedProjects(db, ownerId),
  ]);
  const feedbackCounts = await openFeedbackCountsForProjects(
    db,
    ownProjects.map((p) => p.id),
  );
  const totalOpenFeedback = Object.values(feedbackCounts).reduce((a, b) => a + b, 0);

  return (
    <>
      {totalOpenFeedback > 0 && (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300/35 bg-amber-400/10 px-5 py-4 text-sm text-amber-100">
          <span>
            ⚑ Your courses have <span className="font-semibold text-white">{totalOpenFeedback}</span> open student content or diagram{" "}
            {totalOpenFeedback === 1 ? "report" : "reports"}.
          </span>
          <Link href="/teach/projects" className="rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-black hover:bg-white/85">
            Review in Your Projects →
          </Link>
        </div>
      )}

      <div className={`${glass} mt-8 p-7`}>
        <CreateClass />
      </div>
      <p className="mt-4 text-white/60">
        Want a project of your own?{" "}
        <Link href="/teach/projects" className="text-white underline hover:text-cyan-200">
          Create one from your teaching material, or customise an existing one.
        </Link>
      </p>

      <ul className="mt-8 grid gap-4 md:grid-cols-2">
        {classes.map((item) => {
          const customGen = item.quotas.generation !== null ? `${item.quotas.generation}/hr gen cap` : "Default student quota";
          return (
            <li key={item.id}>
              <Link href={`/teach/${item.id}`} className={`${glass} block p-6 transition hover:border-white/40`}>
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-xl font-semibold">{item.name}</h2>
                  <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[11px] text-cyan-200/85">
                    {customGen}
                  </span>
                </div>
                <p className="mt-2 text-sm text-white/55">
                  {item.students} {item.students === 1 ? "student" : "students"} · code{" "}
                  <span className="font-mono text-white/80">{item.join_code}</span>
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
      {!classes.length && <p className="mt-6 text-white/50">No classes yet. Create one, then share its code with your students.</p>}

      <section className="mt-14 space-y-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Your instructor AI quota</h2>
          <p className="mt-1 text-sm text-white/55">
            Your personal allowance for authoring courses from syllabus material, remixing scenarios, and previewing runs. Configure per-student caps inside each class page.
          </p>
        </div>
        <QuotaRingGauges buckets={quotaSummary.buckets} resetMinutes={quotaSummary.resetMinutes} />
        <HourlyUsageChart hourly={quotaSummary.hourly} title="Your AI authoring & preview requests (last 24h)" />
      </section>
    </>
  );
}
