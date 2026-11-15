import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { glass } from "@/components/home/glass";
import { MiniCourseStudio } from "@/components/projects/minicourse/MiniCourseStudio";
import { getProjectScenario, loadProjectScenario } from "@/lib/projects";
import { isGeneratedId, loadPlayableListing } from "@/lib/projects/generated/store";
import { buildMiniCourse } from "@/lib/projects/minicourse";
import { serverDb } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Concept Diagrams & Practice · DevPath" };

async function hasCompletedOrCanBypass(
  db: NonNullable<Awaited<ReturnType<typeof serverDb>>> | null,
  userId: string,
  scenarioId: string,
  isOwner = false,
): Promise<boolean> {
  if (isOwner) return true;
  if (!db || !userId) return false;

  const [{ data: profile }, { data: completed }] = await Promise.all([
    db.from("profiles").select("role").eq("id", userId).maybeSingle(),
    db
      .from("simulation_sessions")
      .select("id")
      .eq("user_id", userId)
      .eq("course_id", `project:${scenarioId}`)
      .eq("status", "completed")
      .limit(1),
  ]);

  const role = profile?.role;
  if (role === "instructor" || role === "admin") return true;
  return Boolean(completed?.length);
}

export default async function ProjectLearnPage({
  params,
}: {
  params: Promise<{ scenarioId: string }>;
}) {
  const { scenarioId } = await params;

  const db = await serverDb();
  const { data: auth } = (await db?.auth.getUser()) ?? { data: { user: null } };
  const userId = auth.user?.id ?? "";

  const builtIn = getProjectScenario(scenarioId);
  if (builtIn) {
    const unlockedByServer = await hasCompletedOrCanBypass(db, userId, scenarioId, false);
    return (
      <MiniCourseStudio
        course={buildMiniCourse(builtIn)}
        unlockedByServer={unlockedByServer}
        backHref="/projects"
        backLabel="All projects"
      />
    );
  }

  if (!isGeneratedId(scenarioId)) notFound();

  if (!db || !auth.user) {
    return (
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-16 text-white">
        <div className={`${glass} p-8`}>
          <h1 className="text-2xl font-bold">Sign in to open concept diagrams</h1>
          <p className="mt-2 text-white/65">Private or class-assigned projects require your account.</p>
          <Link href="/login" className="mt-6 inline-flex rounded-full bg-white px-7 py-3 text-sm font-medium text-black hover:bg-white/85">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  const [scenario, listing] = await Promise.all([
    loadProjectScenario(scenarioId, userId),
    loadPlayableListing(scenarioId, userId),
  ]);
  if (!scenario) notFound();

  const unlockedByServer = await hasCompletedOrCanBypass(db, userId, scenarioId, Boolean(listing?.own));
  const backHref = listing?.pathId ? `/paths/${listing.pathId}` : "/projects";
  const backLabel = listing?.pathId ? "Back to your path" : "All projects";

  return (
    <MiniCourseStudio
      course={buildMiniCourse(scenario)}
      unlockedByServer={unlockedByServer}
      backHref={backHref}
      backLabel={backLabel}
    />
  );
}
