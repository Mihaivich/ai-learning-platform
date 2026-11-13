import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { glass } from "@/components/home/glass";
import { Reveal } from "@/components/home/Reveal";
import { TeacherProjectForm } from "@/components/teach/TeacherProjectForm";
import { ASSIGNABLE } from "@/lib/classes";
import { openFeedbackCountsForProjects } from "@/lib/feedback";
import { listOwnGeneratedProjects } from "@/lib/projects/generated/store";
import { instructor } from "@/lib/instructor";

export const metadata: Metadata = { title: "Your projects · DevPath" };

export default async function TeacherProjectsPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const teacher = await instructor();
  if (!teacher) notFound();
  const { from } = await searchParams;
  const own = await listOwnGeneratedProjects(teacher.db, teacher.user.id);
  const openFeedback = await openFeedbackCountsForProjects(
    teacher.db,
    own.map((p) => p.id),
  );
  const bases = [...ASSIGNABLE, ...own.map(({ id, title }) => ({ id, title }))];

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-12 text-white lg:px-0 lg:pt-16">
      <Reveal>
        <Link href="/teach" className="text-sm text-white/50 hover:text-white">← Your classes</Link>
        <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Projects for your classes</h1>
        <p className="mt-4 max-w-2xl text-lg text-white/65">
          Build a project from your own teaching material, or customise an existing one. Every project the AI writes is checked before it&apos;s saved, and you can edit its words and review student feedback afterwards.
        </p>
      </Reveal>

      <div className={`${glass} mt-10 p-7`}>
        <TeacherProjectForm bases={bases} initialBase={bases.some((item) => item.id === from) ? from : undefined} />
      </div>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Your projects</h2>
        {!own.length && <p className="mt-3 text-white/50">None yet. The ones you create appear here.</p>}
        <ul className="mt-4 grid gap-4 md:grid-cols-2">
          {own.map((project) => {
            const issues = openFeedback[project.id] ?? 0;
            return (
              <li key={project.id} className={`${glass} flex flex-col p-6`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-white/45">{project.topic.startsWith("From ") ? "Customised" : project.domain}</p>
                  {issues > 0 && (
                    <span className="rounded-full border border-amber-300/35 bg-amber-400/15 px-2.5 py-0.5 text-xs font-medium text-amber-100">
                      ⚑ {issues} open {issues === 1 ? "report" : "reports"}
                    </span>
                  )}
                </div>
                <h3 className="mt-1 text-lg font-semibold">{project.title}</h3>
                <p className="mt-2 text-sm text-white/60">{project.tagline}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-sm">
                  <Link href={`/teach/projects/${project.id}`} className="rounded-full bg-white px-4 py-1.5 font-medium text-black hover:bg-white/85">
                    Edit{issues > 0 ? ` (${issues})` : ""}
                  </Link>
                  <Link href={`/projects/${project.id}/learn`} className="rounded-full border border-white/20 px-4 py-1.5 hover:border-white/50">
                    Preview Mini-Course
                  </Link>
                  <Link href={`/projects/${project.id}`} className="rounded-full border border-white/20 px-4 py-1.5 hover:border-white/50">
                    Open Desktop
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
