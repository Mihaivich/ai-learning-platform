import { applySimulationAction, type SimulationState } from "@/lib/learning/simulation/engine";
import { simulationProblems } from "@/lib/learning/simulation/schema";
import { cueHits, normalise, offlineEvaluator } from "../evaluate";
import {
  askClient,
  chooseAction,
  endInterview,
  memoOf,
  requestChanges,
  startProject,
  submitBrief,
  submitRequirements,
} from "../runtime";
import type { ProjectScenario } from "../types";
import type { ProjectDraft } from "./draft";

/*
 * Checks a generated project before anyone can play it. Problems make it
 * unusable; warnings are worth a look but do not block it.
 *
 * Everything runs with the keyword grader, so a project that passes stays
 * playable when the AI is unavailable.
 */

export type ProjectCheck = { problems: string[]; warnings: string[] };

const ROLE_OF_FACT: Record<string, keyof ProjectDraft["facts"]> = {
  F1: "problem",
  F2: "rule",
  F3: "scope",
  F4: "detail",
  F5: "environment",
  F6: "success",
};

// Words that explain a flaw instead of showing it.
const TELLS = ["because", "fails to", "failed to", "ignoring", "ignores", "without adjusting", "mislead", "artificially", "points out", "point out", "incorrectly", "by mistake", "flaw"];

const COMMON = new Set("about after also analysis because before being between both could data does from have into just more must only other over same should some such than that their them then there these they this those through under were what when where which while will with would your".split(" "));

/** Words of five letters or more that carry meaning. */
function contentWords(text: string) {
  return [...new Set(normalise(text).trim().split(" ").filter((word) => word.length >= 5 && !COMMON.has(word)))];
}

function system(scenario: ProjectScenario, state: SimulationState, actionId: string) {
  return applySimulationAction(scenario.config, state, actionId, { system: true }).state;
}

