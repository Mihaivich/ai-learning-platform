import type { SupabaseClient } from "@supabase/supabase-js";
import { HttpError } from "@/lib/supabase/server";
import type { PendingStudent, RosterResult } from "./roster-input";

export async function pendingStudents(db: SupabaseClient, classId: string): Promise<PendingStudent[]> {
  const { data, error } = await db.from("class_invitations").select("email,created_at").eq("class_id", classId).order("email");
  if (error) throw new HttpError(503, "Could not load pending students. Please retry.");
  return data ?? [];
}

export async function importStudents(db: SupabaseClient, classId: string, emails: string[]): Promise<RosterResult[]> {
  const { data, error } = await db.rpc("import_class_roster", { p_class_id: classId, p_emails: emails });
  if (error) {
    if (error.code === "42501") throw new HttpError(403, "You can only import students into your own class.");
    throw new HttpError(503, "Could not import the list. Retry the same list safely; duplicates will not be added.");
  }
  return data ?? [];
}
