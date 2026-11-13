/**
 * Client-safe constants, types, and pure 3-tier resolution helpers for AI quotas.
 * Keep free of server-only imports (`next/headers`, `recordDb`) so Client Components can import safely.
 */

export const AI_QUOTA = {
  generation: 12,
  feedback: 40,
  tutor: 60,
  roleplay: 40,
  "prompt-lab": 30,
} as const;

export type AiBucket = keyof typeof AI_QUOTA;

export const ACTIVE_BUCKETS = ["generation", "roleplay", "feedback"] as const;
export type ActiveAiBucket = (typeof ACTIVE_BUCKETS)[number];

export const BUCKET_META: Record<
  ActiveAiBucket,
  { label: string; shortLabel: string; description: string; color: string }
> = {
  generation: {
    label: "Course Generation",
    shortLabel: "Generate",
    description: "Creating or remixing mini-courses & learning paths",
    color: "#22d3ee",
  },
  roleplay: {
    label: "Client Call AI",
    shortLabel: "Client Call",
    description: "Free-text discovery questions during stakeholder interviews",
    color: "#818cf8",
  },
  feedback: {
    label: "Writing & Viva Grading",
    shortLabel: "Grading",
    description: "Evaluating custom requirements, briefs, teach-back & Viva",
    color: "#34d399",
  },
};

export type QuotaOverrides = {
  generation: number | null;
  roleplay: number | null;
  feedback: number | null;
};

export const EMPTY_QUOTA_OVERRIDES: QuotaOverrides = {
  generation: null,
  roleplay: null,
  feedback: null,
};

export const ROLE_DEFAULT_QUOTA: Record<"student" | "instructor" | "admin", Record<ActiveAiBucket, number>> = {
  student: {
    generation: AI_QUOTA.generation,
    roleplay: AI_QUOTA.roleplay,
    feedback: AI_QUOTA.feedback,
  },
  instructor: {
    generation: 30,
    roleplay: 80,
    feedback: 80,
  },
  admin: {
    generation: 60,
    roleplay: 120,
    feedback: 120,
  },
};

export type QuotaSource =
  | { kind: "role"; role: "student" | "instructor" | "admin" }
  | { kind: "class"; classId: string; className: string }
  | { kind: "account" };

export interface EffectiveBucketQuota {
  limit: number;
  source: QuotaSource;
  sourceLabel: string;
}

export type EffectiveQuotaMap = Record<ActiveAiBucket, EffectiveBucketQuota>;

export interface ClassQuotaRule {
  classId: string;
  className: string;
  quotas: QuotaOverrides;
}

export function normaliseQuotaRole(role: string | null | undefined): "student" | "instructor" | "admin" {
  if (role === "instructor" || role === "admin") return role;
  return "student";
}

export function formatQuotaSource(source: QuotaSource): string {
  if (source.kind === "account") return "Custom account limit (Admin)";
  if (source.kind === "class") return `Set by class: ${source.className}`;
  if (source.role === "instructor") return "Instructor allowance";
  if (source.role === "admin") return "Administrator allowance";
  return "Standard student allowance";
}

/**
 * Pure 3-tier resolution:
 *   Role default -> Instructor class cap (for students) -> Admin account override.
 */
export function computeEffectiveQuota(
  rawRole: string | null | undefined,
  accountOverrides: Partial<QuotaOverrides> | null | undefined,
  classRules: ClassQuotaRule[] = [],
): EffectiveQuotaMap {
  const role = normaliseQuotaRole(rawRole);
  const defaults = ROLE_DEFAULT_QUOTA[role];

  const out = {} as EffectiveQuotaMap;
  for (const bucket of ACTIVE_BUCKETS) {
    let limit = defaults[bucket];
    let source: QuotaSource = { kind: "role", role };

    if (role === "student" && classRules.length > 0) {
      for (const cls of classRules) {
        const cap = cls.quotas[bucket];
        if (typeof cap === "number" && Number.isFinite(cap)) {
          const clamped = Math.max(0, Math.min(500, Math.trunc(cap)));
          if (source.kind !== "class" || clamped < limit) {
            limit = clamped;
            source = { kind: "class", classId: cls.classId, className: cls.className };
          }
        }
      }
    }

    const personal = accountOverrides?.[bucket];
    if (typeof personal === "number" && Number.isFinite(personal)) {
      limit = Math.max(0, Math.min(500, Math.trunc(personal)));
      source = { kind: "account" };
    }

    out[bucket] = {
      limit,
      source,
      sourceLabel: formatQuotaSource(source),
    };
  }
  return out;
}

export interface HourlyQuotaPoint {
  windowStartIso: string;
  label: string;
  generation: number;
  roleplay: number;
  feedback: number;
  total: number;
}

export interface BucketStatus {
  bucket: ActiveAiBucket;
  label: string;
  shortLabel: string;
  description: string;
  color: string;
  used: number;
  limit: number;
  remaining: number;
  sourceLabel: string;
}

export interface UserQuotaSummary {
  buckets: BucketStatus[];
  resetMinutes: number;
  hourly: HourlyQuotaPoint[];
  totals24h: { generation: number; roleplay: number; feedback: number; total: number };
}

export interface StudentQuotaUsageRow {
  studentId: string;
  name: string;
  email: string | null;
  currentHour: { generation: number; roleplay: number; feedback: number; total: number };
  last24h: { generation: number; roleplay: number; feedback: number; total: number };
}

export const QUOTA_WINDOW_MS = 60 * 60 * 1000;

export function currentHourWindowMs(nowMs = Date.now()): number {
  return Math.floor(nowMs / QUOTA_WINDOW_MS) * QUOTA_WINDOW_MS;
}

export function minutesUntilNextHour(nowMs = Date.now()): number {
  const next = currentHourWindowMs(nowMs) + QUOTA_WINDOW_MS;
  return Math.max(1, Math.ceil((next - nowMs) / 60_000));
}

export function buildHourlySeries(
  rows: Array<{ bucket: string; window_start: string; hits: number }>,
  nowMs = Date.now(),
): HourlyQuotaPoint[] {
  const currentStart = currentHourWindowMs(nowMs);
  const byHour = new Map<number, { generation: number; roleplay: number; feedback: number }>();

  for (let i = 23; i >= 0; i--) {
    byHour.set(currentStart - i * QUOTA_WINDOW_MS, { generation: 0, roleplay: 0, feedback: 0 });
  }

  for (const row of rows) {
    const ts = currentHourWindowMs(new Date(row.window_start).getTime());
    const slot = byHour.get(ts);
    if (!slot) continue;
    const hits = Number(row.hits) || 0;
    if (row.bucket === "generation") slot.generation += hits;
    else if (row.bucket === "roleplay") slot.roleplay += hits;
    else if (row.bucket === "feedback") slot.feedback += hits;
  }

  const fmt = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Hong_Kong",
  });

  return [...byHour.entries()].map(([ts, counts]) => ({
    windowStartIso: new Date(ts).toISOString(),
    label: fmt.format(new Date(ts)),
    generation: counts.generation,
    roleplay: counts.roleplay,
    feedback: counts.feedback,
    total: counts.generation + counts.roleplay + counts.feedback,
  }));
}
