"use client";

import Link from "next/link";
import { useState } from "react";
import { SpotlightCard } from "@/components/home/SpotlightCard";
import { inferDiscipline, type DisciplineCategory, type ProjectListing } from "@/lib/projects/catalog";
import type { GeneratedListing } from "@/lib/projects/generated/store";
import type { ArtifactKind } from "@/lib/projects/types";

const DISCIPLINES: ("All" | DisciplineCategory)[] = [
  "All",
  "Data & Healthcare",
  "Business & Economics",
  "Law & Media",
  "Natural Sciences",
  "Software & AI",
];

const ARTIFACT_BADGES: Record<ArtifactKind, { label: string; tone: string }> = {
  table: { label: "Spreadsheet Audit", tone: "border-emerald-300/30 bg-emerald-400/10 text-emerald-200" },
  document: { label: "Clause Redline", tone: "border-amber-300/30 bg-amber-400/10 text-amber-200" },
  steps: { label: "Lab / Field SOP", tone: "border-cyan-300/30 bg-cyan-400/10 text-cyan-200" },
  code: { label: "Code & Test Diff", tone: "border-indigo-300/30 bg-indigo-400/10 text-indigo-200" },
};

const primaryBtn =
  "inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition hover:bg-white/85";
const secondaryBtn =
  "inline-flex items-center justify-center rounded-full border border-white/20 bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-white/85 transition hover:border-white/50 hover:bg-white/15";
const ghostBtn =
  "inline-flex items-center justify-center rounded-full border border-white/15 px-3.5 py-2 text-xs font-medium text-white/65 transition hover:border-cyan-300/50 hover:text-cyan-200";

