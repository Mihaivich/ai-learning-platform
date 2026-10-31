import { z } from "zod";
import { enforceQuota } from "@/lib/ai/quota";
import { hasGeminiKey } from "@/lib/ai/gemini";
import { generateProject } from "@/lib/projects/generated/generate";
import { loadOwnPath, pathProgress } from "@/lib/projects/generated/path";
import { readProfile } from "@/lib/projects/generated/profile";
import { newGeneratedId, saveGeneratedProject } from "@/lib/projects/generated/store";
import { apiError, HttpError, requireAccount } from "@/lib/supabase/server";

/*
 * Generates the project for the next step of a learning path. A step opens
 * once the one before is finished, so a path never spends a generation on a
 * step nobody reached.
 */
export const maxDuration = 300;

const bodySchema = z.object({ step: z.number().int().min(1).max(5) });

export async function POST(req: Request, { params }: { params: Promise<{ pathId: string }> }) {
  try {
    const { db, user } = await requireAccount();
    const { pathId } = await params;
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new HttpError(400, "Say which step to create.");
    if (!hasGeminiKey()) throw new HttpError(503, "Project generation is not available on this server.");

    const path = await loadOwnPath(pathId, user.id);
    if (!path) throw new HttpError(404, "Path not found.");
    const { step } = parsed.data;
    const planned = path.plan.steps[step - 1];
    if (!planned) throw new HttpError(404, "That step isn't in this path.");
    const progress = await pathProgress(db, path.id, path.plan.steps.length);
    const status = progress[step - 1].status;
    if (status === "locked") throw new HttpError(409, "Finish the step before this one first.");
    if (status !== "ready") throw new HttpError(409, "This step already has a project. Reload the page.");
    await enforceQuota(db, user.id, "generation");

    const { data: row } = await db.from("profiles").select("background,experience").eq("id", user.id).maybeSingle();
    const profile = readProfile(row);
    const request = {
      domain: path.domain,
      topic: planned.topic,
      subject: path.subject,
      learner: profile.background || undefined,
      level: planned.level,
      concepts: planned.concepts,
      avoid: path.plan.steps.slice(0, step - 1).flatMap((item) => item.concepts),
    };
    const started = Date.now();
    const id = newGeneratedId();
    const result = await generateProject(request, { id });
    if ("error" in result) {
      console.warn("Path step generation failed", { pathId, step, error: result.error, problems: result.check?.problems.slice(0, 5) });
      throw new HttpError(502, `${result.error} Try again in a minute.`);
    }
    await saveGeneratedProject(user.id, request, result, { id: path.id, step });
    console.info("Path step generated", { pathId, step, id, model: result.model, attempts: result.attempts, ms: Date.now() - started });
    return Response.json({ id, title: result.draft.title });
  } catch (error) {
    return apiError(error);
  }
}
