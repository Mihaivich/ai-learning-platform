import Link from "next/link";
import { Reveal } from "@/components/home/Reveal";
import { SpotlightCard } from "@/components/home/SpotlightCard";
import { TourLink } from "@/components/home/TourLink";
import { glass } from "@/components/home/glass";
import { AppIcon, Avatar } from "@/components/projects/desktop/icons";
import { appName, DOCK, type AppId } from "@/components/projects/desktop/config";

// Universal cross-disciplinary copy.
const DESK: Record<AppId, string> = {
  mail: "Read the brief: the stakeholder's request, a message from frontline staff or users, and your manager's constraints.",
  call: "Interview the stakeholder live. They know the real context, though they only reveal what you think to ask.",
  notes: "Write crisp requirements, guardrails, and a measurable target for what counts as success.",
  cody: "Brief your domain AI specialist—whether statistical analyst, legal-copy agent, lab-methods agent, or coding agent.",
  review: "Audit what comes back: spreadsheets, clause redlines, lab SOP steps, or code diffs. Send flawed work back with why.",
  launch: "Defend your reasoning in a live stakeholder Viva, choose how to roll out, and see what happens next.",
};

const FORMATS = [
  {
    step: "Act 01",
    title: "Interactive Visual Primer",
    text: "Click-to-compare concept simulators and everyday mental models unpack the two core domain ideas before the mission starts.",
  },
  {
    step: "Act 02",
    title: "60s Spot-the-Trap Game",
    text: "Rapid-fire judgment cards train your eye to separate rigorous practice from persuasive, overconfident misconceptions.",
  },
  {
    step: "Act 03",
    title: "Simulated Workday & Live Viva",
    text: "Lead an AI teammate on a realistic desktop, audit polymorphic deliverables, and pass a pre-launch stakeholder oral check.",
  },
] as const;

const PRIMITIVES = [
  { title: "Data & Healthcare", badge: "Spreadsheet Audit", example: "Ward 4B Hand-Gel Audit — incidence rates & confounding variables in clinical Excel tables." },
  { title: "Business & Economics", badge: "Cohort Table", example: "Sunset Daycare Policy — crowding out intrinsic motivation & selection bias in behavioural trials." },
  { title: "Law, Media & Service", badge: "Clause Redline", example: "Bean & Bread Loyalty Pass — service cycle time & explicit opt-in SMS privacy clauses (§1–§4)." },
  { title: "Natural Sciences & CS", badge: "Lab SOP & Code Diff", example: "River Meadow Nitrate SOP (matrix blanks & cold chain) plus full software engineering PR diffs." },
] as const;

const TEAM = [
  { name: "The stakeholder", note: "Answers your questions on a live call. Knows the real-world operations, and only reveals what you ask.", ai: true },
  { name: "Your AI specialist", note: "Iris, Milo, Sora, Helix, or Cody: works fast and literally from your brief—any unstated guardrail becomes a textbook flaw.", ai: true },
  { name: "Your lead / supervisor", note: "Sets the two-week budget and steps in when scope or schedule starts to slip.", ai: false },
  { name: "Frontline people", note: "Nurses, baristas, teachers, volunteers, or customers who live with whatever you sign off.", ai: false },
] as const;

const TEAM_AVATAR: Record<string, { initials: string; tone: string }> = {
  "The stakeholder": { initials: "S", tone: "from-rose-400 to-orange-400" },
  "Your lead / supervisor": { initials: "L", tone: "from-sky-400 to-indigo-500" },
  "Frontline people": { initials: "F", tone: "from-emerald-400 to-teal-500" },
};

const FLUENCY = [
  { title: "Delegation", text: "What you investigated yourself before handing work to AI.", rating: "strong" },
  { title: "Description", text: "How clearly you specified targets, denominators, and guardrails.", rating: "mixed" },
  { title: "Discernment", text: "Whether you caught and explained the AI's domain mistake.", rating: "strong" },
  { title: "Diligence", text: "How you defended sign-off in the Viva and measured real impact.", rating: "strong" },
] as const;

const RATING = {
  strong: "bg-emerald-400/15 text-emerald-300 ring-emerald-400/30",
  mixed: "bg-amber-400/15 text-amber-300 ring-amber-400/30",
  weak: "bg-rose-400/15 text-rose-300 ring-rose-400/30",
};

