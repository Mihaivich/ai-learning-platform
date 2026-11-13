import { NextResponse } from "next/server";
import { loadUserQuotaSummary } from "@/lib/ai/quota";
import { apiError, HttpError, serverDb } from "@/lib/supabase/server";

export async function GET() {
  try {
    const db = await serverDb();
    if (!db) throw new HttpError(503, "Configure Supabase first.");
    const { data: auth, error } = await db.auth.getUser();
    if (error || !auth.user) throw new HttpError(401, "Sign in to view your AI quota.");

    const summary = await loadUserQuotaSummary(db, auth.user.id);
    return NextResponse.json(summary);
  } catch (error) {
    return apiError(error);
  }
}
