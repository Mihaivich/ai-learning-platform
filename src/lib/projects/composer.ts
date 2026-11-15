import { cueHits, normalise, rankFacts, type InterviewTurn } from "./evaluate";
import type { ChecklistItem, ProjectConcept, ProjectScenario, Track } from "./types";

export type ComposerOption = { id: string; text: string };

export type ComposerSlot = {
  id: string;
  prompt: string;
  unlocked: boolean;
  options: ComposerOption[];
};

const BRIEF_FACT_BY_ID: Record<string, string | null> = {
  C1: "F1",
  C2: "F2",
  C3: "F3",
  C4: null,
};

const REQ_PROMPTS: Record<string, string> = {
  R1: "Core problem to prevent",
  R2: "Rule or compliance boundary",
  R3: "Scope & audience boundary",
  R4: "Measurable success target",
  R5: "Operating environment",
};

const BRIEF_PROMPTS: Record<string, string> = {
  C1: "How the deliverable avoids the core failure",
  C2: "Critical safeguard or constraint",
  C3: "Strict scope boundaries",
  C4: "Automated verification",
};

const SURFACE_QUESTION_POOL = [
  "Should we match the colour palette and typography to your current stationery first?",
  "Would a dark-mode toggle on the primary overview look more modern?",
  "Do you have a preferred font size or icon pack for section headings?",
  "Should we plan a multi-site franchise architecture in case you expand next year?",
  "Would exporting formatted executive presentation slide decks be useful right away?",
  "Should we draft an external social-media announcement celebrating the launch?",
  "Would animated screen transitions make navigating the layout feel smoother?",
  "Should we display a five-star visitor satisfaction widget in the footer?",
  "Would decorative borders around printed summaries help your monthly packets?",
  "Should column headings use uppercase styling or sentence case?",
  "Could we add a customizable welcome banner greeting people each morning?",
  "Should we bundle multilingual translation toggles into this release?",
  "Would subtle keyboard shortcut chimes improve daily responsiveness?",
  "Should we prepare downloadable poster templates alongside the main workspace?",
  "Could we integrate an automated birthday reminder widget on the side panel?",
  "Would sorting toolbar buttons alphabetically help people find them faster?",
];

const REQ_DISTRACTORS: Record<string, string[]> = {
  R1: [
    "Show an inline visual spinner while saving so pages feel responsive during busy mornings.",
    "Trust optimistic UI updates immediately and tidy conflicting rows later in the week.",
    "Prioritise cleaner visual alignment on the main view rather than changing how submissions save.",
    "Sort recent submissions alphabetically so staff can spot unfamiliar entries by eye.",
    "Display a gentle friendly banner asking two colleagues to coordinate verbally when busy.",
  ],
  R2: [
    "Follow the simplest default cleanup routine once an entry looks finished or outdated.",
    "Allow quick one-click removal of older rows so the list stays short and uncluttered.",
    "Assume legacy behaviours and credentials adjust automatically during normal updates.",
    "Archive historical entries only when an annual visual audit happens to be requested.",
    "Keep convenience shortcuts simple even if background protections have to wait until v2.",
  ],
  R3: [
    "Include companion portals, dashboards, and convenience add-ons in case teams want them later.",
    "Bundle adjacent workflows together now so stakeholders feel they got generous extra value.",
    "Build extra self-service tabs and side panels alongside the main deliverable this sprint.",
    "Expand the deliverable with configurable alert modules to showcase broader studio capability.",
    "Design a full multi-department showcase covering related future requests upfront.",
  ],
  R4: [
    "Judge readiness by asking everyone at Friday check-in whether things feel smoother.",
    "Gather informal hallway impressions during the quarter following handover.",
    "Evaluate completion by how quickly the first clean visual prototype comes together.",
    "Wait until routine check-ins feel calmer instead of picking a concrete threshold upfront.",
    "Declare completion once the opening layout looks tidy and loads without visual glitches.",
  ],
  R5: [
    "Package the deliverable for a brand-new workstation stack and ask IT to adopt new tools.",
    "Assume teams can adjust equipment and workflow habits smoothly around a freshly built setup.",
    "Optimise primarily for large widescreen studio monitors with modern hardware acceleration.",
    "Configure everything around a dedicated external workspace outside ordinary daily routines.",
    "Build for whatever cloud setup feels cleanest for the studio rather than local constraints.",
  ],
  DEFAULT: [
    "Group cards with subtle divider borders and unified typography across every panel.",
    "Provide a collapsible navigation rail with customizable visual theme accents.",
    "Send an automated Friday afternoon summary greeting across departments.",
    "Offer one-click slide exports whenever leadership wants an overview packet.",
  ],
};

