import type { ArtifactKind, ProjectConcept, ProjectScenario } from "./types";

/*
 * Universal 3-Act Generative Mini-Course builder.
 *
 * Turns ANY ProjectScenario (built-in, instructor-customised, or student-generated
 * in any academic discipline) into a browser-safe interactive pre-simulation warm-up:
 *   Act 1: Interactive Animated Visual Primer Cards
 *   Act 2: 60s "Spot-the-Trap" Rapid Judgment Mini-Game
 *   Act 3: Handoff into the Live Desktop Simulation + Sign-Off Viva
 *
 * Security boundary: never copies scenario.facts, scenario.variants,
 * scenario.requirements, or scenario.brief into the returned MiniCourse.
 */

export type DiagramKind = "cast" | "denominator" | "timeline" | "stratify" | "guardrail" | "fluency";

export interface PrimerSlide {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  diagram: DiagramKind;
  /** Optional side-by-side callouts (e.g. Analogy vs Common Trap). */
  callouts?: {
    goodLabel: string;
    goodText: string;
    trapLabel: string;
    trapText: string;
  };
  /** Optional field cue telling the learner what to pay attention to on the job. */
  watchFor?: string;
}

export interface TrapGameCard {
  id: string;
  conceptTag: string;
  speaker: string;
  statement: string;
  verdict: "sound" | "trap";
  explanation: string;
}

export interface MiniCourse {
  scenarioId: string;
  title: string;
  tagline: string;
  summary: string;
  domain: string;
  deliverable: string;
  artifactKind: ArtifactKind;
  client: { name: string; role: string; organisation: string };
  assistant: { name: string; kind: string };
  concepts: { name: string; summary: string }[];
  slides: PrimerSlide[];
  gameCards: TrapGameCard[];
}

const FALLBACK_CONCEPTS = (scenario: ProjectScenario): ProjectConcept[] => [
  {
    id: "problem",
    name: "Root-cause verification",
    fact: "F1",
    variant: "misses-problem",
    explanation:
      "Clients often ask for the first solution they picture rather than describing the underlying bottleneck. Checking how the problem actually happens in practice prevents building polished work that leaves the real failure untouched.",
    bridge:
      "Buying a bigger bucket under a dripping ceiling looks busy, whereas turning off the upstairs valve stops the leak.",
    misconception: "Building the exact feature the client first asked for guarantees their problem is solved.",
    inTheJob: `Ask ${scenario.client.name} when and how the problem occurs before briefing ${scenario.assistant.name}.`,
    cues: [],
  },
  {
    id: "rule",
    name: "Non-negotiable guardrails",
    fact: "F2",
    variant: "misses-rule",
    explanation:
      "Every domain has safety, privacy, compatibility, or quality constraints that an AI assistant will happily skip in pursuit of speed unless your brief states them explicitly.",
    bridge:
      "Telling a courier 'get here as fast as possible' without mentioning fragile glassware invites a broken box.",
    misconception: "An AI specialist automatically knows which compliance or safety rules apply to your organisation.",
    inTheJob: `Ask ${scenario.client.name} what must never be broken, then state that rule plainly in your brief.`,
    cues: [],
  },
];

export function inferDiagramKind(concept: ProjectConcept): DiagramKind {
  const s = `${concept.name} ${concept.explanation}`.toLowerCase();
  if (/(rate|count|denominator|occupancy|ratio|blank|absorbance|scale|zero)/.test(s)) return "denominator";
  if (/(race|time|concurrent|queue|cycle|bottleneck|chain|holding|idempoten|retry)/.test(s)) return "timeline";
  if (/(confound|stratif|selection|sample|bias|cohort|regression|compatib)/.test(s)) return "stratify";
  return "guardrail";
}

function firstSentence(text: string): string {
  const match = text.trim().match(/^[^.!?]+[.!?]/);
  return match ? match[0].trim() : text.trim();
}