const ENDINGS = [
  { label: "Verified impact", tone: "text-emerald-300", text: "The real problem is solved, guardrails hold, and your metric proves it." },
  { label: "Caught in pilot", tone: "text-amber-300", text: "A staged rollout caught a flaw before full harm, at the cost of schedule." },
  { label: "Unravelled live", tone: "text-rose-300", text: "An unchecked AI assumption reached committees, customers, or regulators." },
];

const FOR_YOU = [
  { title: "Two tracks in every field", text: "Play in Overview mode to review behavioural outcomes, or Specialist mode to inspect spreadsheet rows, § clauses, SOP steps, or code lines." },
  { title: "Generate or remix any major", text: "Say who you are and what subject you want to master. The AI builds and verifies a complete 3-act mini-course in your discipline." },
  { title: "Community Gallery & Paths", text: "Follow a 3-course learning path from your level up, share your courses publicly, or remix a peer's course into your own world." },
];

const TEACHERS = [
  { title: "Classes with a 6-char code", text: "Students join in seconds and see the mini-courses and simulations you assign." },
  { title: "Concept & Viva evidence", text: "See where each student is, which misconceptions they caught, and the exact teach-back notes they wrote." },
  { title: "Courses from lecture notes", text: "Paste syllabus notes from any faculty and generate a verified simulation, or hand-edit every line." },
];

const pill = "inline-flex min-w-52 items-center justify-center rounded-full px-7 py-3 text-[15px] font-medium transition duration-300";
const primary = `${pill} bg-white text-black hover:bg-white/85`;
const secondary = `${pill} border border-white/20 bg-white/[0.06] text-white/80 backdrop-blur-xl backdrop-saturate-150 hover:scale-[1.02] hover:border-white/50 hover:bg-white/15 hover:text-white hover:shadow-[0_0_20px_rgba(255,255,255,0.3),0_0_40px_rgba(255,255,255,0.1)]`;

const column = "mx-auto w-full max-w-4xl px-4 lg:px-0";

