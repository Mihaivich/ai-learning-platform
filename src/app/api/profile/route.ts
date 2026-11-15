import { NextResponse } from "next/server";
import {
  accountProfileSchema,
  readAccountProfile,
  saveAccountProfile,
} from "@/lib/projects/generated/profile";
import { apiError, HttpError, serverDb } from "@/lib/supabase/server";

export async function GET() {
  try {
    const db = await serverDb();
    if (!db) throw new HttpError(503, "Configure Supabase first.");
    const { data: auth, error } = await db.auth.getUser();
    if (error || !auth.user) throw new HttpError(401, "Sign in to view your profile.");

    const { data: row, error: profileError } = await db
      .from("profiles")
      .select("display_name,role,background,experience")
      .eq("id", auth.user.id)
      .maybeSingle();

    if (profileError) throw new HttpError(503, "Could not load your profile.");
    const account = readAccountProfile(row);
    return NextResponse.json({
      email: auth.user.email ?? null,
      role: (row?.role as string | undefined) ?? "student",
      ...account,
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const db = await serverDb();
    if (!db) throw new HttpError(503, "Configure Supabase first.");
    const { data: auth, error } = await db.auth.getUser();
    if (error || !auth.user) throw new HttpError(401, "Sign in to update your profile.");

    const body = await request.json().catch(() => null);
    const parsed = accountProfileSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid profile values.");
    }

    const ok = await saveAccountProfile(db, auth.user.id, parsed.data);
    if (!ok) throw new HttpError(503, "Could not save your profile. Please retry.");

    return NextResponse.json({ ok: true, profile: parsed.data });
  } catch (error) {
    return apiError(error);
  }
}
