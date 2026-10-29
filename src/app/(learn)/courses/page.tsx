import { CourseCatalogue } from "@/components/learning/CourseCatalogue";
import { listCourses } from "@/lib/learning/repository";
import { serverDb } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function hasSession() {
  const db = await serverDb();
  if (!db) return false;
  const { data } = await db.auth.getUser();
  return !!data.user;
}

export default async function CoursesPage() {
  const [courses, signedIn] = await Promise.all([listCourses(), hasSession()]);
  return <CourseCatalogue courses={courses} signedIn={signedIn} />;
}