export default function Home() {
  return (
    <div className="relative text-white">
      {/* Hero */}
      <section className={`${column} flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center py-16 text-center lg:min-h-[calc(100dvh-7rem)]`}>
        <Reveal>
          <span className="inline-flex items-center rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-1 text-xs font-medium uppercase tracking-[0.18em] text-cyan-200">
            Healthcare · Economics · Law · Lab Science · Software
          </span>
        </Reveal>
        <Reveal delay={100}>
          <h1 className="mt-5 text-balance text-5xl font-bold leading-[1.05] tracking-tight drop-shadow-lg sm:text-7xl">
            Master any subject by{" "}
            <span className="bg-gradient-to-r from-cyan-300 via-indigo-300 to-fuchsia-300 bg-clip-text text-transparent">
              leading AI on real work.
            </span>
          </h1>
        </Reveal>
        <Reveal delay={200}>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-white/75 sm:text-xl">
            Warm up with interactive visual primers and a 60-second Spot-the-Trap game, then step into a click-first simulated workday: interview stakeholders, brief a domain AI specialist, audit spreadsheets, legal clauses, lab SOPs, or code, and defend your work in a live Viva.
          </p>
        </Reveal>
        <Reveal delay={300}>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link href="/projects" className={primary}>
              Explore mini-courses
            </Link>
            <Link href="/projects/new" className={secondary}>
              Generate your own
            </Link>
            <TourLink className={secondary}>Watch the 30s tour</TourLink>
          </div>
        </Reveal>
      </section>

      {/* 3-Act Mini-Course Flow */}
      <section className={`${column} py-20`}>
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-300/80">3-Act Learning Studio</p>
          <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-5xl">Learn it, spot it, then live it.</h2>
          <p className="mt-4 max-w-2xl text-lg text-white/65">
            Every built-in and learner-generated course combines three interactive formats automatically—zero per-profession coding needed.
          </p>
        </Reveal>
        <ol className="mt-12 grid gap-5 md:grid-cols-3">
          {FORMATS.map((item, index) => (
            <li key={item.step}>
              <SpotlightCard delay={index * 100} className="h-full p-7">
                <span className="font-mono text-xs uppercase tracking-wider text-cyan-300/80">{item.step}</span>
                <h3 className="mt-3 text-xl font-semibold">{item.title}</h3>
                <p className="mt-3 leading-relaxed text-white/65">{item.text}</p>
              </SpotlightCard>
            </li>
          ))}
        </ol>
      </section>

      {/* Cross-Disciplinary Primitives */}
      <section className={`${column} py-20`}>
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-fuchsia-300/80">Universal Deliverable Engine</p>
          <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-5xl">Built for every faculty, not just CS.</h2>
          <p className="mt-4 max-w-2xl text-lg text-white/65">
            Four polymorphic review primitives let learners inspect authentic work artifacts row by row, clause by clause, step by step, or line by line.
          </p>
        </Reveal>
        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {PRIMITIVES.map((item, index) => (
            <SpotlightCard key={item.title} delay={(index % 2) * 100} className="h-full p-6">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-2.5 py-0.5 text-xs font-medium text-cyan-200">
                  {item.badge}
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-white/70">{item.example}</p>
            </SpotlightCard>
          ))}
        </div>
      </section>

      {/* Product tour video */}
      <section id="tour" className={`${column} scroll-mt-32 py-20`}>
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-300/80">See the desktop in action</p>
          <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-5xl">A simulated workday in 30 seconds.</h2>
          <p className="mt-4 max-w-2xl text-lg text-white/65">Follow a mission from the stakeholder&apos;s opening email to the final 4D AI Fluency report.</p>
        </Reveal>
        <Reveal delay={150} className={`mt-12 ${glass} overflow-hidden p-2 shadow-2xl sm:p-3`}>
          <video
            id="tour-player"
            controls
            playsInline
            preload="none"
            poster="/promo/devpath-tour-poster.jpg"
            className="aspect-video w-full rounded-2xl bg-black"
            aria-label="DevPath product tour: one project on the simulated desktop, from the client's email to the project report"
          >
            <source src="/promo/devpath-tour-1080.mp4" type="video/mp4" media="(min-width: 1280px)" />
            <source src="/promo/devpath-tour-720.mp4" type="video/mp4" />
          </video>
        </Reveal>
      </section>

      {/* How the desktop works */}
      <section id="how" className={`${column} scroll-mt-32 py-20`}>
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300/80">Simulated Workspace</p>
          <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-5xl">One workspace, six universal tools.</h2>
          <p className="mt-4 max-w-2xl text-lg text-white/65">Each mission brings a new field, stakeholder, and AI specialist—while building the same transferable AI Fluency habits.</p>
        </Reveal>
        <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {DOCK.map((app, index) => (
            <li key={app}>
              <SpotlightCard delay={(index % 3) * 100} className="h-full p-7">
                <div className="flex items-center justify-between">
                  <AppIcon app={app} size={52} />
                  <span className="font-mono text-sm text-white/35">0{index + 1}</span>
                </div>
                <h3 className="mt-5 text-xl font-semibold">{app === "cody" ? "AI Specialist" : appName(app, null)}</h3>
                <p className="mt-2 leading-relaxed text-white/65">{DESK[app]}</p>
              </SpotlightCard>
            </li>
          ))}
        </ol>
      </section>

      {/* Cast */}
      <section className={`${column} py-20`}>
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-fuchsia-300/80">Interactive Role Play</p>
          <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-5xl">AI plays the people you collaborate with.</h2>
          <p className="mt-4 max-w-2xl text-lg text-white/65">
            Your stakeholder and AI specialist respond to your free-text questions, briefs, review explanations, and Viva answers—anchored to a fair, deterministic state machine.
          </p>
        </Reveal>
        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {TEAM.map((person, index) => (
            <SpotlightCard key={person.name} delay={(index % 2) * 100} className="h-full p-6">
              <div className="flex items-center justify-between gap-3">
                {person.name === "Your AI specialist" ? (
                  <AppIcon app="cody" size={48} />
                ) : (
                  <Avatar initials={TEAM_AVATAR[person.name].initials} tone={TEAM_AVATAR[person.name].tone} size={48} />
                )}
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${
                    person.ai ? "bg-blue-400/15 text-blue-200 ring-blue-400/30" : "bg-white/5 text-white/55 ring-white/15"
                  }`}
                >
                  {person.ai ? "Played by AI" : "Scripted"}
                </span>
              </div>
              <h3 className="mt-4 text-lg font-semibold">{person.name}</h3>
              <p className="mt-2 leading-relaxed text-white/70">{person.note}</p>
            </SpotlightCard>
          ))}
        </div>
      </section>

      {/* Personalisation */}
      <section className={`${column} py-20`}>
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-300/80">Learner-Generated Courses</p>
          <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-5xl">Tailored to your major and level.</h2>
          <p className="mt-4 max-w-2xl text-lg text-white/65">Whether you study nursing, law, economics, chemistry, or computer science, every generated course gets full interactive parity.</p>
        </Reveal>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {FOR_YOU.map((item, index) => (
            <SpotlightCard key={item.title} delay={index * 100} className="h-full p-7">
              <h3 className="text-xl font-semibold">{item.title}</h3>
              <p className="mt-3 leading-relaxed text-white/65">{item.text}</p>
            </SpotlightCard>
          ))}
        </div>
      </section>

      {/* Endings and 4D report */}
      <section className={`${column} py-20`}>
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300/80">4D AI Fluency + Concept Mastery</p>
          <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-5xl">Evidence-backed feedback, not multiple choice.</h2>
          <p className="mt-4 max-w-2xl text-lg text-white/65">
            At the end of every mission, your report evaluates Delegation, Description, Discernment, and Diligence (including your Live Viva defense) alongside the domain concepts you prevented, caught, or missed.
          </p>
        </Reveal>
        <ul className="mt-10 grid gap-5 md:grid-cols-3">
          {ENDINGS.map((ending, index) => (
            <li key={ending.label}>
              <SpotlightCard delay={index * 100} className="h-full p-5">
                <p className={`text-sm font-semibold ${ending.tone}`}>{ending.label}</p>
                <p className="mt-2 text-white/70">{ending.text}</p>
              </SpotlightCard>
            </li>
          ))}
        </ul>
        <Reveal delay={150} className={`mt-5 ${glass} p-6 shadow-2xl sm:p-8`}>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">Mission report</p>
          <p className="mt-1 text-xl font-semibold">How you collaborated with AI (Anthropic 4D Fluency)</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {FLUENCY.map((item) => (
              <div key={item.title} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{item.title}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${RATING[item.rating]}`}>{item.rating}</span>
                </div>
                <p className="mt-2 text-sm text-white/60">{item.text}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-xl font-semibold">Domain concepts in action</p>
          <div className="mt-4 rounded-2xl border border-teal-300/20 bg-teal-400/[0.06] p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold">Incidence rates vs raw counts</p>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${RATING.strong}`}>Caught in spreadsheet</span>
            </div>
            <p className="mt-2 text-sm text-white/60">
              When ward occupancy drops from 600 to 250 patient-days, fewer raw cases (12 → 8) actually mask a higher infection rate (20 → 32 per 1,000 patient-days).
            </p>
            <p className="mt-2 text-sm text-white/60"><span className="text-white/80">Your audit &amp; Viva:</span> flagged the unweighted summary row and defended denominator adjustment clearly.</p>
          </div>
        </Reveal>
      </section>

      {/* Instructors */}
      <section className={`${column} py-20`}>
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-300/80">For instructors across faculties</p>
          <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-5xl">Bring your seminar or cohort.</h2>
        </Reveal>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {TEACHERS.map((item, index) => (
            <SpotlightCard key={item.title} delay={index * 100} className="h-full p-7">
              <h3 className="text-xl font-semibold">{item.title}</h3>
              <p className="mt-3 leading-relaxed text-white/65">{item.text}</p>
            </SpotlightCard>
          ))}
        </div>
      </section>

      {/* Closing call to action */}
      <section className={`${column} pb-24 pt-10 text-center`}>
        <Reveal>
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-5xl">Ready to lead your first mission?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/65">
            Start with one of seven built-in courses across five disciplines, or generate one for your own major in a minute.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/projects" className={primary}>
              Explore mini-courses
            </Link>
            <Link href="/projects/new" className={secondary}>
              Create or remix
            </Link>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-white/10 bg-black/40 px-4 py-6 text-center text-sm text-white/40 backdrop-blur">
        DevPath · Universal AI-Fluency Mini-Course &amp; Simulation Platform · PolyU COMP5241
      </footer>
    </div>
  );
}
