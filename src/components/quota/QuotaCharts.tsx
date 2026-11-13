import { glass } from "@/components/home/glass";
import {
  BUCKET_META,
  type BucketStatus,
  type HourlyQuotaPoint,
  type QuotaOverrides,
  type StudentQuotaUsageRow,
} from "@/lib/ai/quota-shared";

/**
 * Radial SVG Ring Gauges for current-hour remaining vs limit across the 3 AI buckets.
 */
export function QuotaRingGauges({
  buckets,
  resetMinutes,
}: {
  buckets: BucketStatus[];
  resetMinutes: number;
}) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/55">
        <span>Current hourly window · resets in ~{resetMinutes} min</span>
        <span>Offline keyword fallback keeps runs playable even at 0 remaining</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {buckets.map((item) => {
          const disabled = item.limit <= 0;
          const ratio = disabled ? 1 : Math.min(1, item.used / item.limit);
          const dashOffset = circumference * (1 - ratio);
          const exhausted = disabled || item.remaining === 0;
          const warning = !exhausted && ratio >= 0.8;
          const stroke = exhausted ? "#fb7185" : warning ? "#fbbf24" : item.color;

          return (
            <div key={item.bucket} className={`${glass} flex flex-col justify-between p-5`}>
              <div className="flex items-center gap-4">
                <div className="relative h-20 w-20 shrink-0">
                  <svg viewBox="0 0 84 84" className="h-20 w-20 -rotate-90">
                    <circle
                      cx="42"
                      cy="42"
                      r={radius}
                      fill="none"
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth="7"
                    />
                    <circle
                      cx="42"
                      cy="42"
                      r={radius}
                      fill="none"
                      stroke={stroke}
                      strokeWidth="7"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={dashOffset}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    {disabled ? (
                      <span className="font-mono text-xs font-semibold text-rose-300">Paused</span>
                    ) : (
                      <>
                        <span className="font-mono text-lg font-bold tabular-nums text-white">
                          {item.remaining}
                        </span>
                        <span className="text-[10px] text-white/45">left</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="min-w-0">
                  <p className="font-semibold text-white">{item.label}</p>
                  <p className="mt-0.5 font-mono text-xs tabular-nums text-white/65">
                    {disabled ? "0 / hr cap" : `${item.used} used of ${item.limit} / hr`}
                  </p>
                  <p className="mt-1 text-xs leading-snug text-white/50">{item.description}</p>
                </div>
              </div>

              <div className="mt-3.5 border-t border-white/10 pt-2.5 text-[11px] text-cyan-200/80">
                {item.sourceLabel}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 24-hour stacked SVG bar chart for Student, Instructor, or Admin dashboards.
 */
export function HourlyUsageChart({
  hourly,
  title = "AI activity over the last 24 hours",
  subtitle,
}: {
  hourly: HourlyQuotaPoint[];
  title?: string;
  subtitle?: string;
}) {
  const maxTotal = Math.max(4, ...hourly.map((pt) => pt.total));
  const total24h = hourly.reduce((sum, pt) => sum + pt.total, 0);
  const chartW = 720;
  const chartH = 160;
  const padLeft = 30;
  const padRight = 12;
  const padTop = 14;
  const padBottom = 26;
  const plotW = chartW - padLeft - padRight;
  const plotH = chartH - padTop - padBottom;
  const slotW = plotW / Math.max(1, hourly.length);
  const barW = Math.max(8, slotW * 0.62);

  return (
    <div className={`${glass} p-5 sm:p-6`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-white">{title}</h3>
          <p className="mt-0.5 text-xs text-white/55">
            {subtitle ?? `${total24h} total AI ${total24h === 1 ? "request" : "requests"} across the past 24 hours (HKT)`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-white/70">
          {(["generation", "roleplay", "feedback"] as const).map((key) => (
            <span key={key} className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: BUCKET_META[key].color }} />
              {BUCKET_META[key].shortLabel}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <svg
          viewBox={`0 0 ${chartW} ${chartH}`}
          className="h-auto min-w-[500px] w-full"
          role="img"
          aria-label={title}
        >
          {/* Horizontal grid lines */}
          {[0, 0.5, 1].map((frac) => {
            const y = padTop + plotH * (1 - frac);
            const val = Math.round(maxTotal * frac);
            return (
              <g key={frac}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={chartW - padRight}
                  y2={y}
                  stroke="rgba(255,255,255,0.09)"
                  strokeDasharray={frac === 0 ? undefined : "3 3"}
                />
                <text
                  x={padLeft - 6}
                  y={y + 3.5}
                  textAnchor="end"
                  fill="rgba(255,255,255,0.45)"
                  fontSize="9.5"
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {hourly.map((pt, idx) => {
            const x = padLeft + idx * slotW + (slotW - barW) / 2;
            const genH = (pt.generation / maxTotal) * plotH;
            const roleH = (pt.roleplay / maxTotal) * plotH;
            const feedH = (pt.feedback / maxTotal) * plotH;
            const baseY = padTop + plotH;

            return (
              <g key={pt.windowStartIso}>
                <title>
                  {`${pt.label} HKT — Total ${pt.total} (Generate: ${pt.generation}, Call: ${pt.roleplay}, Grading: ${pt.feedback})`}
                </title>
                {/* Subtle empty track */}
                <rect
                  x={x}
                  y={padTop}
                  width={barW}
                  height={plotH}
                  rx="3"
                  fill="rgba(255,255,255,0.025)"
                />
                {pt.generation > 0 && (
                  <rect
                    x={x}
                    y={baseY - genH}
                    width={barW}
                    height={Math.max(2, genH)}
                    fill={BUCKET_META.generation.color}
                    rx="2"
                  />
                )}
                {pt.roleplay > 0 && (
                  <rect
                    x={x}
                    y={baseY - genH - roleH}
                    width={barW}
                    height={Math.max(2, roleH)}
                    fill={BUCKET_META.roleplay.color}
                    rx="2"
                  />
                )}
                {pt.feedback > 0 && (
                  <rect
                    x={x}
                    y={baseY - genH - roleH - feedH}
                    width={barW}
                    height={Math.max(2, feedH)}
                    fill={BUCKET_META.feedback.color}
                    rx="2"
                  />
                )}
                {(idx % 4 === 0 || idx === hourly.length - 1) && (
                  <text
                    x={x + barW / 2}
                    y={chartH - 7}
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.48)"
                    fontSize="9.5"
                    fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                  >
                    {idx === hourly.length - 1 ? "Now" : pt.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

/**
 * Instructor-facing per-student AI quota comparison chart for a class.
 */
export function ClassStudentQuotaChart({
  students,
  classQuotas,
}: {
  students: StudentQuotaUsageRow[];
  classQuotas: QuotaOverrides;
}) {
  if (students.length === 0) {
    return (
      <div className={`${glass} p-5 text-sm text-white/55`}>
        Student AI usage bars appear here once learners join this class.
      </div>
    );
  }

  const max24h = Math.max(6, ...students.map((s) => s.last24h.total));
  const genCap = classQuotas.generation ?? 12;

  return (
    <div className={`${glass} p-5 sm:p-6`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-white">Student AI usage (current hour &amp; 24h)</h3>
          <p className="mt-0.5 text-xs text-white/55">
            Compare each student&apos;s AI consumption across generation, stakeholder interviews, and grading.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-white/70">
          {(["generation", "roleplay", "feedback"] as const).map((key) => (
            <span key={key} className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: BUCKET_META[key].color }} />
              {BUCKET_META[key].shortLabel}
            </span>
          ))}
        </div>
      </div>

      <ul className="mt-4 space-y-3">
        {students.map((student) => {
          const genPct = (student.last24h.generation / max24h) * 100;
          const rolePct = (student.last24h.roleplay / max24h) * 100;
          const feedPct = (student.last24h.feedback / max24h) * 100;
          const nearGenCap = genCap > 0 && student.currentHour.generation >= genCap;

          return (
            <li key={student.studentId} className="rounded-xl border border-white/10 bg-black/25 p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  <span className="font-semibold text-white">{student.name}</span>
                  {student.email && <span className="ml-2 text-white/45">{student.email}</span>}
                </div>
                <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
                  <span
                    className={`rounded-full px-2 py-0.5 ${
                      nearGenCap
                        ? "border border-rose-300/35 bg-rose-400/15 text-rose-200"
                        : "bg-white/[0.06] text-white/70"
                    }`}
                  >
                    This hr: {student.currentHour.generation}/{genCap} gen · {student.currentHour.total} req
                  </span>
                  <span className="text-white/55">24h: {student.last24h.total}</span>
                </div>
              </div>

              <div className="mt-2.5 flex h-2.5 overflow-hidden rounded-full bg-white/[0.07]">
                {student.last24h.generation > 0 && (
                  <div
                    style={{ width: `${genPct}%`, backgroundColor: BUCKET_META.generation.color }}
                    title={`Generation (24h): ${student.last24h.generation}`}
                  />
                )}
                {student.last24h.roleplay > 0 && (
                  <div
                    style={{ width: `${rolePct}%`, backgroundColor: BUCKET_META.roleplay.color }}
                    title={`Client Call AI (24h): ${student.last24h.roleplay}`}
                  />
                )}
                {student.last24h.feedback > 0 && (
                  <div
                    style={{ width: `${feedPct}%`, backgroundColor: BUCKET_META.feedback.color }}
                    title={`Grading AI (24h): ${student.last24h.feedback}`}
                  />
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
