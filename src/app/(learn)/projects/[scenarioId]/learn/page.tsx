import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { glass } from "@/components/home/glass";
import { MiniCourseStudio } from "@/components/projects/minicourse/MiniCourseStudio";
import { getProjectScenario, loadProjectScenario } from "@/lib/projects";
import { isGeneratedId, loadPlayableListing } from "@/lib/projects/generated/store";
import { buildMiniCourse } from "@/lib/projects/minicourse";
import { serverDb } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Mini-Course Studio · DevPath" };

export default async function MiniCoursePage({
  params,
}: {
  params: Promise<{ scenarioId: string }>;
}) {
  const { scenarioId } = await params;

  const builtIn = getProjectScenario(scenarioId);
  if (builtIn) {
    return <MiniCourseStudio course={buildMiniCourse(builtIn)} backHref="/projects" backLabel="All mini-courses" />;
  }

  if (!isGeneratedId(scenarioId)) notFound();

  const db = await serverDb();
  const { data: auth } = (await db?.auth.getUser()) ?? { data: { user: null } };
  const userId = auth.user?.id ?? "";

  // Supports public community gallery courses even when signed out, plus own/class courses when signed in.
  const scenario = await loadProjectScenario(scenarioId, userId);
  if (!scenario) {
    if (!auth.user) {
      return (
        <div className="mx-auto max-w-2xl px-4 pb-24 pt-16 text-white">
          <div className={`${glass} p-8`}>
            <h1 className="text-2xl font-bold">Sign in to open this mini-course</h1>
            <p className="mt-2 text-white/65">Private or class-assigned mini-courses require your account.</p>
            <Link href="/login" className="mt-6 inline-flex rounded-full bg-white px-7 py-3 text-sm font-medium text-black hover:bg-white/85">
              Sign in
            </Link>
          </div>
        </div>
      );
    }
    notFound();
  }

  const listing = userId ? await loadPlayableListing(scenarioId, userId) : null;
  const backHref = listing?.pathId ? `/paths/${listing.pathId}` : "/projects";
  const backLabel = listing?.pathId ? "Back to learning path" : "All mini-courses";

  return <MiniCourseStudio course={buildMiniCourse(scenario)} backHref={backHref} backLabel={backLabel} />;
}
