import type { Metadata } from "next";
import { Reveal } from "@/components/home/Reveal";
import { CreateProject } from "@/components/projects/CreateProject";
import { getProjectScenario } from "@/lib/projects";
import { isGeneratedId, loadPublicOrOwnSummary } from "@/lib/projects/generated/store";
import { serverDb } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Create or Remix a Mini-Course · DevPath" };

async function resolveRemixTarget(remixId?: string) {
  if (!remixId) return null;
  const builtIn = getProjectScenario(remixId);
  if (builtIn) {
    return { id: builtIn.id, title: builtIn.title, domain: builtIn.domain ?? "general" };
  }
  if (!isGeneratedId(remixId)) return null;
  const db = await serverDb();
  const { data: auth } = (await db?.auth.getUser()) ?? { data: { user: null } };
  const summary = await loadPublicOrOwnSummary(remixId, auth.user?.id ?? "");
  return summary ? { id: summary.id, title: summary.title, domain: summary.domain } : null;
}

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ remix?: string }>;
}) {
  const { remix } = await searchParams;
  const remixTarget = await resolveRemixTarget(remix);

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-12 text-white lg:px-0 lg:pt-16">
      <Reveal>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          {remixTarget ? "Remix a mini-course" : "Create a mini-course"}
        </h1>
        <p className="mt-4 text-lg text-white/65">
          {remixTarget
            ? `Adapt “${remixTarget.title}” into your own discipline, workplace, or study topic. The AI rewrites the client, data/document/protocol artifact, primer cards, and live Viva—then verifies every branch.`
            : "Pick any discipline—from clinical statistics, law, and behavioural economics to lab chemistry or software. The AI builds an interactive 3-act mini-course (visual concept simulator, trap mini-game, and click-first simulated desktop mission) tailored to your level."}
        </p>
      </Reveal>
      <div className="mt-10">
        <CreateProject remixTarget={remixTarget} />
      </div>
    </div>
  );
}
