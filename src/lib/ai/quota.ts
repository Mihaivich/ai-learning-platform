import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ACTIVE_BUCKETS,
  type ActiveAiBucket,
  AI_QUOTA,
  type AiBucket,
  BUCKET_META,
  type BucketStatus,
  buildHourlySeries,
  type ClassQuotaRule,
  computeEffectiveQuota,
  currentHourWindowMs,
  type EffectiveQuotaMap,
  EMPTY_QUOTA_OVERRIDES,
  type HourlyQuotaPoint,
  minutesUntilNextHour,
  normaliseQuotaRole,
  QUOTA_WINDOW_MS,
  type QuotaOverrides,
  type StudentQuotaUsageRow,
  type UserQuotaSummary,
} from "./quota-shared";
import { HttpError, recordDb } from "@/lib/supabase/server";

export * from "./quota-shared";

function isActiveBucket(bucket: AiBucket): bucket is ActiveAiBucket {
  return bucket === "generation" || bucket === "roleplay" || bucket === "feedback";
}

export async function resolveEffectiveQuota(db: SupabaseClient, userId: string): Promise<EffectiveQuotaMap> {
  if (typeof (db as { from?: unknown }).from !== "function" || !userId) {
    return computeEffectiveQuota("student", null, []);
  }

  let role = "student";
  let accountOverrides: QuotaOverrides = { ...EMPTY_QUOTA_OVERRIDES };

  const profileRes = await db
    .from("profiles")
    .select("role,quota_generation,quota_roleplay,quota_feedback")
    .eq("id", userId)
    .maybeSingle();

  if (profileRes.error?.code === "42703") {
    const basic = await db.from("profiles").select("role").eq("id", userId).maybeSingle();
    role = (basic.data?.role as string | undefined) ?? "student";
  } else if (!profileRes.error && profileRes.data) {
    const row = profileRes.data as {
      role?: string;
      quota_generation?: number | null;
      quota_roleplay?: number | null;
      quota_feedback?: number | null;
    };
    role = row.role ?? "student";
    accountOverrides = {
      generation: row.quota_generation ?? null,
      roleplay: row.quota_roleplay ?? null,
      feedback: row.quota_feedback ?? null,
    };
  }

  const classRules: ClassQuotaRule[] = [];
  if (normaliseQuotaRole(role) === "student") {
    const { data: memberships } = await db.from("class_members").select("class_id").eq("student_id", userId);
    const classIds = (memberships ?? []).map((m) => m.class_id as string);
    if (classIds.length > 0) {
      const classesRes = await db
        .from("classes")
        .select("id,name,quota_generation,quota_roleplay,quota_feedback")
        .in("id", classIds);
      if (!classesRes.error && classesRes.data) {
        for (const c of classesRes.data as Array<{
          id: string;
          name: string;
          quota_generation?: number | null;
          quota_roleplay?: number | null;
          quota_feedback?: number | null;
        }>) {
          classRules.push({
            classId: c.id,
            className: c.name,
            quotas: {
              generation: c.quota_generation ?? null,
              roleplay: c.quota_roleplay ?? null,
              feedback: c.quota_feedback ?? null,
            },
          });
        }
      }
    }
  }

  return computeEffectiveQuota(role, accountOverrides, classRules);
}

const memory = new Map<string, { start: number; hits: number }>();

export function resetMemoryQuota() {
  memory.clear();
}

function consumeMemory(userId: string, bucket: AiBucket, maxHits: number): boolean {
  const key = `${userId}:${bucket}`;
  const now = Date.now();
  const row = memory.get(key);
  if (!row || now - row.start >= QUOTA_WINDOW_MS) {
    memory.set(key, { start: now, hits: 1 });
    return 1 <= maxHits;
  }
  row.hits += 1;
  return row.hits <= maxHits;
}

export async function enforceQuota(
  db: SupabaseClient,
  userId: string,
  bucket: AiBucket,
) {
  let maxHits: number = AI_QUOTA[bucket];
  let sourceNote = "";

  if (typeof (db as { from?: unknown }).from === "function" && isActiveBucket(bucket)) {
    try {
      const effective = await resolveEffectiveQuota(db, userId);
      maxHits = effective[bucket].limit;
      if (effective[bucket].source.kind !== "role") {
        sourceNote = ` (${effective[bucket].sourceLabel})`;
      }
    } catch {
      maxHits = AI_QUOTA[bucket];
    }
  }

  if (maxHits <= 0) {
    throw new HttpError(
      429,
      `AI ${bucket} is currently disabled for your account${sourceNote}.`,
    );
  }

  if (!consumeMemory(userId, bucket, maxHits)) {
    throw new HttpError(
      429,
      `Hourly limit (${maxHits}/hr) reached for ${bucket}${sourceNote}. Wait and try again.`,
    );
  }

  let { data, error } = await db.rpc("consume_ai_quota", {
    p_bucket: bucket,
    max_hits: maxHits,
    window_seconds: 3600,
  });

  if (error && maxHits > 100 && /Invalid quota window/i.test(error.message ?? "")) {
    ({ data, error } = await db.rpc("consume_ai_quota", {
      p_bucket: bucket,
      max_hits: 100,
      window_seconds: 3600,
    }));
  }

  if (error) {
    if (quotaFunctionMissing(error)) {
      console.warn(
        "AI quota RPC unavailable; using the in-memory per-instance limit only.",
      );
      return;
    }
    throw new HttpError(503, "Could not check the AI usage quota.");
  }
  if (data !== true) {
    throw new HttpError(
      429,
      `Hourly limit (${maxHits}/hr) reached for ${bucket}${sourceNote}. Wait and try again.`,
    );
  }
}