const BRIEF_DISTRACTORS: Record<string, string[]> = {
  C1: [
    "Speed up the interface response times so quick actions finish with fewer visual pauses.",
    "Add optimistic feedback messages immediately while background tasks settle asynchronously.",
    "Streamline the primary layout with cleaner visual hierarchy and modern status icons.",
    "Focus on surface polishing so obvious rough edges feel smoother during first demos.",
  ],
  C2: [
    "Use the cleanest minimal structure available, tidying away inactive records automatically.",
    "Simplify existing contracts by retiring legacy pathways in favour of one brand-new shape.",
    "Hardcode temporary defaults inside page templates so prototypes run right away.",
    "Choose whichever structural shortcut gets the core flow looking finished fastest.",
  ],
  C3: [
    "While updating this area, add thoughtful companion dashboards and extra portal tabs.",
    "Include optional automated alerts and self-service extras so teams get maximum value.",
    "Anticipate next quarter's wishes by scaffolding multi-site widgets alongside the core task.",
    "Add extra showcase views around the main workflow while templates are already open.",
  ],
  C4: [
    "Rely on a visual click-through of the main happy path instead of automated regression suites.",
    "Skip writing extra automated verification checks so the first build lands earlier.",
    "Ask for a clean demo screenshot instead of automated edge-case assertions.",
    "Hold off on adding automated checks until all future expansions are planned.",
  ],
};

