import type { Metadata } from "next";
import { RoleSwitch } from "@/components/admin/RoleSwitch";
import { UserQuotaEditor } from "@/components/admin/UserQuotaEditor";
import { FeedbackInbox } from "@/components/feedback/FeedbackInbox";
import { glass } from "@/components/home/glass";
import { Reveal } from "@/components/home/Reveal";
import { HourlyUsageChart } from "@/components/quota/QuotaCharts";
import { admin, listUsers, overview } from "@/lib/admin";
import { listFeedbackForAdmin } from "@/lib/feedback";

export const metadata: Metadata = { title: "Admin · DevPath" };

function when(iso: string | null) {
  if (!iso) return "never";
  // Rendered on the server, whose clock is UTC on Vercel; the platform runs in Hong Kong.
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Hong_Kong",
  });
}

function Stat({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <div className={`${glass} p-5`}>
      <p className="text-sm text-white/55">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
      {note && <p className="mt-1 text-xs text-white/45">{note}</p>}
    </div>
  );
}

export default async function AdminPage() {
  const user = await admin();
  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-4 pb-24 pt-12 text-white lg:px-0 lg:pt-16">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">Admin</h1>
        <div className={`${glass} mt-10 p-7 text-white/75`}>This page is for administrators.</div>
      </div>
    );
  }
  const [stats, users, feedback] = await Promise.all([overview(), listUsers(), listFeedbackForAdmin()]);

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-12 text-white lg:px-0 lg:pt-16">
      <Reveal>
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">Admin</h1>
        <p className="mt-4 max-w-2xl text-lg text-white/65">
          Platform usage, per-account roles and AI quota overrides, and learner content &amp; diagram feedback.
        </p>
      </Reveal>

      <section className="mt-10 space-y-4">
        <h2 className="text-xl font-semibold">Overview</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat
            label="Accounts"
            value={stats.users.total}
            note={`${stats.users.instructors} ${stats.users.instructors === 1 ? "instructor" : "instructors"} · ${stats.users.admins} ${stats.users.admins === 1 ? "admin" : "admins"}`}
          />
          <Stat label="Classes" value={stats.classes} />
          <Stat
            label="Project runs"
            value={stats.runs.total}
            note={`${stats.runs.completed} finished · ${stats.runs.successful} successful`}
          />
          <Stat label="Generated projects" value={stats.generatedProjects} />
        </div>

        <HourlyUsageChart
          hourly={stats.hourly}
          title="Platform AI requests (last 24 hours)"
          subtitle={`Last 24h: ${stats.aiLastDay.generation} course generations · ${stats.aiLastDay.roleplay} client calls · ${stats.aiLastDay.feedback} writing & Viva gradings`}
        />
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Content &amp; Diagram Feedback</h2>
        <p className="mt-1 text-sm text-white/55">
          Reports from learners across built-in, community, and instructor mini-courses.
        </p>
        <div className="mt-4">
          <FeedbackInbox
            initialItems={feedback}
            showProjectLink
            emptyText="No teaching content or diagram display issues reported yet."
          />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">
          Accounts <span className="font-normal text-white/45">{users.length}</span>
        </h2>
        <ul className="mt-4 space-y-3">
          {users.map((item) => (
            <li key={item.id} className={`${glass} p-5`}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {item.displayName ? (
                      <>
                        {item.displayName}{" "}
                        <span className="font-normal text-white/50">({item.email ?? "no email"})</span>
                      </>
                    ) : (
                      (item.email ?? "Account without an email")
                    )}
                  </p>
                  <p className="mt-1 text-xs text-white/45">
                    Joined {when(item.createdAt)} · last signed in {when(item.lastSignIn)} · {item.runs}{" "}
                    {item.runs === 1 ? "run" : "runs"}
                    {item.classesTaught > 0 &&
                      ` · teaches ${item.classesTaught} ${item.classesTaught === 1 ? "class" : "classes"}`}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <UserQuotaEditor userId={item.id} role={item.role} initialQuotas={item.quotas} />
                  {item.role === "admin" || item.id === user.id ? (
                    <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs text-amber-100">
                      {item.role === "admin" ? "Administrator" : item.role}
                    </span>
                  ) : (
                    <RoleSwitch userId={item.id} role={item.role} />
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