function quotaFunctionMissing(error: { code?: string; message?: string }) {
  const code = error.code ?? "";
  if (code === "PGRST202" || code === "42883") return true;
  const message = error.message ?? "";
  return /\bPGRST202\b/.test(message) || /\b42883\b/.test(message);
}

export async function loadUserQuotaSummary(
  db: SupabaseClient,
  userId: string,
  nowMs = Date.now(),
): Promise<UserQuotaSummary> {
  const sinceIso = new Date(currentHourWindowMs(nowMs) - 23 * QUOTA_WINDOW_MS).toISOString();
  const [effective, usageRes] = await Promise.all([
    resolveEffectiveQuota(db, userId),
    db
      .from("ai_usage")
      .select("bucket,window_start,hits")
      .eq("user_id", userId)
      .gte("window_start", sinceIso),
  ]);

  const rows = (usageRes.data ?? []) as Array<{ bucket: string; window_start: string; hits: number }>;
  const hourly = buildHourlySeries(rows, nowMs);
  const currentSlot = hourly[hourly.length - 1] ?? { generation: 0, roleplay: 0, feedback: 0, total: 0 };

  const buckets: BucketStatus[] = ACTIVE_BUCKETS.map((bucket) => {
    const meta = BUCKET_META[bucket];
    const used = currentSlot[bucket];
    const limit = effective[bucket].limit;
    return {
      bucket,
      label: meta.label,
      shortLabel: meta.shortLabel,
      description: meta.description,
      color: meta.color,
      used,
      limit,
      remaining: Math.max(0, limit - used),
      sourceLabel: effective[bucket].sourceLabel,
    };
  });

  const totals24h = hourly.reduce(
    (acc, pt) => ({
      generation: acc.generation + pt.generation,
      roleplay: acc.roleplay + pt.roleplay,
      feedback: acc.feedback + pt.feedback,
      total: acc.total + pt.total,
    }),
    { generation: 0, roleplay: 0, feedback: 0, total: 0 },
  );

  return {
    buckets,
    resetMinutes: minutesUntilNextHour(nowMs),
    hourly,
    totals24h,
  };
}

export async function loadClassStudentQuotaUsage(
  students: Array<{ id: string; name: string; email: string | null }>,
  nowMs = Date.now(),
): Promise<{ students: StudentQuotaUsageRow[]; hourly: HourlyQuotaPoint[] }> {
  if (!students.length) {
    return { students: [], hourly: buildHourlySeries([], nowMs) };
  }
  const service = recordDb();
  const sinceIso = new Date(currentHourWindowMs(nowMs) - 23 * QUOTA_WINDOW_MS).toISOString();
  const currentStartMs = currentHourWindowMs(nowMs);

  const { data } = await service
    .from("ai_usage")
    .select("user_id,bucket,window_start,hits")
    .in(
      "user_id",
      students.map((s) => s.id),
    )
    .gte("window_start", sinceIso);

  const rows = (data ?? []) as Array<{ user_id: string; bucket: string; window_start: string; hits: number }>;
  const hourly = buildHourlySeries(rows, nowMs);

  const perStudent: StudentQuotaUsageRow[] = students.map((student) => {
    const own = rows.filter((r) => r.user_id === student.id);
    const currentHour = { generation: 0, roleplay: 0, feedback: 0, total: 0 };
    const last24h = { generation: 0, roleplay: 0, feedback: 0, total: 0 };

    for (const r of own) {
      const hits = Number(r.hits) || 0;
      const isCurrent = currentHourWindowMs(new Date(r.window_start).getTime()) === currentStartMs;
      if (r.bucket === "generation" || r.bucket === "roleplay" || r.bucket === "feedback") {
        last24h[r.bucket] += hits;
        last24h.total += hits;
        if (isCurrent) {
          currentHour[r.bucket] += hits;
          currentHour.total += hits;
        }
      }
    }

    return {
      studentId: student.id,
      name: student.name,
      email: student.email,
      currentHour,
      last24h,
    };
  });

  return { students: perStudent, hourly };
}
