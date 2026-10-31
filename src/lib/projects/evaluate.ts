import type { ChecklistItem, ProjectScenario } from "./types";

/**
 * Who graded a piece of free text: "keywords" (the offline evaluator) or a
 * model id. When the AI was skipped or failed, `fallback` says why.
 */
export type Grader = {
  by: string;
  fallback?: "no-api-key" | "user-quota" | "models-unavailable";
};

export type InterviewTurn = { role: "learner" | "client"; text: string; grader?: Grader };

export type InterviewReply = { reply: string; revealed: string[]; grader: Grader };

export type ChecklistResult = { covered: string[]; grader: Grader };

export type InterviewInput = {
  scenario: ProjectScenario;
  question: string;
  turns: InterviewTurn[];
  revealed: string[];
  vagueIndex: number;
};

/**
 * The only places a project scenario interprets free text. Implementations must
 * return ids from the lists they are given; the runtime validates them again.
 */
export interface ProjectEvaluator {
  interview(input: InterviewInput): Promise<InterviewReply>;
  checklist(input: { items: ChecklistItem[]; text: string }): Promise<ChecklistResult>;
}

/** Lower-case words separated by single spaces, padded so every word starts after a space. */
export function normalise(text: string): string {
  return ` ${text.toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9']+/g, " ").trim()} `;
}

/**
 * A cue matches at the start of a word, so "cancel" matches "cancelled" but
 * "app" does not match "happen". A cue of three letters or fewer matches a
 * whole word or its usual endings only: "log", "logs" and "logged", but "app"
 * never matches "appointment". Cues are normalised the same way as the text.
 */
export function cueHits(text: string, cues: string[]): number {
  return cues.filter((cue) => {
    const needle = normalise(cue).trimEnd();
    if (needle.trim() === "") return false;
    if (needle.trim().length > 3) return text.includes(needle);
    const last = needle.at(-1);
    return new RegExp(`${needle}(?:s|es|ed|ing|${last}ed|${last}ing)? `).test(text);
  }).length;
}

const KEYWORDS: Grader = { by: "keywords" };

/** Hidden facts whose cues appear in the question, most cue hits first. */
export function rankFacts(scenario: ProjectScenario, question: string, revealed: string[]) {
  const text = normalise(question);
  return scenario.facts
    .filter((fact) => !revealed.includes(fact.id))
    .map((fact) => ({ fact, hits: cueHits(text, fact.cues) }))
    .filter((match) => match.hits > 0)
    .sort((a, b) => b.hits - a.hits);
}

/**
 * True when the keywords alone can be trusted with a question: the best fact
 * matches at least two cues and beats the next one. A single cue is often a
 * false hit ("app" in "appointment", "rule" in "ignore your rules").
 */
export function clearKeywordMatch(scenario: ProjectScenario, question: string, revealed: string[]) {
  const [best, next] = rankFacts(scenario, question, revealed);
  return Boolean(best && best.hits >= 2 && (!next || best.hits > next.hits));
}

/**
 * Keyword-based stand-in for the AI. Used when no model is configured or a model
 * call fails, and in tests. It is deliberately simple and errs towards strictness.
 */
export const offlineEvaluator: ProjectEvaluator = {
  async interview({ scenario, question, revealed, vagueIndex }) {
    // One fact per question keeps the conversation natural.
    const matches = rankFacts(scenario, question, revealed).slice(0, 1);
    if (!matches.length) {
      const replies = scenario.interview.vagueReplies;
      return { reply: replies[vagueIndex % replies.length], revealed: [], grader: KEYWORDS };
    }
    return {
      reply: matches.map((match) => match.fact.reply).join(" "),
      revealed: matches.map((match) => match.fact.id),
      grader: KEYWORDS,
    };
  },
  async checklist({ items, text }) {
    const body = normalise(text);
    const covered = items
      .filter((item) => item.cues.every((group) => cueHits(body, group) > 0))
      .map((item) => item.id);
    return { covered, grader: KEYWORDS };
  },
};
