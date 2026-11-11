"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { glass } from "@/components/home/glass";
import type { DiagramKind, MiniCourse } from "@/lib/projects/minicourse";
import { play, unlockSound } from "@/lib/sound";

const ARTIFACT_BADGE: Record<MiniCourse["artifactKind"], string> = {
  code: "Code & Test Diff",
  table: "Data Workbook",
  document: "Policy & Clauses",
  steps: "Lab / Field SOP",
};

type LensMode = "both" | "trap" | "sound";

function LensSwitcher({ lens, onChange }: { lens: LensMode; onChange: (next: LensMode) => void }) {
  const items: [LensMode, string][] = [
    ["both", "⇄ Compare Both"],
    ["trap", "⚠ Naive Trap"],
    ["sound", "✓ Calibrated Fix"],
  ];
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Interactive diagram lens">
      {items.map(([id, label]) => {
        const active = lens === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => {
              unlockSound();
              play("open");
              onChange(id);
            }}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
              active
                ? "border-cyan-300 bg-cyan-300/20 text-cyan-100"
                : "border-white/15 bg-white/[0.04] text-white/65 hover:border-white/35 hover:text-white"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function ConceptDiagram({ kind, course, stepIndex }: { kind: DiagramKind; course: MiniCourse; stepIndex: number }) {
  const [lens, setLens] = useState<LensMode>("both");
  const showTrap = lens !== "sound";
  const showSound = lens !== "trap";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-slate-950/90 via-indigo-950/60 to-slate-900/90 p-5">
      <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-cyan-400/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-fuchsia-400/10 blur-2xl" />

      {kind === "cast" && (
        <div className="relative grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-rose-300/25 bg-rose-400/[0.07] p-3.5">
            <p className="font-mono text-[11px] uppercase tracking-wider text-rose-200/80">Stakeholder</p>
            <p className="mt-1 font-semibold text-white">{course.client.name}</p>
            <p className="text-xs text-white/60">{course.client.role} · {course.client.organisation}</p>
          </div>
          <div className="rounded-xl border border-cyan-300/35 bg-cyan-400/[0.1] p-3.5 ring-1 ring-cyan-300/20">
            <p className="font-mono text-[11px] uppercase tracking-wider text-cyan-200">You (Project Lead)</p>
            <p className="mt-1 font-semibold text-white">Investigate · Brief · Audit</p>
            <p className="text-xs text-white/70">Deliverable: {ARTIFACT_BADGE[course.artifactKind]}</p>
          </div>
          <div className="rounded-xl border border-indigo-300/25 bg-indigo-400/[0.08] p-3.5">
            <p className="font-mono text-[11px] uppercase tracking-wider text-indigo-200/80">AI Specialist</p>
            <p className="mt-1 font-semibold text-white">{course.assistant.name}</p>
            <p className="text-xs text-white/60">{course.assistant.kind}</p>
          </div>
        </div>
      )}

      {kind === "denominator" && (
        <div className="relative space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/60">
            <span className="font-mono uppercase tracking-wider text-cyan-200/90">Scale & Baseline Simulator</span>
            <LensSwitcher lens={lens} onChange={setLens} />
          </div>
          <div className={`grid gap-3 ${lens === "both" ? "sm:grid-cols-2" : "grid-cols-1"}`}>
            {showTrap && (
              <div className="rounded-xl border border-rose-300/25 bg-black/35 p-3.5 transition-all">
                <p className="text-xs font-medium text-rose-200">Surface Reading (Unadjusted Raw Count)</p>
                <div className="mt-2.5 flex items-end gap-3">
                  <div className="w-12 rounded-t bg-rose-400/55 transition-all duration-500" style={{ height: stepIndex % 2 === 0 ? 50 : 42 }} />
                  <div className="w-12 rounded-t bg-emerald-400/50 transition-all duration-500" style={{ height: 28 }} />
                  <p className="text-xs text-white/70">Looks smaller at a glance when exposure or baseline shifts unseen.</p>
                </div>
              </div>
            )}
            {showSound && (
              <div className="rounded-xl border border-teal-300/30 bg-teal-400/[0.08] p-3.5 transition-all">
                <p className="text-xs font-medium text-teal-200">Calibrated Rate / True Blank</p>
                <div className="mt-2.5 flex items-end gap-3">
                  <div className="w-12 rounded-t bg-teal-300/55 transition-all duration-500" style={{ height: 26 }} />
                  <div className="w-12 rounded-t bg-amber-300/80 transition-all duration-500" style={{ height: 48 }} />
                  <p className="text-xs text-white/80">Dividing by true exposure or zeroing on a clean blank exposes the real direction.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {kind === "timeline" && (
        <div className="relative space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/60">
            <span className="font-mono uppercase tracking-wider text-cyan-200/90">Timing & Flow Simulator</span>
            <LensSwitcher lens={lens} onChange={setLens} />
          </div>
          <div className="space-y-2.5 rounded-xl border border-white/10 bg-black/35 p-3.5">
            {showTrap && (
              <div className="flex items-center gap-2 text-xs">
                <span className="w-24 shrink-0 font-medium text-rose-200">Unguarded</span>
                <div className="flex flex-1 items-center gap-1.5">
                  <span className="h-2.5 w-1/3 animate-pulse rounded-full bg-rose-400/75" />
                  <span className="h-2.5 w-1/3 animate-pulse rounded-full bg-amber-400/75" />
                  <span className="rounded bg-rose-500/25 px-2 py-0.5 text-[11px] text-rose-200">Collision · Delay · Decay</span>
                </div>
              </div>
            )}
            {showSound && (
              <div className="flex items-center gap-2 text-xs">
                <span className="w-24 shrink-0 font-medium text-emerald-200">Controlled</span>
                <div className="flex flex-1 items-center gap-1.5">
                  <span className="h-2.5 w-1/4 rounded-full bg-emerald-400/85" />
                  <span className="h-2.5 w-1/4 rounded-full bg-cyan-400/85" />
                  <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[11px] text-emerald-200">Atomic · Fast · Preserved</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {kind === "stratify" && (
        <div className="relative space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/60">
            <span className="font-mono uppercase tracking-wider text-cyan-200/90">Cohort & Baseline Separation</span>
            <LensSwitcher lens={lens} onChange={setLens} />
          </div>
          <div className={`grid items-center gap-3 ${lens === "trap" ? "grid-cols-1" : lens === "sound" ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
            {showTrap && (
              <div className="rounded-xl border border-amber-300/20 bg-black/35 p-3 text-center">
                <p className="text-xs text-amber-200">Pooled Mix (Blended)</p>
                <div className="mt-2 flex justify-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-cyan-300" />
                  <span className="h-3 w-3 rounded-full bg-fuchsia-400" />
                  <span className="h-3 w-3 rounded-full bg-cyan-300" />
                  <span className="h-3 w-3 rounded-full bg-fuchsia-400" />
                </div>
                <p className="mt-1.5 text-[11px] text-amber-200/85">Confounder hides true trend</p>
              </div>
            )}
            {showSound && (
              <>
                <div className="rounded-xl border border-cyan-300/25 bg-cyan-400/[0.07] p-3 text-center">
                  <p className="text-xs text-cyan-200">Baseline Group A</p>
                  <div className="mt-2 flex justify-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-cyan-300" />
                    <span className="h-3 w-3 rounded-full bg-cyan-300" />
                    <span className="h-3 w-3 rounded-full bg-cyan-300" />
                  </div>
                  <p className="mt-1.5 text-[11px] text-white/75">Checked intact</p>
                </div>
                <div className="rounded-xl border border-fuchsia-300/25 bg-fuchsia-400/[0.07] p-3 text-center">
                  <p className="text-xs text-fuchsia-200">High-Risk / Edge Group B</p>
                  <div className="mt-2 flex justify-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-fuchsia-400" />
                    <span className="h-3 w-3 rounded-full bg-fuchsia-400" />
                  </div>
                  <p className="mt-1.5 text-[11px] text-white/75">Tracked separately</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {kind === "guardrail" && (
        <div className="relative space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/60">
            <span className="font-mono uppercase tracking-wider text-cyan-200/90">Explicit Guardrail Simulator</span>
            <LensSwitcher lens={lens} onChange={setLens} />
          </div>
          <div className={`grid gap-3 ${lens === "both" ? "sm:grid-cols-2" : "grid-cols-1"}`}>
            {showTrap && (
              <div className="rounded-xl border border-rose-300/25 bg-rose-400/[0.07] p-3">
                <p className="text-xs font-semibold text-rose-200">Shortcut Default</p>
                <p className="mt-1 text-xs text-white/70">Optimises convenience while quietly crossing privacy, compliance, or behavioural norms.</p>
              </div>
            )}
            {showSound && (
              <div className="rounded-xl border border-emerald-300/30 bg-emerald-400/[0.08] p-3">
                <p className="text-xs font-semibold text-emerald-200">Explicit Boundary</p>
                <p className="mt-1 text-xs text-white/80">Selected directly in requirements & brief, then verified in the delivered artifact.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {kind === "fluency" && (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {[
            ["01 Delegation", "Interview before briefing"],
            ["02 Description", "Select targets & guardrails"],
            ["03 Discernment", "Audit & diagnose AI flaws"],
            ["04 Diligence", "Pass Viva & measure launch"],
          ].map(([label, desc]) => (
            <div key={label} className="rounded-xl border border-white/15 bg-white/[0.05] p-3">
              <p className="font-mono text-xs font-semibold text-cyan-200">{label}</p>
              <p className="mt-1 text-xs text-white/65">{desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function MiniCourseStudio({
  course,
  backHref = "/projects",
  backLabel = "All courses",
}: {
  course: MiniCourse;
  backHref?: string;
  backLabel?: string;
}) {
  const [act, setAct] = useState<"primer" | "game" | "ready">("primer");
  const [slideIdx, setSlideIdx] = useState(0);

  // Mini-game state
  const [cardIdx, setCardIdx] = useState(0);
  const [picked, setPicked] = useState<"sound" | "trap" | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  const slide = course.slides[slideIdx];
  const card = course.gameCards[cardIdx];

  const chooseVerdict = useCallback(
    (choice: "sound" | "trap") => {
      if (picked || !card) return;
      unlockSound();
      setPicked(choice);
      const right = choice === card.verdict;
      if (right) {
        play("review-right");
        setScore((s) => s + 1);
        setStreak((prev) => {
          const next = prev + 1;
          setBestStreak((b) => Math.max(b, next));
          return next;
        });
      } else {
        play("review-wrong");
        setStreak(0);
      }
    },
    [picked, card],
  );

  const nextGameCard = useCallback(() => {
    unlockSound();
    if (cardIdx < course.gameCards.length - 1) {
      play("open");
      setCardIdx((i) => i + 1);
      setPicked(null);
    } else {
      play("success");
      setAct("ready");
    }
  }, [cardIdx, course.gameCards.length]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;

      if (act === "primer") {
        if (event.key === "ArrowRight") {
          event.preventDefault();
          unlockSound();
          if (slideIdx < course.slides.length - 1) {
            play("open");
            setSlideIdx((i) => i + 1);
          } else {
            play("fact");
            setAct("game");
          }
        } else if (event.key === "ArrowLeft" && slideIdx > 0) {
          event.preventDefault();
          setSlideIdx((i) => Math.max(0, i - 1));
        }
      } else if (act === "game") {
        if (picked === null) {
          if (event.key === "1") chooseVerdict("sound");
          if (event.key === "2") chooseVerdict("trap");
        } else if (event.key === "ArrowRight" || event.key === "Enter") {
          event.preventDefault();
          nextGameCard();
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [act, slideIdx, course.slides.length, picked, chooseVerdict, nextGameCard]);

  function restartGame() {
    setCardIdx(0);
    setPicked(null);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setAct("game");
  }

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-8 text-white lg:px-0 lg:pt-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={backHref} className="text-sm text-white/60 transition hover:text-white">
          ← {backLabel}
        </Link>
        <Link
          href={`/projects/${course.scenarioId}`}
          className="rounded-full border border-white/20 bg-white/[0.06] px-4 py-1.5 text-xs font-medium text-white/85 transition hover:border-white/50 hover:bg-white/15"
        >
          Skip warm-up → Open Desktop
        </Link>
      </div>

      {/* Header */}
      <div className="mt-5">
        <div className="flex flex-wrap items-center gap-2 text-xs text-cyan-200/90">
          <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-0.5 font-medium uppercase tracking-wider">
            3-Act Click-First Mini-Course
          </span>
          <span className="rounded-full border border-white/15 bg-white/5 px-3 py-0.5 text-white/70">
            {course.domain}
          </span>
          <span className="rounded-full border border-white/15 bg-white/5 px-3 py-0.5 text-white/70">
            {ARTIFACT_BADGE[course.artifactKind]}
          </span>
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">{course.title}</h1>
        <p className="mt-2 max-w-2xl text-base text-white/65 sm:text-lg">{course.tagline}</p>
      </div>

      {/* 3-Act Switcher */}
      <div className="mt-7 grid gap-2.5 sm:grid-cols-3" role="tablist" aria-label="Mini-course stages">
        {[
          { id: "primer" as const, step: "Act 01", title: "Visual Primer", sub: `${course.slides.length} interactive cards` },
          { id: "game" as const, step: "Act 02", title: "Spot-the-Trap Game", sub: `${course.gameCards.length} rapid judgments` },
          { id: "ready" as const, step: "Act 03", title: "Simulated Workday", sub: "Zero-typing desktop & Viva" },
        ].map((tab) => {
          const active = act === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                unlockSound();
                play("open");
                setAct(tab.id);
              }}
              className={`rounded-2xl border p-4 text-left transition ${
                active
                  ? "border-cyan-300 bg-cyan-300/12 shadow-[0_0_25px_rgba(103,232,249,0.12)]"
                  : "border-white/15 bg-white/[0.04] hover:border-white/35 hover:bg-white/[0.08]"
              }`}
            >
              <span className="font-mono text-xs text-cyan-200/80">{tab.step}</span>
              <span className="mt-0.5 block font-semibold">{tab.title}</span>
              <span className="mt-0.5 block text-xs text-white/55">{tab.sub}</span>
            </button>
          );
        })}
      </div>

      {/* ACT 1: VISUAL PRIMER SLIDES */}
      {act === "primer" && slide && (
        <section className={`${glass} mt-6 p-6 sm:p-8`} aria-label="Visual Primer">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="flex items-center gap-1.5">
              {course.slides.map((s, idx) => (
                <button
                  key={s.id}
                  type="button"
                  aria-label={`Slide ${idx + 1}: ${s.title}`}
                  onClick={() => {
                    unlockSound();
                    play("open");
                    setSlideIdx(idx);
                  }}
                  className={`h-2 rounded-full transition-all ${
                    idx === slideIdx ? "w-8 bg-cyan-300" : idx < slideIdx ? "w-3 bg-cyan-300/45" : "w-2.5 bg-white/20 hover:bg-white/40"
                  }`}
                />
              ))}
              <span className="ml-2 font-mono text-xs text-white/50">
                {slideIdx + 1} / {course.slides.length}
              </span>
            </div>

            <span className="font-mono text-xs text-white/45">
              Tip: click diagram toggles or press ← / →
            </span>
          </div>

          {/* Slide content */}
          <div className="mt-6">
            <p className="font-mono text-xs uppercase tracking-wider text-cyan-300/85">{slide.eyebrow}</p>
            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">{slide.title}</h2>
            <p className="mt-3 text-base leading-relaxed text-white/80">{slide.body}</p>

            <div className="mt-5">
              <ConceptDiagram key={slide.id} kind={slide.diagram} course={course} stepIndex={slideIdx} />
            </div>

            {slide.callouts && (
              <div className="mt-5 grid gap-3.5 sm:grid-cols-2">
                <div className="rounded-2xl border border-emerald-300/25 bg-emerald-400/[0.07] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-200">{slide.callouts.goodLabel}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/85">{slide.callouts.goodText}</p>
                </div>
                <div className="rounded-2xl border border-amber-300/25 bg-amber-400/[0.07] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-200">{slide.callouts.trapLabel}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/85">{slide.callouts.trapText}</p>
                </div>
              </div>
            )}

            {slide.watchFor && (
              <div className="mt-4 rounded-2xl border border-cyan-300/20 bg-cyan-400/[0.06] px-4 py-3 text-sm text-cyan-100/90">
                <span className="font-semibold text-cyan-200">On the desktop: </span>
                {slide.watchFor}
              </div>
            )}
          </div>

          {/* Slide Navigation */}
          <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
            <button
              type="button"
              disabled={slideIdx === 0}
              onClick={() => setSlideIdx((i) => Math.max(0, i - 1))}
              className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium text-white/80 transition hover:border-white/50 disabled:opacity-35"
            >
              ← Previous
            </button>

            {slideIdx < course.slides.length - 1 ? (
              <button
                type="button"
                onClick={() => {
                  unlockSound();
                  play("open");
                  setSlideIdx((i) => i + 1);
                }}
                className="rounded-full bg-white px-6 py-2.5 text-sm font-medium text-black transition hover:bg-white/85"
              >
                Next card →
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  unlockSound();
                  play("fact");
                  setAct("game");
                }}
                className="rounded-full bg-gradient-to-r from-cyan-300 to-indigo-300 px-6 py-2.5 text-sm font-semibold text-slate-950 transition hover:opacity-90"
              >
                Start Act 02: Spot-the-Trap Game →
              </button>
            )}
          </div>
        </section>
      )}

      {/* ACT 2: SPOT-THE-TRAP MINI-GAME */}
      {act === "game" && card && (
        <section className={`${glass} mt-6 p-6 sm:p-8`} aria-label="Spot-the-Trap Mini-Game">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-fuchsia-300">
                Card {cardIdx + 1} of {course.gameCards.length} · {card.conceptTag}
              </p>
              <p className="mt-0.5 text-sm text-white/60">One click: decide whether this statement is a sound practice or a hidden trap.</p>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-white/85">
                Score {score}/{course.gameCards.length}
              </span>
              <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-amber-200">
                Streak {streak}🔥
              </span>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-white/15 bg-black/35 p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/50">{card.speaker}</p>
            <p className="mt-3 text-lg font-medium leading-relaxed text-white sm:text-xl">{card.statement}</p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={picked !== null}
              onClick={() => chooseVerdict("sound")}
              className={`rounded-2xl border p-4 text-left transition ${
                picked === null
                  ? "border-emerald-300/30 bg-emerald-400/[0.07] hover:border-emerald-300 hover:bg-emerald-400/15"
                  : card.verdict === "sound"
                    ? "border-emerald-300 bg-emerald-400/20 ring-1 ring-emerald-300"
                    : picked === "sound"
                      ? "border-rose-400 bg-rose-400/20"
                      : "border-white/10 opacity-45"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold text-emerald-200">✓ Sound Practice</span>
                <span className="rounded border border-white/15 px-1.5 py-0.5 font-mono text-[10px] text-white/45">Key 1</span>
              </div>
              <span className="mt-1 block text-xs text-white/65">Protects quality, accuracy, and stakeholder constraints.</span>
            </button>

            <button
              type="button"
              disabled={picked !== null}
              onClick={() => chooseVerdict("trap")}
              className={`rounded-2xl border p-4 text-left transition ${
                picked === null
                  ? "border-amber-300/30 bg-amber-400/[0.07] hover:border-amber-300 hover:bg-amber-400/15"
                  : card.verdict === "trap"
                    ? "border-emerald-300 bg-emerald-400/20 ring-1 ring-emerald-300"
                    : picked === "trap"
                      ? "border-rose-400 bg-rose-400/20"
                      : "border-white/10 opacity-45"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold text-amber-200">⚠ Hidden Trap</span>
                <span className="rounded border border-white/15 px-1.5 py-0.5 font-mono text-[10px] text-white/45">Key 2</span>
              </div>
              <span className="mt-1 block text-xs text-white/65">Sounds quick and confident, yet rests on a misconception.</span>
            </button>
          </div>

          {picked !== null && (
            <div
              className={`mt-5 rounded-2xl border p-4 ${
                picked === card.verdict
                  ? "border-emerald-300/35 bg-emerald-400/10 text-emerald-50"
                  : "border-rose-300/35 bg-rose-400/10 text-rose-50"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">
                  {picked === card.verdict ? "Sharp eye — you nailed it!" : `Not quite — that one was a ${card.verdict === "trap" ? "Hidden Trap" : "Sound Practice"}.`}
                </p>
                <button
                  type="button"
                  onClick={nextGameCard}
                  className="rounded-full bg-white px-5 py-2 text-xs font-semibold text-black transition hover:bg-white/85"
                >
                  {cardIdx < course.gameCards.length - 1 ? "Next challenge →" : "See mission handoff →"}
                </button>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-white/85">{card.explanation}</p>
            </div>
          )}
        </section>
      )}

      {/* ACT 3: MISSION HANDOFF */}
      {act === "ready" && (
        <section className={`${glass} mt-6 p-6 sm:p-8`} aria-label="Enter Simulated Workday">
          <p className="font-mono text-xs uppercase tracking-wider text-emerald-300">Act 03 · Ready for Live Simulation</p>
          <h2 className="mt-2 text-2xl font-bold sm:text-3xl">Step onto the desktop and lead {course.title}</h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-white/75">
            You spotted <span className="font-semibold text-white">{score} of {course.gameCards.length}</span> judgment cards
            {bestStreak > 1 ? ` (best streak: ${bestStreak} in a row)` : ""}. Every step on the simulated desktop—from interviewing{" "}
            <span className="text-white">{course.client.name}</span> to briefing{" "}
            <span className="text-white">{course.assistant.name}</span> and passing the Live Viva—is built around fast, interactive decision cards with zero mandatory typing.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {course.concepts.map((c, idx) => (
              <div key={c.name} className="rounded-2xl border border-teal-300/25 bg-teal-400/[0.06] p-4">
                <p className="font-mono text-xs text-teal-200">Concept 0{idx + 1}</p>
                <p className="mt-1 font-semibold text-white">{c.name}</p>
                <p className="mt-1 text-sm text-white/70">{c.summary}</p>
              </div>
            ))}
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href={`/projects/${course.scenarioId}`}
              className="inline-flex rounded-full bg-white px-7 py-3 text-[15px] font-semibold text-black transition hover:bg-white/85"
            >
              Launch Simulated Desktop →
            </Link>
            <button
              type="button"
              onClick={restartGame}
              className="inline-flex rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-white/80 transition hover:border-white/50 hover:bg-white/10"
            >
              Replay Spot-the-Trap
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
