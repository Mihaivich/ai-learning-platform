import { NextResponse } from "next/server";
import { resolveFeedbackItem, resolveFeedbackSchema } from "@/lib/feedback";
import { apiError, HttpError, serverDb } from "@/lib/supabase/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ feedbackId: string }> },
) {
  try {
    const { feedbackId } = await params;
    const db = await serverDb();
    if (!db) throw new HttpError(503, "Configure Supabase first.");
    const { data: auth, error: authError } = await db.auth.getUser();
    if (authError || !auth.user) throw new HttpError(401, "Sign in to continue.");

    const body = await request.json().catch(() => null);
    const parsed = resolveFeedbackSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid status update.");
    }

    const updated = await resolveFeedbackItem(db, auth.user.id, feedbackId, parsed.data);
    return NextResponse.json({ ok: true, feedback: updated });
  } catch (error) {
    return apiError(error);
  }
}
