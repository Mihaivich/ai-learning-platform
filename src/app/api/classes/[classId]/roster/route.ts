import { z } from "zod";
import { loadOwnClass } from "@/lib/classes";
import { importStudents } from "@/lib/class-roster";
import { MAX_ROSTER_TEXT, parseRoster, rosterEmail } from "@/lib/roster-input";
import { apiError, HttpError, requireAccount } from "@/lib/supabase/server";

const input = z.object({ text: z.string().max(MAX_ROSTER_TEXT), format: z.enum(["csv", "emails"]) });

export async function POST(req: Request, { params }: { params: Promise<{ classId: string }> }) {
  try {
    const { classId } = await params;
    const { db, user } = await requireAccount(true);
    if (!(await loadOwnClass(db, user.id, classId))) throw new HttpError(404, "That class doesn't exist.");
    const parsed = input.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new HttpError(400, "Provide a CSV or email list of at most 100,000 characters.");
    let preview;
    try { preview = parseRoster(parsed.data.text, parsed.data.format); }
    catch (error) { throw new HttpError(400, (error as Error).message); }
    if (!preview.emails.length) throw new HttpError(400, "There are no valid email addresses to import.");
    const results = await importStudents(db, classId, preview.emails);
    return Response.json({ results, skipped: preview.invalid.length, duplicates: preview.duplicates });
  } catch (error) { return apiError(error); }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ classId: string }> }) {
  try {
    const { classId } = await params;
    const { db, user } = await requireAccount(true);
    if (!(await loadOwnClass(db, user.id, classId))) throw new HttpError(404, "That class doesn't exist.");
    const body = await req.json().catch(() => null);
    const email = typeof body?.email === "string" ? rosterEmail(body.email) : null;
    if (!email) throw new HttpError(400, "Provide a valid email address.");
    const { error } = await db.from("class_invitations").delete().eq("class_id", classId).eq("email", email);
    if (error) throw new HttpError(503, "Could not cancel the pending entry. Please retry.");
    return Response.json({ cancelled: email });
  } catch (error) { return apiError(error); }
}
