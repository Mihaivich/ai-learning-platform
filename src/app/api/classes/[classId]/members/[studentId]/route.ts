import { loadOwnClass } from "@/lib/classes";
import { apiError, HttpError, requireAccount } from "@/lib/supabase/server";

/* Removes a student from the instructor's class. Their runs are kept. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ classId: string; studentId: string }> }) {
  try {
    const { classId, studentId } = await params;
    const { db, user } = await requireAccount(true);
    const owned = await loadOwnClass(db, user.id, classId);
    if (!owned) throw new HttpError(404, "That class doesn't exist.");
    if (!owned.members.some((member) => member.student_id === studentId)) throw new HttpError(404, "That student isn't in this class.");
    const { error } = await db.from("class_members").delete().eq("class_id", classId).eq("student_id", studentId);
    if (error) throw new HttpError(503, "Could not remove the student. Please retry.");
    return Response.json({ removed: studentId });
  } catch (error) {
    return apiError(error);
  }
}
