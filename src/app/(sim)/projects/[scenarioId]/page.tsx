import { notFound } from "next/navigation";
import { Desktop } from "@/components/projects/desktop/Desktop";
import { getProjectScenario } from "@/lib/projects";
import { isGeneratedId } from "@/lib/projects/generated/store";
import { serverDb } from "@/lib/supabase/server";

/** Public framing for the desktop. The run itself, and anything hidden, comes from the API. */
async function framing(scenarioId: string) {
  const builtIn = getProjectScenario(scenarioId);
  if (builtIn) return { title: builtIn.title, summary: builtIn.summary };
  if (!isGeneratedId(scenarioId)) return null;
  const db = await serverDb();
  const { data: auth } = (await db?.auth.getUser()) ?? { data: { user: null } };
  // Signed out: the desktop asks the visitor to sign in before anything is loaded.
  if (!db || !auth.user) return { title: "Your project", summary: "Sign in to open a project you created." };
  // Row-level security returns only the owner's own projects, and only their listing columns.
  const { data } = await db.from("generated_projects").select("title,summary").eq("id", scenarioId).maybeSingle();
  return data ? { title: data.title as string, summary: data.summary as string } : null;
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ scenarioId: string }>;
}) {
  const { scenarioId } = await params;
  const shown = await framing(scenarioId);
  if (!shown) notFound();
  return <Desktop scenarioId={scenarioId} title={shown.title} summary={shown.summary} />;
}