/**Deterministic string hash -> unsigned 32-bit int. */
function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function deterministicShuffle<T>(items: T[], seed: string): T[] {
  const copy = [...items];
  let s = hashSeed(seed) || 1;
  for (let i = copy.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function itemsFor(items: ChecklistItem[], track: Track | null): ChecklistItem[] {
  return items.filter((item) => !item.tracks || !track || item.tracks.includes(track));
}

export function itemCoveredBy(text: string, item: ChecklistItem): boolean {
  const body = normalise(text);
  return item.cues.every((group) => cueHits(body, group) > 0);
}

function conceptTerms(scenario: ProjectScenario): string[] {
  const terms: string[] = [];
  for (const concept of scenario.concepts ?? []) {
    const raw = concept.name.trim().toLowerCase();
    if (raw) terms.push(raw);
    if (raw.endsWith("s") && raw.length >= 6) {
      terms.push(raw.slice(0, -1));
    }
  }
  return Array.from(new Set(terms));
}

export function containsConceptName(scenario: ProjectScenario, text: string): boolean {
  const lower = text.toLowerCase();
  return conceptTerms(scenario).some((term) => lower.includes(term));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sanitizeText(scenario: ProjectScenario, text: string): string {
  let out = text.replace(/\s*\[[^\]]*\]/g, "");
  out = out.replace(/confounding\s+variables?/gi, "mixed baseline risk profiles");
  out = out.replace(/rates\s+vs\s+raw\s+counts?/gi, "exposure-adjusted metrics");
  for (const term of conceptTerms(scenario)) {
    const re = new RegExp(escapeRegExp(term), "gi");
    out = out.replace(re, "this underlying pitfall");
  }
  return out.replace(/\s+/g, " ").trim();
}

function splitSentences(text: string | undefined): string[] {
  if (!text) return [];
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function pickAccurateClause(
  scenario: ProjectScenario,
  item: ChecklistItem,
  sampleText: string | undefined,
): string {
  const sentences = splitSentences(sampleText);
  const candidates: string[] = [];

  for (const s of sentences) candidates.push(s);
  for (const s of sentences) candidates.push(sanitizeText(scenario, s));
  for (let i = 0; i < sentences.length - 1; i++) {
    candidates.push(sanitizeText(scenario, `${sentences[i]} ${sentences[i + 1]}`));
  }
  candidates.push(item.label, sanitizeText(scenario, item.label));

  if (item.id === "C4") {
    candidates.push("Include an automated unit test verifying the core safeguard holds under edge cases.");
  }

  for (const candidate of candidates) {
    const clean = candidate.replace(/\s+/g, " ").trim();
    if (!clean) continue;
    if (containsConceptName(scenario, clean)) continue;
    if (/\[[^\]]+\]/.test(clean)) continue;
    if (itemCoveredBy(clean, item)) return clean;
  }

  return sanitizeText(scenario, item.label);
}

function pickSafeDistractors(
  scenario: ProjectScenario,
  allItems: ChecklistItem[],
  pool: string[],
  fallbackPool: string[],
  count: number,
  lockedCorpusSoFar: { text: string },
  preferred?: string,
): string[] {
  const chosen: string[] = [];
  const candidates = [
    ...(preferred ? [preferred] : []),
    ...pool,
    ...fallbackPool,
  ].map((s) => sanitizeText(scenario, s));

  for (const candidate of candidates) {
    if (chosen.length >= count) break;
    if (!candidate || containsConceptName(scenario, candidate)) continue;
    if (chosen.some((existing) => normalise(existing) === normalise(candidate))) continue;
    if (allItems.some((item) => itemCoveredBy(candidate, item))) continue;
    const combined = `${lockedCorpusSoFar.text} ${candidate}`.trim();
    if (allItems.some((item) => itemCoveredBy(combined, item))) continue;
    chosen.push(candidate);
    lockedCorpusSoFar.text = combined;
  }

  return chosen;
}

/**
 * Suggest up to 10 realistic stakeholder questions for the call: up to 5 that uncover
 * key facts and at least 5 plausible off-track / surface questions (`rankFacts === 0`).
 * Never contains bracketed hints or concept names.
 */
export function buildSuggestedQuestions(scenario: ProjectScenario, turns: InterviewTurn[]): string[] {
  const asked = new Set(
    turns.filter((turn) => turn.role === "learner").map((turn) => normalise(turn.text)),
  );
  const priority = ["F1", "F2", "F3", "F5", "F6", "F4"];
  const productive: string[] = [];

  for (const factId of priority) {
    if (productive.length >= 5) break;
    const fact = scenario.facts.find((f) => f.id === factId);
    const q = fact?.sampleQuestion ? sanitizeText(scenario, fact.sampleQuestion) : "";
    if (!q || containsConceptName(scenario, q)) continue;
    if (rankFacts(scenario, q, []).length === 0) continue;
    productive.push(q);
  }

  const distractors: string[] = [];
  for (const q of SURFACE_QUESTION_POOL) {
    if (productive.length + distractors.length >= 10) break;
    const clean = sanitizeText(scenario, q);
    if (containsConceptName(scenario, clean)) continue;
    if (rankFacts(scenario, clean, []).length > 0) continue;
    distractors.push(clean);
  }

  const combined = deterministicShuffle([...productive, ...distractors], `${scenario.id}:questions`);
  return combined.filter((q) => !asked.has(normalise(q)));
}

/**
 * Click-to-compose slots for Requirements (`R1..R5`). Strictly discovery-gated:
 * when a slot's linked fact has not been revealed, only uninformed distractors are offered
 * and joining every locked option covers 0 requirements.
 */
export function buildRequirementsComposer(
  scenario: ProjectScenario,
  track: Track | null,
  revealed: string[],
): ComposerSlot[] {
  const items = itemsFor(scenario.requirements, track);
  const revealedSet = new Set(revealed);
  const lockedCorpus = { text: "" };
  const fallbackPool = [
    ...REQ_DISTRACTORS.DEFAULT,
    ...REQ_DISTRACTORS.R1,
    ...REQ_DISTRACTORS.R2,
    ...REQ_DISTRACTORS.R3,
    ...REQ_DISTRACTORS.R4,
    ...REQ_DISTRACTORS.R5,
  ];

  return items.map((item, slotIndex) => {
    const unlocked = !item.fact || revealedSet.has(item.fact);
    const pool = REQ_DISTRACTORS[item.id] ?? REQ_DISTRACTORS.DEFAULT;
    // Opaque public slot ids keep internal checklist ids ("R1", "R2", ...) hidden from ProjectView.
    const publicId = `req-slot-${slotIndex + 1}`;

    if (!unlocked) {
      const lockedOpts = pickSafeDistractors(
        scenario,
        items,
        pool,
        fallbackPool,
        3,
        lockedCorpus,
      );
      return {
        id: publicId,
        prompt: REQ_PROMPTS[item.id] ?? "Requirement detail",
        unlocked: false,
        options: deterministicShuffle(lockedOpts, `${scenario.id}:${item.id}:locked`).map((text, idx) => ({
          id: `${publicId}-opt-${idx + 1}`,
          text,
        })),
      };
    }

    const accurate = pickAccurateClause(scenario, item, scenario.samples?.requirements);
    const distractors = pickSafeDistractors(
      scenario,
      items,
      pool,
      fallbackPool,
      2,
      { text: "" },
    );
    const options = deterministicShuffle([accurate, ...distractors], `${scenario.id}:${item.id}:open`).map(
      (text, idx) => ({
        id: `${publicId}-opt-${idx + 1}`,
        text,
      }),
    );

    return {
      id: publicId,
      prompt: REQ_PROMPTS[item.id] ?? "Requirement detail",
      unlocked: true,
      options,
    };
  });
}

/**
 * Click-to-compose slots for Briefing (`C1..C3` + `C4` on engineering track).
 * Strictly discovery-gated by `F1..F3`: when locked, no accurate directive is shown.
 */
export function buildBriefComposer(
  scenario: ProjectScenario,
  track: Track | null,
  revealed: string[],
): ComposerSlot[] {
  const items = itemsFor(scenario.brief, track);
  const revealedSet = new Set(revealed);
  const lockedCorpus = { text: "" };
  const fallbackPool = [
    ...BRIEF_DISTRACTORS.C1,
    ...BRIEF_DISTRACTORS.C2,
    ...BRIEF_DISTRACTORS.C3,
    ...BRIEF_DISTRACTORS.C4,
  ];

  return items.map((item, slotIndex) => {
    const factId = item.fact ?? BRIEF_FACT_BY_ID[item.id] ?? null;
    const unlocked = !factId || revealedSet.has(factId);
    const conceptForItem = factId ? scenario.concepts?.find((c) => c.fact === factId) : undefined;
    const pool = BRIEF_DISTRACTORS[item.id] ?? BRIEF_DISTRACTORS.C1;
    // Opaque public slot ids keep internal checklist ids ("C1", "C2", ...) hidden from ProjectView.
    const publicId = `brief-slot-${slotIndex + 1}`;

    if (!unlocked) {
      const lockedOpts = pickSafeDistractors(
        scenario,
        items,
        pool,
        fallbackPool,
        3,
        lockedCorpus,
      );
      return {
        id: publicId,
        prompt: BRIEF_PROMPTS[item.id] ?? "Brief directive",
        unlocked: false,
        options: deterministicShuffle(lockedOpts, `${scenario.id}:${item.id}:locked`).map((text, idx) => ({
          id: `${publicId}-opt-${idx + 1}`,
          text,
        })),
      };
    }

    const accurate = pickAccurateClause(scenario, item, scenario.samples?.brief);
    const distractors = pickSafeDistractors(
      scenario,
      items,
      pool,
      fallbackPool,
      2,
      { text: "" },
      conceptForItem?.misconception,
    );
    const options = deterministicShuffle([accurate, ...distractors], `${scenario.id}:${item.id}:open`).map(
      (text, idx) => ({
        id: `${publicId}-opt-${idx + 1}`,
        text,
      }),
    );

    return {
      id: publicId,
      prompt: BRIEF_PROMPTS[item.id] ?? "Brief directive",
      unlocked: true,
      options,
    };
  });
}

function causalWhySentence(scenario: ProjectScenario, concept: ProjectConcept): string {
  const sentences = splitSentences(concept.explanation);
  const body = sentences.length > 1 ? [...sentences.slice(1), sentences[0]] : sentences;
  for (const s of body) {
    if (containsConceptName(scenario, s)) continue;
    const clean = sanitizeText(scenario, s).replace(/[()]/g, "");
    if (clean.length >= 25 && !containsConceptName(scenario, clean)) {
      return clean;
    }
  }
  for (const s of body) {
    const clean = sanitizeText(scenario, s).replace(/[()]/g, "");
    if (clean.length >= 25 && !containsConceptName(scenario, clean)) {
      return clean;
    }
  }
  const second = sentences[1] ?? sentences[0] ?? concept.inTheJob;
  return sanitizeText(scenario, second).replace(/[()]/g, "");
}

function buildWhatObservation(scenario: ProjectScenario, concept: ProjectConcept): string {
  const variant = scenario.variants.find((v) => v.id === concept.variant);
  const matchingDemo = (variant?.demo ?? [])
    .map((d) => sanitizeText(scenario, `${d.action} ${d.result}`))
    .find((txt) => !containsConceptName(scenario, txt) && cueHits(normalise(txt), concept.cues) > 0);
  if (matchingDemo) {
    return matchingDemo.endsWith(".") ? matchingDemo : `${matchingDemo}.`;
  }
  const cleanJob = sanitizeText(scenario, concept.inTheJob);
  if (cueHits(normalise(cleanJob), concept.cues) > 0 && !containsConceptName(scenario, cleanJob)) {
    return cleanJob.endsWith(".") ? cleanJob : `${cleanJob}.`;
  }
  const cue = concept.cues[0] ?? "";
  const symptomLabel =
    scenario.reviewReasons.find((r) => r.id === variant?.problemReason)?.label ?? "The delivered behaviour breaks the core rule";
  const combined = sanitizeText(scenario, cue ? `${symptomLabel} when ${cue} happens.` : `${symptomLabel}.`);
  return combined.endsWith(".") ? combined : `${combined}.`;
}

/**
 * Six review note starters (2 causal explanations without leaking `concept.name`,
 * 2 symptom-only notes, 2 plausible misdiagnoses).
 */
export function buildReviewNoteOptions(scenario: ProjectScenario): ComposerOption[] {
  const concepts = scenario.concepts ?? [];
  const raw: string[] = [];

  for (const concept of concepts) {
    const what = buildWhatObservation(scenario, concept);
    const why = causalWhySentence(scenario, concept);
    const note = sanitizeText(scenario, `${what} ${why}`);
    raw.push(note);
  }

  for (const concept of concepts.slice(0, 2)) {
    const variant = scenario.variants.find((v) => v.id === concept.variant);
    const reason = scenario.reviewReasons.find((r) => r.id === variant?.problemReason)?.label;
    const symptomOnly = reason
      ? sanitizeText(scenario, `${reason}, so the team keeps running into the same visible flaw.`)
      : sanitizeText(scenario, `Something still breaks on the main workflow when users rely on it.`);
    raw.push(symptomOnly);
  }

  while (raw.length < 4) {
    raw.push("The visible outcome doesn't quite match what reception expected during testing.");
  }

  raw.push(
    "The headings and layout hierarchy make status badges look crowded on narrower screens.",
    "Additional cosmetic confirmation animations and formatting styles should be adjusted first.",
  );

  return deterministicShuffle(raw.slice(0, 6), `${scenario.id}:review-notes`).map((text, idx) => ({
    id: `note-opt-${idx + 1}`,
    text,
  }));
}
