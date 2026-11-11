import { z } from "zod";
import { enforceQuota } from "@/lib/ai/quota";
import { hasGeminiKey } from "@/lib/ai/gemini";
import { BUILT_IN_DRAFTS } from "@/lib/projects";
import { generateProject, MAX_INSTRUCTIONS, type ProjectRequest } from "@/lib/projects/generated/generate";
import { profileSchema, saveProfile } from "@/lib/projects/generated/profile";
import { loadRemixableGeneratedDraft, newGeneratedId, saveGeneratedProject } from "@/lib/projects/generated/store";
import { apiError, HttpError, requireAccount } from "@/lib/supabase/server";

/*
 * Writes a new mini-course & simulation with the AI (either from scratch or by
 * remixing an existing built-in / community course into the learner's own field),
 * checks every path, and saves it for the signed-in user.
 */
export const maxDuration = 300;

const bodySchema = z
  .object({
    domain: z.string().trim().max(80).default(""),
    topic: z.string().trim().max(200).default(""),
    subject: z.string().trim().max(80).default(""),
    remixBase: z.string().trim().max(64).default(""),
    instructions: z.string().trim().max(MAX_INSTRUCTIONS).default(""),
    profile: profileSchema.optional(),
  })
  .refine((body) => Boolean(body.remixBase) || body.topic.length >= 4 || body.subject.length >= 2);

export async function POST(req: Request) {
  try {
    const { db, user } = await requireAccount();
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      throw new HttpError(400, "Give a subject to learn, a job (4 to 200 characters), or choose a course to remix.");
    }
    const { domain, topic, subject, remixBase, instructions, profile } = parsed.data;
    if (!hasGeminiKey()) throw new HttpError(503, "Project generation is not available on this server.");

    if (profile && !(await saveProfile(db, user.id, profile))) console.warn("Could not save the learner profile");

    let request: ProjectRequest;
    let savedTopic: string;

    if (remixBase) {
      const base = BUILT_IN_DRAFTS[remixBase] ?? (await loadRemixableGeneratedDraft(remixBase, user.id));
      if (!base) throw new HttpError(404, "The course you want to remix could not be found.");
      const remixInstructions = [
        instructions,
        profile?.background ? `Set the new scenario in the world of ${profile.background}.` : "",
        subject ? `Focus the core concepts on ${subject}.` : "",
      ]
        .filter(Boolean)
        .join(" ")
        .trim() || "Create a fresh scenario in a new organisation teaching the same underlying ideas with different details.";

      request = {
        domain: domain || base.domain,
        topic: "",
        subject: subject || undefined,
        learner: profile?.background || undefined,
        level: profile?.level ?? undefined,
        base,
        instructions: remixInstructions.slice(0, MAX_INSTRUCTIONS),
      };
      savedTopic = `Remix of ${base.title}: ${remixInstructions}`.slice(0, 200);
    } else {
      request = {
        domain,
        topic,
        subject: subject || undefined,
        learner: profile?.background || undefined,
        level: subject ? (profile?.level ?? undefined) : undefined,
      };
      savedTopic = (topic || `Learn ${subject}`).slice(0, 200);
    }

    await enforceQuota(db, user.id, "generation");

    const started = Date.now();
    const id = newGeneratedId();
    const result = await generateProject(request, { id });
    if ("error" in result) {
      console.warn("Project generation failed", { error: result.error, problems: result.check?.problems.slice(0, 5) });
      throw new HttpError(502, `${result.error} Try a different topic, or try again later.`);
    }
    await saveGeneratedProject(user.id, { ...request, topic: savedTopic }, result);
    console.info("Project generated", { id, remix: Boolean(remixBase), model: result.model, attempts: result.attempts, ms: Date.now() - started });
    return Response.json({ id, title: result.draft.title });
  } catch (error) {
    return apiError(error);
  }
}
