import { z } from "zod";
import { enforceQuota } from "@/lib/ai/quota";
import { hasGeminiKey } from "@/lib/ai/gemini";
import { generateProject } from "@/lib/projects/generated/generate";
import { profileSchema, saveProfile } from "@/lib/projects/generated/profile";
import { newGeneratedId, saveGeneratedProject } from "@/lib/projects/generated/store";
import { apiError, HttpError, requireAccount } from "@/lib/supabase/server";

/*
 * Writes a new project with the AI, checks it and saves it for the signed-in
 * user. A generation can take two model attempts plus a repair, so this route
 * may run for a few minutes.
 */
export const maxDuration = 300;

// With a subject the topic may be left out: the model picks a job where the subject matters.
// The field is optional too: the model takes it from the learner's background.
const bodySchema = z
  .object({
    domain: z.string().trim().max(80).default(""),
    topic: z.string().trim().max(200).default(""),
    subject: z.string().trim().max(80).default(""),
    profile: profileSchema.optional(),
  })
  .refine((body) => body.topic.length >= 4 || body.subject.length >= 2);

export async function POST(req: Request) {
  try {
    const { db, user } = await requireAccount();
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      throw new HttpError(400, "Give a subject to learn, or a job (4 to 200 characters).");
    }
    const { domain, topic, subject, profile } = parsed.data;
    if (!hasGeminiKey()) throw new HttpError(503, "Project generation is not available on this server.");
    await enforceQuota(db, user.id, "generation");

    // The profile is saved even if generation fails, so the form remembers it.
    if (profile && !(await saveProfile(db, user.id, profile))) console.warn("Could not save the learner profile");

    const request = {
      domain,
      topic,
      subject: subject || undefined,
      learner: profile?.background || undefined,
      level: subject ? (profile?.level ?? undefined) : undefined,
    };
    const started = Date.now();
    const id = newGeneratedId();
    const result = await generateProject(request, { id });
    if ("error" in result) {
      console.warn("Project generation failed", { error: result.error, problems: result.check?.problems.slice(0, 5) });
      throw new HttpError(502, `${result.error} Try a different topic, or try again later.`);
    }
    await saveGeneratedProject(user.id, { ...request, topic: topic || `Learn ${subject}` }, result);
    console.info("Project generated", { id, model: result.model, attempts: result.attempts, ms: Date.now() - started });
    return Response.json({ id, title: result.draft.title });
  } catch (error) {
    return apiError(error);
  }
}
