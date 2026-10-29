import Link from "next/link";
import { CourseStudio } from "@/components/learning/CourseStudio";
import { LearningPathWizard } from "@/components/learning/LearningPathWizard";

/**
 * Personal learning paths and private drafts. Instructors use Teaching Studio
 * for published teaching courses; students generate paths here with AI.
 */
export default function MyCreationsPage() {
  return (
    <div>
      <div className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-4 px-4 py-6">
          <div>
            <p className="text-sm font-semibold text-indigo-600">My Creations</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
              Personal learning paths
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-stone-600">
              Start with a simple AI wizard, then use Course Studio if you want to edit
              lessons by hand. Paths stay private unless you publish through Teaching
              Studio.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            Back to My Learning
          </Link>
        </div>
      </div>
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
        <LearningPathWizard />
        <div>
          <h2 className="text-lg font-semibold text-stone-900">Course Studio</h2>
          <p className="mt-1 text-sm text-stone-600">
            Advanced editing, invitations and full activity authoring.
          </p>
        </div>
      </div>
      <CourseStudio />
    </div>
  );
}
