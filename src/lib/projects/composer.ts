import { cueHits, normalise, rankFacts, type InterviewTurn } from "./evaluate";
import type { ChecklistItem, ProjectConcept, ProjectFact, ProjectScenario, Track } from "./types";

export type ComposerOption = {
  id: string;
  text: string;
};

export type ComposerSlot = {
  id: string;
  title: string;
  hint: string;
  /** True when the learner already uncovered the underlying stakeholder fact on the call. */
  unlocked: boolean;
  options: ComposerOption[];
};

function shuffleBySeed<T>(items: T[], seedText: string): T[] {
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
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

function sanitizePublicText(text: string, conceptNames: string[]): string {
  let out = text.trim();
  for (const name of conceptNames) {
    if (name && out.includes(name)) {
      out = out.split(name).join(name.toLowerCase());
    }
  }
  // Never emit internal hyphenated engine tokens.
  out = out.replace(/\b(delete-on-cancel|brief-delete|problemLines|problemReason)\b/g, (m) => m.replace(/-/g, " "));
  return out;
}

export function itemCoveredBy(text: string, item: ChecklistItem): boolean {
  const body = normalise(text);
  return item.cues.every((group) => cueHits(body, group) > 0);
}

export function ensureItemCovered(sentence: string, item: ChecklistItem, conceptNames: string[]): string {
  let out = sanitizePublicText(sentence, conceptNames).replace(/[.!?]+$/, "");
  const missing: string[] = [];
  for (const group of item.cues) {
    if (cueHits(normalise(out), group) === 0 && group.length > 0) {
      const token = sanitizePublicText(group[0]!, conceptNames);
      if (token) missing.push(token);
    }
  }
  if (missing.length > 0) {
    out = `${out} (${missing.join(", ")})`;
  }
  return `${out}.`;
}

function stripForbiddenCues(text: string, forbidden: ChecklistItem[]): string {
  const words = text.split(/\s+/);
  const kept = words.filter((word) => {
    const norm = normalise(word);
    return !forbidden.some((item) => item.cues.some((group) => cueHits(norm, group) > 0));
  });
  return kept.join(" ").trim() || "Proceed with standard default assumptions.";
}

function pickSafeTrap(
  candidates: string[],
  forbidden: ChecklistItem[],
  fallback: string,
  conceptNames: string[],
): string {
  for (const raw of [...candidates, fallback]) {
    const cleaned = sanitizePublicText(raw, conceptNames);
    if (!cleaned) continue;
    if (forbidden.every((item) => !itemCoveredBy(cleaned, item))) {
      return cleaned.endsWith(".") || cleaned.endsWith("!") || cleaned.endsWith("?") ? cleaned : `${cleaned}.`;
    }
  }
  const stripped = sanitizePublicText(stripForbiddenCues(fallback, forbidden), conceptNames);
  return stripped.endsWith(".") ? stripped : `${stripped}.`;
}

function fallbackQuestionForFact(fact: ProjectFact): string {
  const stems = fact.cues.slice(0, 2).join(" and ");
  return stems ? `Could you walk me through ${stems} in practice?` : "How does that part of your day-to-day workflow run?";
}

const DISTRACTOR_QUESTION_POOL = [
  "Should we pick visual colour palettes and typography before anything else?",
  "Can we copy an off-the-shelf template from a huge organisation and skip discovery?",
  "Would animated decorative banners on the opening screen look impressive?",
  "Should we invent a catchier brand name before checking the workflow?",
  "Can we polish the visual styling today and sort out operational details next quarter?",
];

export function buildSuggestedQuestions(scenario: ProjectScenario, turns: InterviewTurn[]): string[] {
  const conceptNames = (scenario.concepts ?? []).map((c) => c.name);
  const realQuestions = scenario.facts.map((fact) =>
    sanitizePublicText(fact.question ?? fallbackQuestionForFact(fact), conceptNames),
  );
  const distractors = DISTRACTOR_QUESTION_POOL.filter((q) => rankFacts(scenario, q, []).length === 0).slice(0, 2);
  const all = shuffleBySeed([...realQuestions, ...distractors], `${scenario.id}:interview-questions`);
  const askedNorm = new Set(turns.filter((t) => t.role === "learner").map((t) => normalise(t.text)));
  return all.filter((q) => !askedNorm.has(normalise(q)));
}

function pairSlot(
  scenarioId: string,
  slotId: string,
  title: string,
  hint: string,
  unlocked: boolean,
  rigorousText: string,
  trapText: string,
): ComposerSlot {
  const shuffled = shuffleBySeed([rigorousText, trapText], `${scenarioId}:${slotId}`);
  return {
    id: slotId,
    title,
    hint,
    unlocked,
    options: shuffled.map((text, idx) => ({ id: `opt-${idx + 1}`, text })),
  };
}

export function buildRequirementsComposer(
  scenario: ProjectScenario,
  track: Track | null,
  revealed: string[],
): ComposerSlot[] {
  const conceptNames = (scenario.concepts ?? []).map((c) => c.name);
  const items = scenario.requirements.filter((item) => !item.tracks || (track && item.tracks.includes(track)));
  const client = firstName(scenario.client.name);
  const byId = (id: string) => items.find((item) => item.id === id);

  const r1 = byId("R1") ?? items[0];
  const r2 = byId("R2") ?? items[1];
  const r3 = byId("R3") ?? items[2];
  const r4 = items.find((item) => item.competency === "diligence") ?? byId("R4") ?? items[3];
  const r5 = byId("R5") ?? items[4];

  const slots: ComposerSlot[] = [];

  if (r1) {
    slots.push(
      pairSlot(
        scenario.id,
        "req-slot-1",
        "1 · Core problem to solve",
        "What operational failure must the deliverable actually prevent?",
        !r1.fact || revealed.includes(r1.fact),
        ensureItemCovered(r1.label, r1, conceptNames),
        pickSafeTrap(
          [
            `Fulfil ${client}'s opening email request at face value while leaving day-to-day timing unchanged.`,
            "Focus on a clean first impression and handle edge-case clashes manually later.",
          ],
          items,
          "Keep day-to-day operational handling as it works today.",
          conceptNames,
        ),
      ),
    );
  }

  if (r2) {
    slots.push(
      pairSlot(
        scenario.id,
        "req-slot-2",
        "2 · Non-negotiable domain rule",
        "Which compliance, safety, or baseline constraint must never be broken?",
        !r2.fact || revealed.includes(r2.fact),
        ensureItemCovered(r2.label, r2, conceptNames),
        pickSafeTrap(
          [
            "Use lightweight convenience defaults and clear away old entries automatically.",
            "Prioritise fast turnaround over formal retention or baseline checks.",
          ],
          items,
          "Use minimal convenience defaults without extra constraints.",
          conceptNames,
        ),
      ),
    );
  }

  if (r3) {
    let combined = ensureItemCovered(r3.label, r3, conceptNames);
    if (r5) {
      combined = ensureItemCovered(`${combined} ${r5.label}`, r5, conceptNames);
    }
    slots.push(
      pairSlot(
        scenario.id,
        "req-slot-3",
        "3 · Scope & environment",
        "Who uses this release, where does it run, and what stays out of scope?",
        (!r3.fact || revealed.includes(r3.fact)) && (!r5?.fact || revealed.includes(r5.fact)),
        combined,
        pickSafeTrap(
          [
            "Expand into an all-in-one self-service suite with bonus portals and extras.",
            "Keep scope open-ended so extra features can be bundled into this release.",
          ],
          items,
          "Leave scope broad so bonus features can be added.",
          conceptNames,
        ),
      ),
    );
  }

  if (r4) {
    slots.push(
      pairSlot(
        scenario.id,
        "req-slot-4",
        "4 · Success target",
        "How will everyone verify whether the release actually worked?",
        !r4.fact || revealed.includes(r4.fact),
        ensureItemCovered(r4.label, r4, conceptNames),
        pickSafeTrap(
          [
            "Collect informal feedback casually once people have used it for a while.",
            "Judge outcomes by general sentiment rather than committing to a numeric threshold.",
          ],
          items,
          "Rely on informal impressions without fixed numbers.",
          conceptNames,
        ),
      ),
    );
  }

  return slots;
}

export function buildBriefComposer(
  scenario: ProjectScenario,
  track: Track | null,
  revealed: string[],
): ComposerSlot[] {
  const conceptNames = (scenario.concepts ?? []).map((c) => c.name);
  const items = scenario.brief.filter((item) => !item.tracks || (track && item.tracks.includes(track)));
  const agent = scenario.assistant.name;
  const deliverable = scenario.words.deliverable;
  const c1 = items.find((item) => item.id === "C1") ?? items[0];
  const c2 = items.find((item) => item.id === "C2") ?? items[1];
  const c3 = items.find((item) => item.id === "C3") ?? items[2];
  const c4 = items.find((item) => item.id === "C4");
  const concept1 = scenario.concepts?.[0];
  const concept2 = scenario.concepts?.[1];

  const slots: ComposerSlot[] = [];

  if (c1) {
    slots.push(
      pairSlot(
        scenario.id,
        "brief-slot-1",
        "1 · Core mechanism instruction",
        `How should ${agent} handle the central domain problem?`,
        revealed.includes("F1"),
        ensureItemCovered(c1.label, c1, conceptNames),
        pickSafeTrap(
          [
            concept1 ? concept1.misconception : "",
            `Let ${agent} handle routine cases one at a time using its quickest default logic.`,
          ],
          scenario.brief,
          `Use ${agent}'s fastest default assumption for routine cases.`,
          conceptNames,
        ),
      ),
    );
  }

  if (c2) {
    slots.push(
      pairSlot(
        scenario.id,
        "brief-slot-2",
        "2 · Guardrail & compliance rule",
        `What boundary must ${agent} respect even when a shortcut looks cleaner?`,
        revealed.includes("F2"),
        ensureItemCovered(c2.label, c2, conceptNames),
        pickSafeTrap(
          [
            concept2 ? concept2.misconception : "",
            `Allow ${agent} to prune or simplify inactive entries automatically to keep things tidy.`,
          ],
          scenario.brief,
          `Let ${agent} simplify edge cases automatically.`,
          conceptNames,
        ),
      ),
    );
  }

  if (c3) {
    slots.push(
      pairSlot(
        scenario.id,
        "brief-slot-3",
        "3 · Scope discipline",
        `Where should ${agent} draw the line on extra features?`,
        revealed.includes("F3"),
        ensureItemCovered(c3.label, c3, conceptNames),
        pickSafeTrap(
          [
            `Include helpful bonus features and self-service extras alongside ${deliverable}.`,
            `Go ahead and add extra conveniences if ${agent} can draft them quickly.`,
          ],
          scenario.brief,
          "Add helpful extra features around the core deliverable.",
          conceptNames,
        ),
      ),
    );
  }

  if (c4) {
    slots.push(
      pairSlot(
        scenario.id,
        "brief-slot-4",
        "4 · Verification check",
        `Should ${agent} include an automated check proving the safeguard holds?`,
        true,
        ensureItemCovered(c4.label, c4, conceptNames),
        pickSafeTrap(
          [
            `Skip automated verification checks so ${agent} delivers the draft sooner.`,
            "Rely on visual reading alone without automated checks.",
          ],
          scenario.brief,
          "Rely on manual reading alone.",
          conceptNames,
        ),
      ),
    );
  }

  return slots;
}

export function buildReviewNoteOptions(
  scenario: ProjectScenario,
  explanationItemsFn: (scenario: ProjectScenario, concept: ProjectConcept) => ChecklistItem[],
): ComposerOption[] {
  const concepts = scenario.concepts ?? [];
  if (!concepts.length) return [];
  const conceptNames = concepts.map((c) => c.name);

  const conceptCards = concepts.map((concept) => {
    const items = explanationItemsFn(scenario, concept);
    const variant = scenario.variants.find((item) => item.id === concept.variant);
    const symptom =
      scenario.reviewReasons.find((reason) => reason.id === variant?.problemReason)?.label ?? concept.inTheJob;
    let text = `${symptom.replace(/[.!?]+$/, "")} — "${concept.misconception.replace(/[.!?]+$/, "")}" fails here because of ${concept.name.toLowerCase()}.`;
    for (const item of items) {
      text = ensureItemCovered(text, item, conceptNames);
    }
    return text;
  });

  const scopeReason =
    scenario.reviewReasons.find((r) => r.id === "scope" || r.id === "extra-features")?.label ??
    "Adds extra features outside the agreed scope";
  const distractorReason =
    scenario.reviewReasons.find((r) => r.id === "distractor" || r.id === "styling")?.label ??
    "Presentation formatting could look cleaner";

  const rawOptions = [
    ...conceptCards,
    sanitizePublicText(
      `${scopeReason.replace(/[.!?]+$/, "")} — strip out unapproved extras and keep strictly to ${scenario.words.deliverable}.`,
      conceptNames,
    ),
    sanitizePublicText(
      `${distractorReason.replace(/[.!?]+$/, "")} — polish visual formatting only while keeping the current logic as-is.`,
      conceptNames,
    ),
  ];

  return shuffleBySeed(rawOptions, `${scenario.id}:review-notes`).map((text, idx) => ({
    id: `note-${idx + 1}`,
    text,
  }));
}

export function buildVivaOptions(scenario: ProjectScenario): ComposerOption[] {
  if (!scenario.viva) return [];
  const conceptNames = (scenario.concepts ?? []).map((c) => c.name);
  const [v1, v2] = scenario.viva.items;
  const c1 = scenario.brief[0];
  const c2 = scenario.brief[1];
  const r4 = scenario.requirements.find((item) => item.competency === "diligence") ?? scenario.requirements[3];

  let strong = `We guarded against the main risk (${c1?.label.replace(/[.!?]+$/, "") ?? "core safeguard"}; ${c2?.label.replace(/[.!?]+$/, "") ?? "strict rule compliance"}), and we will run a staged pilot or track weekly results against the target (${r4?.label.replace(/[.!?]+$/, "") ?? "agreed metric"}).`;
  if (v1) strong = ensureItemCovered(strong, v1, conceptNames);
  if (v2) strong = ensureItemCovered(strong, v2, conceptNames);

  const riskOnlyCandidate = v1
    ? ensureItemCovered(
        `We addressed the domain rule (${c1?.label.replace(/[.!?]+$/, "") ?? "core safeguard"}), so everyone can switch over immediately without ongoing monitoring.`,
        v1,
        conceptNames,
      )
    : "We addressed the main operational safeguard, so no follow-up tracking is needed.";
  const riskOnly =
    v2 && itemCoveredBy(riskOnlyCandidate, v2) && v1
      ? ensureItemCovered(
          stripForbiddenCues("The domain safeguard is enforced directly in the workflow, so everyone can switch over right away.", [v2]),
          v1,
          conceptNames,
        )
      : riskOnlyCandidate;

  const rolloutOnlyCandidate = v2
    ? ensureItemCovered(
        "We will launch with a small pilot trial first and track weekly counts against our target to confirm results.",
        v2,
        conceptNames,
      )
    : "We will run a small pilot first and check how people feel.";
  const rolloutOnly =
    v1 && itemCoveredBy(rolloutOnlyCandidate, v1) && v2
      ? ensureItemCovered(
          stripForbiddenCues("We will start with a small pilot trial and measure the target afterwards.", [v1]),
          v2,
          conceptNames,
        )
      : rolloutOnlyCandidate;

  const weak = pickSafeTrap(
    [
      `${scenario.assistant.name} handled all the technical details automatically, so we can switch everyone over right away with full confidence.`,
      "Everything looked clean in the preview, so no special domain safeguards or follow-up checks are needed.",
    ],
    scenario.viva.items,
    "Everything looks ready for an immediate switch-over.",
    conceptNames,
  );

  return shuffleBySeed([strong, riskOnly, rolloutOnly, weak], `${scenario.id}:viva-options`).map((text, idx) => ({
    id: `viva-${idx + 1}`,
    text,
  }));
}