export function ProjectCatalog({
  listings,
  communityProjects = [],
}: {
  listings: readonly ProjectListing[];
  communityProjects?: GeneratedListing[];
}) {
  const [filter, setFilter] = useState<"All" | DisciplineCategory>("All");

  const visibleBuiltIns = filter === "All" ? listings : listings.filter((item) => item.discipline === filter);
  const visibleCommunity =
    filter === "All"
      ? communityProjects
      : communityProjects.filter((item) => inferDiscipline(`${item.subject ?? ""} ${item.domain}`) === filter);

  return (
    <div>
      {/* Cross-Disciplinary Filter Bar */}
      <div className="mt-8 flex flex-wrap gap-2" role="tablist" aria-label="Filter by discipline">
        {DISCIPLINES.map((cat) => {
          const active = filter === cat;
          const count =
            cat === "All"
              ? listings.length + communityProjects.length
              : listings.filter((l) => l.discipline === cat).length +
                communityProjects.filter((c) => inferDiscipline(`${c.subject ?? ""} ${c.domain}`) === cat).length;
          return (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(cat)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                active
                  ? "border-cyan-300 bg-cyan-300/15 text-white shadow-[0_0_20px_rgba(103,232,249,0.15)]"
                  : "border-white/15 bg-white/[0.04] text-white/70 hover:border-white/40 hover:text-white"
              }`}
            >
              <span>{cat}</span>
              <span className={`rounded-full px-1.5 py-0.2 text-xs ${active ? "bg-cyan-300/25 text-cyan-100" : "bg-white/10 text-white/55"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Flagship Built-In Mini-Courses */}
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {visibleBuiltIns.map((project) => {
          const badge = ARTIFACT_BADGES[project.artifactKind];
          return (
            <SpotlightCard key={project.id} className="flex h-full flex-col p-7">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-medium text-cyan-200/85">{project.discipline}</span>
                <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${badge.tone}`}>
                  {badge.label}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-white/50">{project.subject} · ~{project.minutes} min</p>
              <h2 className="mt-2 text-2xl font-semibold">{project.title}</h2>
              <p className="mt-2 text-white/80">{project.tagline}</p>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-white/60">{project.summary}</p>
              <ul className="mt-5 flex flex-wrap gap-1.5">
                {project.skills.map((skill) => (
                  <li key={skill} className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/75">
                    {skill}
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap items-center gap-2.5">
                <Link href={`/projects/${project.id}/learn`} className={primaryBtn}>
                  Start mini-course
                </Link>
                <Link href={`/projects/${project.id}`} className={secondaryBtn}>
                  Desktop
                </Link>
                <Link href={`/projects/new?remix=${project.id}`} className={ghostBtn}>
                  Remix
                </Link>
              </div>
            </SpotlightCard>
          );
        })}

        <SpotlightCard delay={100} className="flex h-full flex-col border-dashed p-7">
          <p className="text-xs font-medium uppercase tracking-wider text-fuchsia-300/85">Any discipline · AI-verified</p>
          <h2 className="mt-2 text-2xl font-semibold">Generate or remix your own course</h2>
          <p className="mt-3 flex-1 text-sm leading-relaxed text-white/60">
            Studying nursing, law, accounting, psychology, chemistry, or media? Pick your field with one click and the platform builds an interactive concept primer, a Spot-the-Trap game, and a simulated desktop job with spreadsheets, clauses, SOPs, or code.
          </p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <Link href="/projects/new" className={primaryBtn}>
              Create a mini-course
            </Link>
          </div>
        </SpotlightCard>
      </div>

      {/* Community Gallery */}
      {visibleCommunity.length > 0 && (
        <section className="mt-16">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-300/80">Peer-Created Courses</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Community Gallery</h2>
              <p className="mt-1 text-sm text-white/60">
                Mini-courses generated and shared by students and instructors across disciplines. Play any course or remix it into your own major.
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {visibleCommunity.map((project) => {
              const disc = inferDiscipline(`${project.subject ?? ""} ${project.domain}`);
              return (
                <SpotlightCard key={project.id} className="flex h-full flex-col p-7">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-medium text-teal-200/90">{disc}</span>
                    <span className="rounded-full border border-teal-300/25 bg-teal-300/10 px-2.5 py-0.5 text-[11px] text-teal-100">
                      Community · {project.subject || project.domain}
                    </span>
                  </div>
                  <h3 className="mt-2.5 text-xl font-semibold">{project.title}</h3>
                  <p className="mt-2 text-sm text-white/75">{project.tagline}</p>
                  <p className="mt-2.5 flex-1 text-sm leading-relaxed text-white/60">{project.summary}</p>
                  <div className="mt-6 flex flex-wrap items-center gap-2.5">
                    <Link href={`/projects/${project.id}/learn`} className={primaryBtn}>
                      Start mini-course
                    </Link>
                    <Link href={`/projects/${project.id}`} className={secondaryBtn}>
                      Desktop
                    </Link>
                    <Link href={`/projects/new?remix=${project.id}`} className={ghostBtn}>
                      Remix
                    </Link>
                  </div>
                </SpotlightCard>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

export function OwnProjectsGrid({ initialProjects }: { initialProjects: GeneratedListing[] }) {
  const [items, setItems] = useState(initialProjects);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function togglePublic(id: string, current: boolean) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/projects/gallery/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isPublic: !current }),
      });
      if (res.ok) {
        setItems((prev) => prev.map((item) => (item.id === id ? { ...item, is_public: !current } : item)));
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mt-6 grid gap-5 md:grid-cols-2">
      {items.map((project) => {
        const isPublic = project.is_public === true;
        return (
          <SpotlightCard key={project.id} className="flex h-full flex-col p-7">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-white/55">{project.subject ? `${project.subject} · ${project.domain}` : project.domain}</p>
              <button
                type="button"
                disabled={busyId === project.id}
                onClick={() => togglePublic(project.id, isPublic)}
                className={`rounded-full border px-3 py-1 text-[11px] font-medium transition ${
                  isPublic
                    ? "border-emerald-300/40 bg-emerald-400/15 text-emerald-100 hover:bg-emerald-400/25"
                    : "border-white/20 text-white/65 hover:border-white/45 hover:text-white"
                }`}
              >
                {busyId === project.id ? "Saving…" : isPublic ? "✓ Public in Gallery" : "Share to Gallery"}
              </button>
            </div>
            <h3 className="mt-2 text-xl font-semibold">{project.title}</h3>
            <p className="mt-2 text-sm text-white/75">{project.tagline}</p>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-white/60">{project.summary}</p>
            <div className="mt-6 flex flex-wrap items-center gap-2.5">
              <Link href={`/projects/${project.id}/learn`} className={primaryBtn}>
                Start mini-course
              </Link>
              <Link href={`/projects/${project.id}`} className={secondaryBtn}>
                Desktop
              </Link>
              <Link href={`/projects/new?remix=${project.id}`} className={ghostBtn}>
                Remix
              </Link>
            </div>
          </SpotlightCard>
        );
      })}
    </div>
  );
}
