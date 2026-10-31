import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/home/Reveal";
import { SpotlightCard } from "@/components/home/SpotlightCard";
import { projectListings } from "@/lib/projects/catalog";
import { listOwnGeneratedProjects, type GeneratedListing } from "@/lib/projects/generated/store";
import { serverDb } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Projects · DevPath" };

const openButton = "mt-7 inline-flex self-start rounded-full bg-white px-7 py-3 text-[15px] font-medium text-black transition hover:bg-white/85";

async function ownProjects(): Promise<{ signedIn: boolean; projects: GeneratedListing[] }> {
  const db = await serverDb();
  const { data } = (await db?.auth.getUser()) ?? { data: { user: null } };
  if (!db || !data.user) return { signedIn: false, projects: [] };
  return { signedIn: true, projects: await listOwnGeneratedProjects(db) };
}

export default async function ProjectsPage() {
  const { signedIn, projects } = await ownProjects();
  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-12 text-white lg:px-0 lg:pt-16">
      <Reveal>
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">Projects</h1>
        <p className="mt-4 max-w-2xl text-lg text-white/65">
          Each project is a different client with a different problem. Your progress is saved as you go, so you can stop and pick up later.
        </p>
      </Reveal>
      <div className="mt-12 grid gap-5 md:grid-cols-2">
        {projectListings.map((project) => (
          <SpotlightCard key={project.id} className="flex h-full flex-col p-7">
            <p className="text-sm text-white/50">About {project.minutes} minutes</p>
            <h2 className="mt-2 text-2xl font-semibold">{project.title}</h2>
            <p className="mt-2 text-white/75">{project.tagline}</p>
            <p className="mt-3 leading-relaxed text-white/60">{project.summary}</p>
            <ul className="mt-5 flex flex-wrap gap-2">
              {project.skills.map((skill) => (
                <li key={skill} className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/75">{skill}</li>
              ))}
            </ul>
            <Link href={`/projects/${project.id}`} className={openButton}>
              Open the desktop
            </Link>
          </SpotlightCard>
        ))}
        <SpotlightCard delay={100} className="flex h-full flex-col border-dashed p-7">
          <p className="text-sm text-white/50">Any field you like</p>
          <h2 className="mt-2 text-2xl font-semibold">Create a project</h2>
          <p className="mt-3 leading-relaxed text-white/60">
            Pick a field and a topic. The AI writes a new client, a new problem and a new AI teammate, then checks that every path through it plays fairly.
          </p>
          <Link href="/projects/new" className={openButton}>
            Create a project
          </Link>
        </SpotlightCard>
      </div>

      {signedIn && projects.length > 0 && (
        <section className="mt-16">
          <Reveal>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Your projects</h2>
            <p className="mt-2 text-white/60">Only you can see and play these.</p>
          </Reveal>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {projects.map((project) => (
              <SpotlightCard key={project.id} className="flex h-full flex-col p-7">
                <p className="text-sm text-white/50">{project.domain}</p>
                <h3 className="mt-2 text-xl font-semibold">{project.title}</h3>
                <p className="mt-2 text-white/75">{project.tagline}</p>
                <p className="mt-3 leading-relaxed text-white/60">{project.summary}</p>
                <Link href={`/projects/${project.id}`} className={openButton}>
                  Open the desktop
                </Link>
              </SpotlightCard>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
