import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FeedbackInbox } from "@/components/feedback/FeedbackInbox";
import { Reveal } from "@/components/home/Reveal";
import { ProjectEditor } from "@/components/teach/ProjectEditor";
import { listProjectFeedbackForOwner } from "@/lib/feedback";
import { editableOf } from "@/lib/projects/generated/edit";
import { loadOwnDraft } from "@/lib/projects/generated/store";
import { instructor } from "@/lib/instructor";

export const metadata: Metadata = { title: "Edit project · DevPath" };

export default async function EditProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const teacher = await instructor();
  if (!teacher) notFound();
  const draft = await loadOwnDraft(projectId, teacher.user.id);
  if (!draft) notFound();
  const feedback = await listProjectFeedbackForOwner(teacher.db, projectId, draft.title);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-12 text-white lg:px-0 lg:pt-16">
      <Reveal>
        <Link href="/teach/projects" className="text-sm text-white/50 hover:text-white">← Projects for your classes</Link>
        <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">{draft.title}</h1>
        <p className="mt-4 text-white/65">
          {draft.client.name}, {draft.client.role} at {draft.client.organisation}. {draft.assistant.name} is the AI teammate.
        </p>
        <div className="mt-5 flex flex-wrap gap-3 text-sm">
          <Link href={`/projects/${projectId}/learn`} className="rounded-full border border-white/20 px-4 py-2 hover:border-white/50">
            Preview 3-Act Mini-Course
          </Link>
          <Link href={`/projects/${projectId}`} className="rounded-full border border-white/20 px-4 py-2 hover:border-white/50">
            Try Desktop as a student
          </Link>
          <Link href={`/teach/projects?from=${projectId}`} className="rounded-full border border-white/20 px-4 py-2 hover:border-white/50">
            Revise with the AI (names, setting, anything)
          </Link>
        </div>
      </Reveal>

      <section className="mt-10 space-y-3">
        <h2 className="text-xl font-semibold">Student Content &amp; Diagram Feedback</h2>
        <FeedbackInbox
          initialItems={feedback}
          emptyText="No students have flagged content or diagram issues on this project."
        />
      </section>

      <div className="mt-12">
        <ProjectEditor projectId={projectId} initial={editableOf(draft)} />
      </div>
    </div>
  );
}
