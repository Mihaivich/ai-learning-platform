import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Reveal } from "@/components/home/Reveal";
import { ProfileClient } from "@/components/profile/ProfileClient";
import { HourlyUsageChart, QuotaRingGauges } from "@/components/quota/QuotaCharts";
import { loadUserQuotaSummary } from "@/lib/ai/quota";
import { studentClasses } from "@/lib/classes";
import { readAccountProfile } from "@/lib/projects/generated/profile";
import { serverDb } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Profile & AI Quota · DevPath" };

export default async function ProfilePage() {
  const db = await serverDb();
  const { data: auth } = (await db?.auth.getUser()) ?? { data: { user: null } };
  if (!db || !auth.user) redirect("/login");

  const [{ data: profileRow }, quotaSummary, classes] = await Promise.all([
    db
      .from("profiles")
      .select("display_name,role,background,experience")
      .eq("id", auth.user.id)
      .maybeSingle(),
    loadUserQuotaSummary(db, auth.user.id),
    studentClasses(db, auth.user.id),
  ]);

  const role = (profileRow?.role as string | undefined) ?? "student";
  const accountProfile = readAccountProfile(profileRow);

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-12 text-white lg:px-0 lg:pt-16">
      <Reveal>
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">Profile &amp; Quota</h1>
        <p className="mt-4 max-w-2xl text-lg text-white/65">
          Manage your identity, discipline background, enrolled classes, and live hourly AI allowances in one place.
        </p>
      </Reveal>

      <div className="mt-10">
        <ProfileClient
          email={auth.user.email ?? null}
          role={role}
          initialProfile={accountProfile}
          initialClasses={classes}
        />
      </div>

      <section id="quota" className="mt-12 scroll-mt-28 space-y-5">
        <div>
          <h2 className="text-2xl font-semibold">Your AI Quota &amp; Usage</h2>
          <p className="mt-1 text-sm text-white/60">
            Quotas refresh every clock hour. Each ring shows your effective limit (from your role, class rules, or an administrator override).
          </p>
        </div>

        <QuotaRingGauges buckets={quotaSummary.buckets} resetMinutes={quotaSummary.resetMinutes} />

        <HourlyUsageChart
          hourly={quotaSummary.hourly}
          title="Your AI requests over the last 24 hours"
        />
      </section>
    </div>
  );
}
