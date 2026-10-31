import { z } from "zod";
import { enforceQuota } from "@/lib/ai/quota";
import { hasGeminiKey } from "@/lib/ai/gemini";
import { planPath, savePath } from "@/lib/projects/generated/path";
import { profileSchema, saveProfile } from "@/lib/projects/generated/profile";
import { apiError, HttpError, requireAccount } from "@/lib/supabase/server";

/* Plans a learning path for the signed-in user. Its projects are generated later, one step at a time. */
export const maxDuration = 120;

const bodySchema = z.object({
  subject: z.string().trim().min(2).max(80),
  domain: z.string().trim().max(80).default(""),
  profile: profileSchema.optional(),
});

export async function POST(req: Request) {
  try {
    const { db, user } = await requireAccount();
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new HttpError(400, "Give a subject to learn (2 to 80 characters).");
    if (!hasGeminiKey()) throw new HttpError(503, "Learning paths are not available on this server.");
    const { subject, domain, profile } = parsed.data;
    if (profile && !(await saveProfile(db, user.id, profile))) console.warn("Could not save the learner profile");
    await enforceQuota(db, user.id, "generation");

    const request = { subject, domain, learner: profile?.background || undefined, level: profile?.level ?? undefined };
    const result = await planPath(request);
    if ("error" in result) {
      console.warn("Path planning failed", { error: result.error, problems: result.problems?.slice(0, 5) });
      throw new HttpError(502, `${result.error} Try again in a minute.`);
    }
    const id = await savePath(user.id, request, result.plan, result.model);
    console.info("Path planned", { id, model: result.model });
    return Response.json({ id });
  } catch (error) {
    return apiError(error);
  }
}