export async function checkProject(
  scenario: ProjectScenario,
  draft: ProjectDraft,
  options: { requireConcepts?: boolean } = {},
): Promise<ProjectCheck> {
  const problems: string[] = [];
  const warnings: string[] = [];

  // A subject mission must teach its concepts, and each must matter to the job:
  // it appears in what the client says and in the flaw the learner has to catch.
  if (options.requireConcepts && !draft.concepts) problems.push("The draft has no concepts, but this job teaches a subject.");
  if (draft.concepts) {
    const flawed = { problem: "missesProblem", rule: "missesRule" } as const;
    for (const role of ["problem", "rule"] as const) {
      const concept = draft.concepts[role];
      const fact = normalise(`${draft.facts[role].text} ${draft.facts[role].reply}`);
      const version = draft.deliverables[flawed[role]];
      const flaw = normalise([version.summary, ...version.demo.flatMap((step) => [step.action, step.result]), draft.reviewReasons[role]].join(" "));
      if (!cueHits(fact, concept.cues)) {
        problems.push(`The "${concept.name}" concept isn't in the ${role} fact: none of its cues (${concept.cues.join(", ")}) appear in what the client says.`);
      }
      if (!cueHits(flaw, concept.cues)) {
        problems.push(`The "${concept.name}" concept isn't in the ${flawed[role]} version: none of its cues appear in its walkthrough or review reason.`);
      }
    }
    if (normalise(draft.concepts.problem.name) === normalise(draft.concepts.rule.name)) {
      problems.push("The two concepts have the same name; they must be different ideas.");
    }
    // Working out the concept is the learner's job, so nothing may hand it over.
    for (const role of ["problem", "rule"] as const) {
      const concept = draft.concepts[role];
      const reply = normalise(draft.facts[role].reply);
      // The whole name, or a distinctive word of it: "auditors" alone is the situation, but
      // "audit trail" or "confounder" hands the concept over.
      const words = contentWords(concept.name);
      const all = words.length > 0 && words.every((word) => reply.includes(` ${word.slice(0, 5)}`));
      const distinctive = words.some((word) => word.length >= 9 && reply.includes(` ${word.slice(0, 6)}`));
      if (all || distinctive) {
        problems.push(`The client names the "${concept.name}" concept. The client describes the situation only.`);
      }
      const fix = contentWords(draft.reviewReasons[role]).filter((word) => reply.includes(` ${word}`));
      if (fix.length >= 3) problems.push(`The client's ${role} answer states the fix in the review reason's words (${fix.join(", ")}). Describe the situation, not the fix.`);
      if (normalise(concept.inTheJob).includes(` ${normalise(draft.assistant.name).trim()} `)) {
        problems.push(`"In this job" for "${concept.name}" mentions ${draft.assistant.name}. It must only say what to look for.`);
      }
    }
  }

  // The two flawed versions go wrong in different ways, one per concept. Good drafts share
  // about a quarter of their words; two takes on the same mistake share over half.
  const flawWords = (key: "missesProblem" | "missesRule") => {
    const { summary, demo } = draft.deliverables[key];
    return new Set(contentWords(`${summary} ${demo.map((step) => `${step.action} ${step.result}`).join(" ")}`).map((word) => word.slice(0, 5)));
  };
  const [missesProblem, missesRule] = [flawWords("missesProblem"), flawWords("missesRule")];
  const shared = [...missesProblem].filter((word) => missesRule.has(word)).length;
  if (shared / new Set([...missesProblem, ...missesRule]).size > 0.45) {
    problems.push("The missesProblem and missesRule versions make the same mistake. Each must go wrong for its own concept alone.");
  }

  // Success has to be something the client can count.
  if (!/\d|\b(one|two|three|four|five|six|seven|eight|nine|ten|twelve|twenty|hundred|half)\b/i.test(draft.facts.success.text)) {
    problems.push(`The success fact ("${draft.facts.success.text}") has no number. Make it a target the client can count.`);
  }

  // Show, don't tell: a flawed version shows the result, never why it is wrong. Endings
  // come after the release, so they may explain.
  for (const key of ["missesProblem", "missesRule", "scopeCreep"] as const) {
    const { summary, demo } = draft.deliverables[key];
    const steps = normalise(`${summary} ${demo.map((step) => `${step.action} ${step.result}`).join(" ")}`);
    const tells = TELLS.filter((tell) => steps.includes(` ${tell}`));
    if (tells.length) problems.push(`The ${key} walkthrough explains its own flaw (${tells.join(", ")}). Show the confident result and let the learner work out why.`);
  }

  problems.push(...simulationProblems(scenario.config, { allowSystemActions: true }));

  // Each fact can be uncovered by keywords alone.
  for (const fact of scenario.facts) {
    const role = ROLE_OF_FACT[fact.id];
    const question = draft.facts[role].sampleQuestion;
    const answer = await offlineEvaluator.interview({ scenario, question, turns: [], revealed: [], vagueIndex: 0 });
    if (answer.revealed[0] !== fact.id) {
      problems.push(
        `The sample question for the ${role} fact ("${question}") uncovers ${answer.revealed[0] ?? "nothing"} with keywords, not ${fact.id}. Its cues need to match the question better.`,
      );
    }
  }

  // A cue shared by two facts makes keyword answers ambiguous.
  const owners = new Map<string, string[]>();
  for (const fact of scenario.facts) {
    for (const cue of new Set(fact.cues)) owners.set(cue, [...(owners.get(cue) ?? []), fact.id]);
  }
  for (const [cue, ids] of owners) {
    if (ids.length > 1) warnings.push(`The cue "${cue}" belongs to more than one fact (${ids.join(", ")}).`);
  }

  // The model answers cover every item, so each item's cues are reachable.
  const requirements = await offlineEvaluator.checklist({ items: scenario.requirements, text: draft.samples.requirements });
  for (const item of scenario.requirements) {
    if (!requirements.covered.includes(item.id)) {
      problems.push(`The sample requirements don't cover ${item.id} ("${item.label}") with keywords.`);
    }
  }
  const brief = await offlineEvaluator.checklist({ items: scenario.brief, text: draft.samples.brief });
  for (const item of scenario.brief) {
    if (!brief.covered.includes(item.id)) {
      problems.push(`The sample brief doesn't cover ${item.id} ("${item.label}") with keywords.`);
    }
  }
  if (problems.length) return { problems, warnings };

  // Play it: the perfect path, then every flawed version.
  try {
    let state = startProject(scenario);
    state = chooseAction(scenario, state, "pick-product").state;
    state = chooseAction(scenario, state, "call-grace").state;
    for (const fact of scenario.facts) {
      state = (await askClient(scenario, state, draft.facts[ROLE_OF_FACT[fact.id]].sampleQuestion, offlineEvaluator)).state;
    }
    state = endInterview(scenario, state).state;
    state = (await submitRequirements(scenario, state, draft.samples.requirements, offlineEvaluator)).state;
    const atBrief = state;

    const perfect = (await submitBrief(scenario, atBrief, draft.samples.brief, offlineEvaluator)).state;
    if (perfect.variables.variant !== "good") problems.push(`The sample brief produced "${perfect.variables.variant}", not the good version.`);
    let done = chooseAction(scenario, perfect, "approve").state;
    done = chooseAction(scenario, done, "release-measure").state;
    if (done.outcome !== "success") problems.push(`The perfect path ended "${done.outcome}", not success.`);
    if (done.variables.trust !== 10) problems.push(`The perfect path ended with trust ${done.variables.trust}, not 10.`);

    const flawed: { action: string; reason: string; fullRelease: string }[] = [
      { action: "brief-problem", reason: "problem", fullRelease: "failure" },
      { action: "brief-rule", reason: "rule", fullRelease: "failure" },
      { action: "brief-scope", reason: "scope", fullRelease: "partial" },
    ];
    for (const { action, reason, fullRelease } of flawed) {
      const review = system(scenario, system(scenario, atBrief, action), "without-test");
      const released = chooseAction(scenario, chooseAction(scenario, review, "approve").state, "release-now").state;
      if (released.outcome !== fullRelease) problems.push(`Releasing the ${action} version to everyone ended "${released.outcome}", not ${fullRelease}.`);
      if (fullRelease === "failure") {
        const piloted = chooseAction(scenario, chooseAction(scenario, review, "approve").state, "release-pilot").state;
        if (piloted.outcome !== "partial") problems.push(`A pilot of the ${action} version ended "${piloted.outcome}", not partial.`);
      }
      const fixed = requestChanges(scenario, review, { reasonId: reason }).state;
      if (fixed.variables.variant !== "good") problems.push(`Sending the ${action} version back for "${reason}" did not fix it.`);
      const wrong = requestChanges(scenario, review, { reasonId: "distractor" }).state;
      if (memoOf(wrong).reviews.at(-1)?.correct !== false) problems.push(`The distractor reason fixed the ${action} version.`);
    }
  } catch (error) {
    problems.push(`The project could not be played through: ${error instanceof Error ? error.message : String(error)}`);
  }

  return { problems, warnings };
}
