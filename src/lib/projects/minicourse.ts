import type { ArtifactKind, ProjectConcept, ProjectScenario, StructuredDiagram } from "./types";

/*
 * Universal 3-Act Generative Mini-Course builder.
 *
 * Turns ANY ProjectScenario (built-in, instructor-customised, or student-generated
 * in any academic discipline) into a browser-safe interactive pre-simulation warm-up:
 *   Act 1: Interactive Animated Visual Primer Cards (with Structured SVG Node-Edge Diagrams)
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
  /** Structured node-edge graph rendered by our lightweight SVG engine (0 extra tokens at read time). */
  structuredDiagram: StructuredDiagram;
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

function clip(text: string, max: number): string {
  const clean = text.trim().replace(/\s+/g, " ");
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
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

function buildMissionDiagram(scenario: ProjectScenario, artifactKind: ArtifactKind): StructuredDiagram {
  return {
    caption: `Mission workflow: leading ${scenario.assistant.name} on ${scenario.client.organisation}'s deliverable`,
    nodes: [
      {
        id: "client",
        label: scenario.client.name,
        detail: clip(`${scenario.client.role} · ${scenario.client.organisation}`, 46),
        tone: "neutral",
        lane: "shared",
      },
      {
        id: "rush-brief",
        label: "Forward email blind",
        detail: `Skip discovery & brief ${scenario.assistant.name}`,
        tone: "trap",
        lane: "trap",
      },
      {
        id: "flawed-ship",
        label: "Hidden flaw ships",
        detail: "Builds surface request, misses rules",
        tone: "trap",
        lane: "trap",
      },
      {
        id: "lead-audit",
        label: "Interview & guardrails",
        detail: "Uncover root problem, rule & metric",
        tone: "accent",
        lane: "sound",
      },
      {
        id: "verified-work",
        label: `Audit ${ARTIFACT_LABEL[artifactKind]}`,
        detail: `${scenario.assistant.name} builds, you verify`,
        tone: "sound",
        lane: "sound",
      },
    ],
    edges: [
      { from: "client", to: "rush-brief", label: "Rushed", style: "dashed" },
      { from: "rush-brief", to: "flawed-ship", label: "Unchecked" },
      { from: "client", to: "lead-audit", label: "Ask first" },
      { from: "lead-audit", to: "verified-work", label: "Explicit brief" },
    ],
  };
}

function synthesiseConceptDiagram(concept: ProjectConcept, domain: string): StructuredDiagram {
  if (concept.diagram && concept.diagram.nodes.length >= 3 && concept.diagram.edges.length >= 2) {
    return concept.diagram;
  }
  return {
    caption: `${concept.name}: naive shortcut vs calibrated ${domain.toLowerCase()} practice`,
    nodes: [
      {
        id: "context",
        label: clip(concept.name, 34),
        detail: clip(domain, 42),
        tone: "neutral",
        lane: "shared",
      },
      {
        id: "naive",
        label: "Naive assumption",
        detail: clip(concept.misconception, 64),
        tone: "trap",
        lane: "trap",
      },
      {
        id: "trap-out",
        label: "Silent distortion",
        detail: "Looks plausible, fails in practice",
        tone: "trap",
        lane: "trap",
      },
      {
        id: "method",
        label: "Calibrated check",
        detail: clip(firstSentence(concept.explanation), 64),
        tone: "accent",
        lane: "sound",
      },
      {
        id: "sound-out",
        label: "Verified on the job",
        detail: clip(concept.inTheJob, 64),
        tone: "sound",
        lane: "sound",
      },
    ],
    edges: [
      { from: "context", to: "naive", label: "Shortcut" },
      { from: "naive", to: "trap-out", label: "Unchecked" },
      { from: "context", to: "method", label: "Apply rule" },
      { from: "method", to: "sound-out", label: "Holds up" },
    ],
  };
}

function buildMentalModelDiagram(concept: ProjectConcept, assistantName: string): StructuredDiagram {
  return {
    caption: `Spotting ${concept.name.toLowerCase()} when reviewing ${assistantName}'s draft`,
    nodes: [
      {
        id: "draft",
        label: `${assistantName}'s fast draft`,
        detail: "Polished wording or numbers",
        tone: "neutral",
        lane: "shared",
      },
      {
        id: "misconception",
        label: "Classic misconception",
        detail: clip(concept.misconception, 66),
        tone: "trap",
        lane: "trap",
      },
      {
        id: "approve-blind",
        label: "Approve at face value",
        detail: "Flaw reaches real stakeholders",
        tone: "trap",
        lane: "trap",
      },
      {
        id: "analogy",
        label: "Mental model check",
        detail: clip(concept.bridge, 66),
        tone: "accent",
        lane: "sound",
      },
      {
        id: "catch-fix",
        label: "Send back with reason",
        detail: clip(concept.inTheJob, 66),
        tone: "sound",
        lane: "sound",
      },
    ],
    edges: [
      { from: "draft", to: "misconception", label: "Surface scan", style: "dashed" },
      { from: "misconception", to: "approve-blind", label: "Missed" },
      { from: "draft", to: "analogy", label: "Audit entry" },
      { from: "analogy", to: "catch-fix", label: "Caught" },
    ],
  };
}

function buildFluencyDiagram(assistantName: string): StructuredDiagram {
  return {
    caption: `Anthropic 4D AI Fluency loop across your two-week simulation`,
    nodes: [
      {
        id: "d1",
        label: "01 Delegation",
        detail: "Interview client before briefing AI",
        tone: "neutral",
        lane: "shared",
      },
      {
        id: "d2",
        label: "02 Description",
        detail: `Give ${assistantName} targets & guardrails`,
        tone: "accent",
        lane: "shared",
      },
      {
        id: "d3",
        label: "03 Discernment",
        detail: "Audit artifact & explain any flaw",
        tone: "accent",
        lane: "shared",
      },
      {
        id: "d4",
        label: "04 Diligence",
        detail: "Defend in Viva & measure rollout",
        tone: "sound",
        lane: "shared",
      },
    ],
    edges: [
      { from: "d1", to: "d2", label: "Facts" },
      { from: "d2", to: "d3", label: "Build" },
      { from: "d3", to: "d4", label: "Sign-off" },
    ],
  };
}

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
      structuredDiagram: buildMissionDiagram(scenario, artifactKind),
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
      structuredDiagram: synthesiseConceptDiagram(concept, domain),
      watchFor: concept.inTheJob,
    });
    slides.push({
      id: `concept-${num}-trap`,
      eyebrow: `0${slides.length + 1} · Mental Model vs Classic Trap`,
      title: `Spotting ${concept.name.toLowerCase()} in the wild`,
      body: `Fast AI drafts often sound persuasive even when built on a textbook misconception. Compare the everyday mental model against the trap ${scenario.assistant.name} can fall into.`,
      diagram,
      structuredDiagram: buildMentalModelDiagram(concept, scenario.assistant.name),
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
    structuredDiagram: buildFluencyDiagram(scenario.assistant.name),
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
