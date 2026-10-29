import Link from "next/link";
import { Reveal } from "@/components/home/Reveal";
import { SpotlightCard } from "@/components/home/SpotlightCard";
import { TourLink } from "@/components/home/TourLink";
import { glass } from "@/components/home/glass";
import { featuredCourses } from "@/lib/learning/featured";
import { listCourses } from "@/lib/learning/repository";
import { serverDb } from "@/lib/supabase/server";
import type { Course } from "@/lib/types";

export const dynamic = "force-dynamic";

const CAPABILITIES = [
  {
    title: "Guided Learning",
    text: "Structured lessons, activities and AI-assisted explanations that adapt to how you learn.",
  },
  {
    title: "AI Course Builder",
    text: "Generate and customise mini-courses for academic, professional or personal subjects.",
  },
  {
    title: "Interactive Practice",
    text: "Quizzes, conversations, decision simulations and immersive project experiences.",
  },
] as const;

const EDUCATOR = [
  {
    title: "Create with AI",
    text: "Draft a course outline, lessons and activities, then review before students see them.",
  },
  {
    title: "Customise every activity",
    text: "Edit readings, quizzes, simulations and immersive projects in one Course Studio.",
  },
  {
    title: "Invite and monitor",
    text: "Invite students by email and follow participation, submissions and feedback.",
  },
] as const;

const pill =
  "inline-flex min-w-48 items-center justify-center rounded-full px-7 py-3 text-[15px] font-medium transition duration-300";
const primary = `${pill} bg-white text-black hover:bg-white/85`;
const secondary = `${pill} border border-white/20 bg-white/[0.06] text-white/80 backdrop-blur-xl backdrop-saturate-150 hover:scale-[1.02] hover:border-white/50 hover:bg-white/15 hover:text-white hover:shadow-[0_0_20px_rgba(255,255,255,0.3),0_0_40px_rgba(255,255,255,0.1)]`;
const column = "mx-auto w-full max-w-4xl px-4 lg:px-0";

async function hasSession() {
  const db = await serverDb();
  if (!db) return false;
  const { data } = await db.auth.getUser();
  return !!data.user;
}

function authAware(href: string, signedIn: boolean) {
  if (signedIn) return href;
  return `/login?next=${encodeURIComponent(href)}`;
}