function deterministicOrder<T>(items: T[], seedText: string): T[] {
  let seed = 2166136261;
  for (let i = 0; i < seedText.length; i++) {
    seed ^= seedText.charCodeAt(i);
    seed = Math.imul(seed, 16777619);
  }
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    const j = Math.abs(seed) % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const ARTIFACT_LABEL: Record<ArtifactKind, string> = {
  code: "code & test diff",
  table: "structured data table",
  document: "clause-by-clause document",
  steps: "step-by-step protocol SOP",
};

export function buildMiniCourse(scenario: ProjectScenario): MiniCourse {
  const artifactKind: ArtifactKind = scenario.artifactKind ?? "code";
  const deliverable = scenario.words.deliverable || "the deliverable";
  const domain = scenario.domain ?? scenario.assistant.kind;
  const concepts = scenario.concepts && scenario.concepts.length >= 2 ? scenario.concepts.slice(0, 2) : FALLBACK_CONCEPTS(scenario);

  const slides: PrimerSlide[] = [
    {
      id: "mission",
      eyebrow: `01 · Mission Framing · ${domain}`,
      title: scenario.title,
      body: `${scenario.summary} You can review ${scenario.assistant.name}'s work in Overview mode or inspect the ${ARTIFACT_LABEL[artifactKind]} entry by entry.`,
      diagram: "cast",
      callouts: {
        goodLabel: "Your Stakeholder",
        goodText: `${scenario.client.name} (${scenario.client.role}, ${scenario.client.organisation}) knows the real-world context—ask open questions before promising a solution.`,
        trapLabel: "Your AI Teammate",
        trapText: `${scenario.assistant.name} (${scenario.assistant.kind}) works fast and literally from your brief—any unstated rule becomes a confident mistake.`,
      },
    },
  ];

  concepts.forEach((concept, idx) => {
    const num = idx + 1;
    const diagram = inferDiagramKind(concept);
    slides.push({
      id: `concept-${num}-how`,
      eyebrow: `0${slides.length + 1} · Core Concept ${num} of ${concepts.length}`,
      title: concept.name,
      body: concept.explanation,
      diagram,
      watchFor: concept.inTheJob,
    });
    slides.push({
      id: `concept-${num}-trap`,
      eyebrow: `0${slides.length + 1} · Mental Model vs Classic Trap`,
      title: `Spotting ${concept.name.toLowerCase()} in the wild`,
      body: `Fast AI drafts often sound persuasive even when built on a textbook misconception. Compare the everyday mental model against the trap ${scenario.assistant.name} can fall into.`,
      diagram,
      callouts: {
        goodLabel: "Everyday Analogy",
        goodText: concept.bridge,
        trapLabel: "Tempting Misconception",
        trapText: `“${concept.misconception}”`,
      },
      watchFor: concept.inTheJob,
    });
  });

  slides.push({
    id: "fluency-playbook",
    eyebrow: `0${slides.length + 1} · 4D AI Fluency Playbook`,
    title: `How to lead ${scenario.assistant.name} on ${deliverable}`,
    body: "Your simulation run is evaluated on four AI Fluency habits—from deciding when NOT to delegate yet, all the way to defending your choices in a live stakeholder Viva before sign-off.",
    diagram: "fluency",
    callouts: {
      goodLabel: "Before & During Build",
      goodText: "1. Interview the client first (Delegation) · 2. State measurable targets & guardrails in your brief (Description).",
      trapLabel: "Review & Sign-Off",
      trapText: "3. Catch & explain subtle flaws (Discernment) · 4. Pass the Live Viva & verify impact at launch (Diligence).",
    },
  });

  const rawCards: TrapGameCard[] = [
    {
      id: "delegation-rush",
      conceptTag: "AI Fluency · Delegation",
      speaker: "Rushed Shortcut",
      statement: `“${scenario.client.name}'s first email already asks for a solution—let's send it straight to ${scenario.assistant.name} so we save call time.”`,
      verdict: "trap",
      explanation: `Stakeholders often ask for a solution they heard about rather than naming the underlying problem or constraints. Briefing ${scenario.assistant.name} blind wastes time on the wrong build.`,
    },
    ...concepts.flatMap((concept, idx): TrapGameCard[] => [
      {
        id: `trap-${idx + 1}`,
        conceptTag: concept.name,
        speaker: `Overconfident Draft (${scenario.assistant.name})`,
        statement: `“${concept.misconception}”`,
        verdict: "trap",
        explanation: `${firstSentence(concept.explanation)} Analogy: ${concept.bridge}`,
      },
      {
        id: `sound-${idx + 1}`,
        conceptTag: concept.name,
        speaker: "Rigorous Lead Check",
        statement: concept.inTheJob,
        verdict: "sound",
        explanation: `Spot on—checking this directly tests ${concept.name.toLowerCase()} before anything reaches real people.`,
      },
    ]),
  ];

  return {
    scenarioId: scenario.id,
    title: scenario.title,
    tagline: scenario.tagline,
    summary: scenario.summary,
    domain,
    deliverable,
    artifactKind,
    client: {
      name: scenario.client.name,
      role: scenario.client.role,
      organisation: scenario.client.organisation,
    },
    assistant: {
      name: scenario.assistant.name,
      kind: scenario.assistant.kind,
    },
    concepts: concepts.map((c) => ({ name: c.name, summary: firstSentence(c.explanation) })),
    slides,
    gameCards: deterministicOrder(rawCards, scenario.id),
  };
}
