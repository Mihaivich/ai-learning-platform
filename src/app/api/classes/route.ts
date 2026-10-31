import { z } from "zod";
import { createClass } from "@/lib/classes";
import { apiError, HttpError, requireAccount } from "@/lib/supabase/server";

/* Creates a class for the signed-in instructor, with a new join code. */
const bodySchema = z.object({ name: z.string().trim().min(1).max(80) });

export async function POST(req: Request) {
  try {
    const { db, user } = await requireAccount(true);
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new HttpError(400, "Give the class a name (up to 80 characters).");
    const row = await createClass(db, user.id, parsed.data.name);
    return Response.json({ id: row.id, joinCode: row.join_code });
  } catch (error) {
    return apiError(error);
  }
}
