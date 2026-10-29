import { apiError, requireAccount } from "@/lib/supabase/server";

/** Own learning evidence for the student Feedback History panel. */
export async function GET() {
  try {
    const { db, user } = await requireAccount();
    const { data, error } = await db
      .from("learning_attempts")
      .select(
        "id, course_id, lesson_id, activity_id, score, feedback, response, created_at",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(40);
    if (error) throw error;
    return Response.json(data ?? []);
  } catch (e) {
    return apiError(e);
  }
}
