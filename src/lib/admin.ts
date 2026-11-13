import { redirect } from "next/navigation";
import { z } from "zod";
import {
  buildHourlySeries,
  EMPTY_QUOTA_OVERRIDES,
  type HourlyQuotaPoint,
  type QuotaOverrides,
} from "@/lib/ai/quota";
import { HttpError, recordDb, redactSecrets, serverDb } from "@/lib/supabase/server";

/*
 * The administrator's side: every account, its role and optional per-account
 * AI quota overrides, and how the platform is being used. An admin can make an
 * account an instructor or a student again; making an admin is left to the SQL
 * editor, and nobody changes their own role. Reads and updates use the service
 * role, after the signed-in user's own profile shows they are an admin.
 */

export const ASSIGNABLE_ROLES = ["student", "instructor"] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

const quotaField = z.number().int().min(0).max(500).nullable();
export const userQuotaSchema = z.object({
  generation: quotaField,
  roleplay: quotaField,
  feedback: quotaField,
});

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
  displayName: string | null;
  role: string;
  quotas: QuotaOverrides;
  createdAt: string;
  lastSignIn: string | null;
  runs: number;
  classesTaught: number;
};

type AdminProfileRow = {
  id: string;
  role?: string;
  display_name?: string | null;
  quota_generation?: number | null;
  quota_roleplay?: number | null;
  quota_feedback?: number | null;
};

export async function listUsers(): Promise<AdminUser[]> {
  const service = recordDb();
  const [{ data: list, error }, profileInitial, { data: runs }, { data: classes }] = await Promise.all([
    service.auth.admin.listUsers({ perPage: 500 }),
    service.from("profiles").select("id,role,display_name,quota_generation,quota_roleplay,quota_feedback"),
    service.from("simulation_sessions").select("user_id").like("course_id", "project:%"),
    service.from("classes").select("owner_id"),
  ]);
  if (error) {
    console.error("listUsers failed", { message: redactSecrets(error.message) });
    throw new HttpError(503, "Could not load the accounts. Please retry.");
  }

  let profiles = (profileInitial.data ?? null) as AdminProfileRow[] | null;
  if (profileInitial.error?.code === "42703") {
    const fallback = await service.from("profiles").select("id,role,display_name");
    profiles = (fallback.data ?? null) as AdminProfileRow[] | null;
  }

  const count = (rows: { [key: string]: unknown }[] | null, key: string, id: string) =>
    (rows ?? []).filter((row) => row[key] === id).length;

  return list.users
    .map((user) => {
      const profile = (profiles ?? []).find((row) => row.id === user.id);
      return {
        id: user.id,
        email: user.email ?? null,
        displayName: profile?.display_name?.trim() || null,
        role: profile?.role ?? "student",
        quotas: profile
          ? {
              generation: profile.quota_generation ?? null,
              roleplay: profile.quota_roleplay ?? null,
              feedback: profile.quota_feedback ?? null,
            }
          : { ...EMPTY_QUOTA_OVERRIDES },
        createdAt: user.created_at,
        lastSignIn: user.last_sign_in_at ?? null,
        runs: count(runs, "user_id", user.id),
        classesTaught: count(classes, "owner_id", user.id),
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
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

/** Sets or clears per-account hourly AI quota overrides (`null` falls back to role/class limit). */
export async function setUserQuotas(
  actorId: string,
  targetId: string,
  quotas: QuotaOverrides,
): Promise<QuotaOverrides> {
  const service = recordDb();
  const { data: target } = await service.from("profiles").select("id").eq("id", targetId).maybeSingle();
  if (!target) throw new HttpError(404, "That account doesn't exist.");

  const { data, error } = await service
    .from("profiles")
    .update({
      quota_generation: quotas.generation,
      quota_roleplay: quotas.roleplay,
      quota_feedback: quotas.feedback,
      updated_at: new Date().toISOString(),
    })
    .eq("id", targetId)
    .select("quota_generation,quota_roleplay,quota_feedback")
    .single();

  if (error?.code === "42703") {
    throw new HttpError(503, "Account quota overrides require applying the latest database migration.");
  }
  if (error) {
    console.error("setUserQuotas failed", { code: error.code, message: redactSecrets(error.message) });
    throw new HttpError(503, "Could not update account quotas. Please retry.");
  }
  console.info("Account quotas updated", { by: actorId, user: targetId, quotas });
  const row = data as {
    quota_generation?: number | null;
    quota_roleplay?: number | null;
    quota_feedback?: number | null;
  };
  return {
    generation: row.quota_generation ?? null,
    roleplay: row.quota_roleplay ?? null,
    feedback: row.quota_feedback ?? null,
  };
}

export type Overview = {
  users: { total: number; instructors: number; admins: number };
  classes: number;
  runs: { total: number; completed: number; successful: number };
  generatedProjects: number;
  /** AI requests in the last 24 hours, by what they were for. */
  aiLastDay: { roleplay: number; feedback: number; generation: number };
  /** 24-hour hourly series for platform quota chart. */
  hourly: HourlyQuotaPoint[];
};

export async function overview(): Promise<Overview> {
  const service = recordDb();
  const nowMs = Date.now();
  const since = new Date(nowMs - 24 * 3600 * 1000).toISOString();
  const head = { count: "exact" as const, head: true };
  const [profiles, classes, runs, completed, successful, generated, usage] = await Promise.all([
    service.from("profiles").select("role"),
    service.from("classes").select("id", head),
    service.from("simulation_sessions").select("id", head).like("course_id", "project:%"),
    service.from("simulation_sessions").select("id", head).like("course_id", "project:%").eq("status", "completed"),
    service.from("simulation_sessions").select("id", head).like("course_id", "project:%").eq("outcome", "success"),
    service.from("generated_projects").select("id", head),
    service.from("ai_usage").select("bucket,window_start,hits").gte("window_start", since),
  ]);
  const roles = (profiles.data ?? []).map((row) => row.role as string);
  const usageRows = (usage.data ?? []) as Array<{ bucket: string; window_start: string; hits: number }>;
  const hits = (bucket: string) =>
    usageRows.filter((row) => row.bucket === bucket).reduce((sum, row) => sum + Number(row.hits), 0);

  return {
    users: {
      total: roles.length,
      instructors: roles.filter((role) => role === "instructor").length,
      admins: roles.filter((role) => role === "admin").length,
    },
    classes: classes.count ?? 0,
    runs: { total: runs.count ?? 0, completed: completed.count ?? 0, successful: successful.count ?? 0 },
    generatedProjects: generated.count ?? 0,
    aiLastDay: { roleplay: hits("roleplay"), feedback: hits("feedback"), generation: hits("generation") },
    hourly: buildHourlySeries(usageRows, nowMs),
  };
}
