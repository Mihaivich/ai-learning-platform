import { z } from "zod";
import { joinClass } from "@/lib/classes";
import { apiError, HttpError, requireAccount } from "@/lib/supabase/server";

/* Joins the signed-in student to the class with this code. */
const bodySchema = z.object({ code: z.string().max(20) });

export async function POST(req: Request) {
  try {
    const { db } = await requireAccount();
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new HttpError(400, "A class code is six letters and numbers.");
    const joined = await joinClass(db, parsed.data.code);
    return Response.json(joined);
  } catch (error) {
    return apiError(error);
  }
}
