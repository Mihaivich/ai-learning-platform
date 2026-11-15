import { NextResponse } from "next/server";
import { createFeedback, submitFeedbackSchema } from "@/lib/feedback";
import { apiError, HttpError, serverDb } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const db = await serverDb();
    if (!db) throw new HttpError(503, "Configure Supabase first.");
    const { data: auth, error: authError } = await db.auth.getUser();
    if (authError || !auth.user) throw new HttpError(401, "Sign in to submit feedback.");

    const body = await request.json().catch(() => null);
    const parsed = submitFeedbackSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid feedback submission.");
    }

    const created = await createFeedback(db, auth.user.id, parsed.data);
    return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
