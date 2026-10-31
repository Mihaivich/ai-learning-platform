import { z } from "zod";
import { enforceQuota } from "@/lib/ai/quota";
import { hasGeminiKey } from "@/lib/ai/gemini";
import { generateProject } from "@/lib/projects/generated/generate";
import { newGeneratedId, saveGeneratedProject } from "@/lib/projects/generated/store";
import { apiError, HttpError, requireAccount } from "@/lib/supabase/server";

/*
 * Writes a new project with the AI, checks it and saves it for the signed-in
 * user. A generation can take two model attempts plus a repair, so this route
 * may run for a few minutes.
 */
export const maxDuration = 300;

const bodySchema = z.object({
  domain: z.string().trim().min(2).max(80),
  topic: z.string().trim().min(4).max(200),
});

export async function POST(req: Request) {
  try {
    const { db, user } = await requireAccount();
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new HttpError(400, "Give a field (2 to 80 characters) and a topic (4 to 200 characters).");
    if (!hasGeminiKey()) throw new HttpError(503, "Project generation is not available on this server.");
    await enforceQuota(db, user.id, "generation");

    const started = Date.now();
    const id = newGeneratedId();
    const result = await generateProject(parsed.data, { id });
    if ("error" in result) {
      console.warn("Project generation failed", { error: result.error, problems: result.check?.problems.slice(0, 5) });
      throw new HttpError(502, `${result.error} Try a different topic, or try again later.`);
    }
    await saveGeneratedProject(user.id, parsed.data, result);
    console.info("Project generated", { id, model: result.model, attempts: result.attempts, ms: Date.now() - started });
    return Response.json({ id, title: result.draft.title });
  } catch (error) {
    return apiError(error);
  }
}
