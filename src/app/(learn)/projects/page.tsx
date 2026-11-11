import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/home/Reveal";
import { SpotlightCard } from "@/components/home/SpotlightCard";
import { glass } from "@/components/home/glass";
import { OwnProjectsGrid, ProjectCatalog } from "@/components/projects/ProjectCatalog";
import { JoinClass } from "@/components/teach/JoinClass";
import { studentClasses } from "@/lib/classes";
import { projectListings } from "@/lib/projects/catalog";
import { listOwnPaths, type PathListing } from "@/lib/projects/generated/path";
import { listOwnGeneratedProjects, listPublicGeneratedProjects, type GeneratedListing } from "@/lib/projects/generated/store";
import { serverDb } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Mini-Courses & Simulations · DevPath" };

const openButton = "mt-7 inline-flex self-start rounded-full bg-white px-7 py-3 text-[15px] font-medium text-black transition hover:bg-white/85";

type Classes = Awaited<ReturnType<typeof studentClasses>>;

async function loadProjectsPageData(): Promise<{
  signedIn: boolean;
  projects: GeneratedListing[];
  community: GeneratedListing[];
  paths: PathListing[];
  classes: Classes;
}> {
  const db = await serverDb();
  if (!db) return { signedIn: false, projects: [], community: [], paths: [], classes: [] };
  const { data } = await db.auth.getUser();
  if (!data.user) {
    const community = await listPublicGeneratedProjects(db);
    return { signedIn: false, projects: [], community, paths: [], classes: [] };
  }
  const [projects, community, paths, classes] = await Promise.all([
    listOwnGeneratedProjects(db, data.user.id),
    listPublicGeneratedProjects(db),
    listOwnPaths(db),
    studentClasses(db, data.user.id),
  ]);
  const ownIds = new Set(projects.map((p) => p.id));
  return {
    signedIn: true,
    projects,
    community: community.filter((p) => !ownIds.has(p.id)),
    paths,
    classes,
  };
}

export default async function ProjectsPage() {
  const { signedIn, projects, community, paths, classes } = await loadProjectsPageData();
  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-12 text-white lg:px-0 lg:pt-16">
      <Reveal>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300/80">Cross-Disciplinary Studio</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-6xl">Mini-courses &amp; simulations</h1>
        <p className="mt-4 max-w-2xl text-lg text-white/65">
          Every course pairs an interactive visual primer and a 60-second Spot-the-Trap game with a zero-typing simulated stakeholder workday—spanning healthcare statistics, behavioural economics, privacy law, lab science, and software.
        </p>
      </Reveal>

      <ProjectCatalog listings={projectListings} communityProjects={community} />

      {signedIn && (
        <section className="mt-16">
          <Reveal>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Your classes</h2>
          </Reveal>
          {classes.length > 0 && (
            <div className="mt-6 space-y-4">
              {classes.map((item) => (
                <div key={item.id} className={`${glass} p-6`}>
                  <h3 className="text-xl font-semibold">{item.name}</h3>
                  {item.projects.length ? (
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {item.projects.map((project) => (
                        <li key={project.id} className="flex items-center gap-1.5">
                          <Link
                            href={`/projects/${project.id}/learn`}
                            className="inline-flex rounded-full border border-white/20 px-4 py-2 text-sm hover:border-white/50 hover:bg-white/10"
                          >
                            {project.title} (Mini-course) →
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-white/50">Your instructor hasn&apos;t assigned a course yet.</p>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className={`${glass} mt-6 p-6`}>
            <JoinClass />
          </div>
        </section>
      )}

      {signedIn && paths.length > 0 && (
        <section className="mt-16">
          <Reveal>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Your learning paths</h2>
            <p className="mt-2 text-white/60">One subject, three progressive mini-courses, two new concepts in each.</p>
          </Reveal>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {paths.map((path) => (
              <SpotlightCard key={path.id} className="flex h-full flex-col p-7">
                <p className="text-sm text-white/50">{path.subject} · {path.domain}</p>
                <h3 className="mt-2 text-xl font-semibold">{path.title}</h3>
                <p className="mt-3 leading-relaxed text-white/60">{path.summary}</p>
                <Link href={`/paths/${path.id}`} className={openButton}>
                  Open the path
                </Link>
              </SpotlightCard>
            ))}
          </div>
        </section>
      )}

      {signedIn && projects.length > 0 && (
        <section className="mt-16">
          <Reveal>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Your generated courses</h2>
            <p className="mt-2 text-white/60">Private by default—share any course to the Community Gallery in one click so peers can play or remix it.</p>
          </Reveal>
          <OwnProjectsGrid initialProjects={projects} />
        </section>
      )}
    </div>
  );
}
