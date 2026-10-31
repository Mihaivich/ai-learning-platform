import { redirect } from "next/navigation";
import { serverDb } from "@/lib/supabase/server";

/** The signed-in instructor, or null for a student. Redirects when signed out. */
export async function instructor() {
  const db = await serverDb();
  const { data } = (await db?.auth.getUser()) ?? { data: { user: null } };
  if (!db || !data.user) redirect("/login");
  const { data: profile } = await db.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  return ["instructor", "admin"].includes(profile?.role ?? "") ? { db, user: data.user } : null;
}
