import { z } from "zod";
import { setGeneratedProjectPublic } from "@/lib/projects/generated/store";
import { apiError, HttpError, requireAccount } from "@/lib/supabase/server";

const bodySchema = z.object({
  isPublic: z.boolean(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { user } = await requireAccount();
    const { projectId } = await params;
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new HttpError(400, "Specify isPublic as true or false.");
    const updated = await setGeneratedProjectPublic(projectId, user.id, parsed.data.isPublic);
    return Response.json(updated);
  } catch (error) {
    return apiError(error);
  }
}
