import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { HttpError, recordDb, redactSecrets, serverDb } from "@/lib/supabase/server";

/*
 * The administrator's side: every account and its role, and how the platform
 * is being used. An admin can make an account an instructor or a student
 * again; making an admin is left to the SQL editor, and nobody changes their
 * own role. Reads and the role change use the service role, after the
 * signed-in user's own profile shows they are an admin.
 */

export const ASSIGNABLE_ROLES = ["student", "instructor"] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

/** Why a role change isn't allowed, or null when it is. */
export function roleChangeProblem(actorId: string, target: { id: string; role: string } | null, role: string): string | null {
  if (!ASSIGNABLE_ROLES.includes(role as AssignableRole)) return "A role is student or instructor.";
  if (!target) return "That account doesn't exist.";
  if (target.id === actorId) return "You can't change your own role.";
  if (target.role === "admin") return "Administrators are changed in the SQL editor.";
  return null;
}

async function roleOf(userId: string) {
  const db = await serverDb();
  const { data } = (await db?.from("profiles").select("role").eq("id", userId).maybeSingle()) ?? { data: null };
  return (data?.role as string | undefined) ?? null;
}

/** For pages: the signed-in admin, or null for anyone else. Redirects when signed out. */
export async function admin() {
  const db = await serverDb();
  const { data } = (await db?.auth.getUser()) ?? { data: { user: null } };
  if (!db || !data.user) redirect("/login");
  return (await roleOf(data.user.id)) === "admin" ? data.user : null;
}

/** For API routes: the signed-in admin, or an error. */
export async function requireAdmin() {
  const db = await serverDb();
  if (!db) throw new HttpError(503, "Configure Supabase first.");
  const { data, error } = await db.auth.getUser();
  if (error || !data.user) throw new HttpError(401, "Sign in to continue.");
  if ((await roleOf(data.user.id)) !== "admin") throw new HttpError(403, "Administrator access required.");
  return data.user;
}

export type AdminUser = {
  id: string;
  email: string | null;
  role: string;
  createdAt: string;
  lastSignIn: string | null;
  runs: number;
  classesTaught: number;
};

const PAGE_SIZE = 500;

function readFailure(message: string, error?: { message: string } | null): never {
  if (error) console.error("Admin read failed", { message: redactSecrets(error.message) });
  throw new HttpError(503, message);
}

/** Stable ordering is supplied by each query, including a unique tie-breaker. */
async function readPages<T>(
  query: (start: number, end: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  message: string,
): Promise<T[]> {
  const rows: T[] = [];
  for (let start = 0; ; start += PAGE_SIZE) {
    const { data, error } = await query(start, start + PAGE_SIZE - 1);
    if (error || !data) readFailure(message, error);
    rows.push(...data);
    if (data.length < PAGE_SIZE) return rows;
  }
}

function counts(ids: string[]) {
  const result = new Map<string, number>();
  for (const id of ids) result.set(id, (result.get(id) ?? 0) + 1);
  return result;
}

export async function listUsers(): Promise<AdminUser[]> {
  const service = recordDb();
  const message = "Could not load the accounts. Please retry.";
  async function accounts() {
    const users: User[] = [];
    for (let page = 1; ; page++) {
      const { data, error } = await service.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
      if (error || !data?.users) readFailure(message, error);
      users.push(...data.users);
      if (data.users.length < PAGE_SIZE) return users;
    }
  }
  const [users, profiles, runs, classes] = await Promise.all([
    accounts(),
    readPages<{ id: string; role: string }>((start, end) => service.from("profiles").select("id,role").order("id").range(start, end), message),
    readPages<{ user_id: string }>((start, end) => service.from("simulation_sessions").select("user_id").like("course_id", "project:%").order("id").range(start, end), message),
    readPages<{ owner_id: string }>((start, end) => service.from("classes").select("owner_id").order("id").range(start, end), message),
  ]);
  const roles = new Map(profiles.map((row) => [row.id, row.role]));
  const runCounts = counts(runs.map((row) => row.user_id));
  const classCounts = counts(classes.map((row) => row.owner_id));
  return users.map((user) => ({
    id: user.id,
    email: user.email ?? null,
    role: roles.get(user.id) ?? "student",
    createdAt: user.created_at,
    lastSignIn: user.last_sign_in_at ?? null,
    runs: runCounts.get(user.id) ?? 0,
    classesTaught: classCounts.get(user.id) ?? 0,
  })).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Sets a student's or instructor's role. The caller is an admin (requireAdmin). */
export async function setRole(actorId: string, targetId: string, role: string) {
  const service = recordDb();
  const { data: target } = await service.from("profiles").select("id,role").eq("id", targetId).maybeSingle();
  const problem = roleChangeProblem(actorId, target as { id: string; role: string } | null, role);
  if (problem) throw new HttpError(problem.includes("doesn't exist") ? 404 : 400, problem);
  const { error } = await service.from("profiles").update({ role, updated_at: new Date().toISOString() }).eq("id", targetId);
  if (error) {
    console.error("role change failed", { code: error.code, message: redactSecrets(error.message) });
    throw new HttpError(503, "Could not change the role. Please retry.");
  }
  console.info("Role changed", { by: actorId, user: targetId, role });
}

export type Overview = {
  users: { total: number; instructors: number; admins: number };
  classes: number;
  runs: { total: number; completed: number; successful: number };
  generatedProjects: number;
  /** AI requests in the last 24 hours, by what they were for. */
  aiLastDay: { roleplay: number; feedback: number; generation: number };
};

export async function overview(): Promise<Overview> {
  const service = recordDb();
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const head = { count: "exact" as const, head: true };
  const message = "Could not load the overview. Please retry.";
  async function exactCount(query: PromiseLike<{ count: number | null; error: { message: string } | null }>) {
    const { count, error } = await query;
    if (error || count === null) readFailure(message, error);
    return count;
  }
  const [total, instructors, admins, classes, runs, completed, successful, generated, usage] = await Promise.all([
    exactCount(service.from("profiles").select("id", head)),
    exactCount(service.from("profiles").select("id", head).eq("role", "instructor")),
    exactCount(service.from("profiles").select("id", head).eq("role", "admin")),
    exactCount(service.from("classes").select("id", head)),
    exactCount(service.from("simulation_sessions").select("id", head).like("course_id", "project:%")),
    exactCount(service.from("simulation_sessions").select("id", head).like("course_id", "project:%").eq("status", "completed")),
    exactCount(service.from("simulation_sessions").select("id", head).like("course_id", "project:%").eq("outcome", "success")),
    exactCount(service.from("generated_projects").select("id", head)),
    readPages<{ bucket: string; hits: number }>((start, end) => service.from("ai_usage")
      .select("bucket,hits").gte("window_start", since)
      .order("user_id").order("bucket").order("window_start").range(start, end), message),
  ]);
  const hits = (bucket: string) => usage.filter((row) => row.bucket === bucket).reduce((sum, row) => sum + Number(row.hits), 0);
  return {
    users: { total, instructors, admins },
    classes,
    runs: { total: runs, completed, successful },
    generatedProjects: generated,
    aiLastDay: { roleplay: hits("roleplay"), feedback: hits("feedback"), generation: hits("generation") },
  };
}