export default async function Home() {
  const [courses, signedIn] = await Promise.all([listCourses(), hasSession()]);
  const featured = featuredCourses(courses);

  return (
    <div className="relative text-white">
      <section
        className={`${column} flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center py-16 text-center lg:min-h-[calc(100dvh-7rem)]`}
      >
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300/80">
            DevPath · AI-Powered Interactive Learning
          </p>
        </Reveal>
        <Reveal delay={80}>
          <h1 className="mt-4 text-balance text-5xl font-bold leading-[1.05] tracking-tight drop-shadow-lg sm:text-7xl">
            Learn anything.{" "}
            <span className="bg-gradient-to-r from-cyan-300 via-indigo-300 to-fuchsia-300 bg-clip-text text-transparent">
              By doing.
            </span>
          </h1>
        </Reveal>
        <Reveal delay={160}>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-white/75 sm:text-xl">
            Explore interactive courses, create your own learning path with AI, and
            practise through realistic simulations.
          </p>
        </Reveal>
        <Reveal delay={240}>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link href="/courses" className={primary}>
              Explore Courses
            </Link>
            <Link href={authAware("/my-courses", signedIn)} className={secondary}>
              Create with AI
            </Link>
          </div>
        </Reveal>
      </section>

      <section className={`${column} py-20`}>
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-300/80">
            Core capabilities
          </p>
          <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-5xl">
            One platform for guided learning and practice.
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {CAPABILITIES.map((item, index) => (
            <SpotlightCard key={item.title} delay={index * 80} className="h-full p-7">
              <h3 className="text-xl font-semibold">{item.title}</h3>
              <p className="mt-3 leading-relaxed text-white/65">{item.text}</p>
            </SpotlightCard>
          ))}
        </div>
      </section>

      <section id="featured-courses" className={`${column} scroll-mt-32 py-20`}>
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-300/80">
            Featured courses
          </p>
          <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-5xl">
            Start with a short, hands-on course.
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-white/65">
            A selection from the same catalogue as Courses — software, communication
            and more.
          </p>
        </Reveal>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((course, index) => (
            <FeaturedCourseCard key={course.id} course={course} delay={index * 80} />
          ))}
        </div>
        <Reveal delay={180} className="mt-8 text-center">
          <Link href="/courses" className={secondary}>
            Browse all courses
          </Link>
        </Reveal>
      </section>

      <section id="tour" className={`${column} scroll-mt-32 py-20`}>
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-fuchsia-300/80">
            Immersive practice
          </p>
          <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-5xl">
            Harbour Clinic, as a learning activity.
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-white/65">
            Immersive project simulations are one of several interactive activity
            types. Lead a client project with AI teammates on a simulated desktop —
            then return to your course with verified progress.
          </p>
        </Reveal>
        <Reveal delay={120} className={`mt-10 ${glass} overflow-hidden p-2 shadow-2xl sm:p-3`}>
          <video
            id="tour-player"
            controls
            playsInline
            preload="none"
            poster="/promo/devpath-tour-poster.jpg"
            className="aspect-video w-full rounded-2xl bg-black"
            aria-label="DevPath product tour: Harbour Clinic immersive project in 30 seconds"
          >
            <source
              src="/promo/devpath-tour-1080.mp4"
              type="video/mp4"
              media="(min-width: 1280px)"
            />
            <source src="/promo/devpath-tour-720.mp4" type="video/mp4" />
          </video>
        </Reveal>
        <Reveal delay={180} className="mt-8 flex flex-wrap gap-3">
          <TourLink className={secondary}>Watch the 30s tour</TourLink>
          <Link
            href={authAware("/projects/harbour-clinic", signedIn)}
            className={primary}
          >
            Open Harbour Clinic
          </Link>
        </Reveal>
      </section>

      <section id="educators" className={`${column} scroll-mt-32 py-20`}>
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300/80">
            For educators
          </p>
          <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-5xl">
            Teaching Studio for real courses.
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-white/65">
            Create courses with AI, customise lessons, invite students and monitor
            learning outcomes — while keeping full student learning access on the
            same account.
          </p>
        </Reveal>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {EDUCATOR.map((item, index) => (
            <SpotlightCard key={item.title} delay={index * 80} className="h-full p-7">
              <h3 className="text-xl font-semibold">{item.title}</h3>
              <p className="mt-3 leading-relaxed text-white/65">{item.text}</p>
            </SpotlightCard>
          ))}
        </div>
        <Reveal delay={180} className="mt-8">
          <Link
            href={authAware("/onboarding?intent=teach", signedIn)}
            className={secondary}
          >
            Start Teaching
          </Link>
        </Reveal>
      </section>

      <section className={`${column} pb-24 pt-10 text-center`}>
        <Reveal>
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-5xl">
            Build your next learning path.
          </h2>
          <p className="mt-4 text-lg text-white/65">
            Explore published courses or generate a personal path with AI.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/courses" className={primary}>
              Explore Courses
            </Link>
            <Link href={authAware("/my-courses", signedIn)} className={secondary}>
              Create with AI
            </Link>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-white/10 bg-black/40 px-4 py-6 text-center text-sm text-white/40 backdrop-blur">
        DevPath · COMP5241 group project
      </footer>
    </div>
  );
}

function FeaturedCourseCard({
  course,
  delay,
}: {
  course: Course;
  delay: number;
}) {
  const minutes =
    course.estimatedMinutes ??
    course.lessons.reduce((sum, lesson) => sum + lesson.minutes, 0);

  return (
    <Reveal delay={delay}>
      <Link href={`/courses/${course.id}`} className="block h-full">
        <SpotlightCard className="h-full p-6">
          <div className="flex items-center gap-4">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-indigo-500/30 via-violet-500/20 to-fuchsia-500/30 text-2xl">
              {course.emoji}
            </span>
            <div>
              <h3 className="text-lg font-semibold">{course.title}</h3>
              <p className="text-xs text-white/45">
                {course.domain ?? "General"} · {course.level} · {course.lessons.length}{" "}
                lessons · ~{minutes} min
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-white/60">{course.tagline}</p>
          <p className="mt-5 text-sm font-medium text-white/75">Open course →</p>
        </SpotlightCard>
      </Link>
    </Reveal>
  );
}
