import { applySimulationAction, type SimulationState } from "@/lib/learning/simulation/engine";
import { simulationProblems } from "@/lib/learning/simulation/schema";
import { offlineEvaluator } from "../evaluate";
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

function system(scenario: ProjectScenario, state: SimulationState, actionId: string) {
  return applySimulationAction(scenario.config, state, actionId, { system: true }).state;
}

export async function checkProject(scenario: ProjectScenario, draft: ProjectDraft): Promise<ProjectCheck> {
  const problems: string[] = [];
  const warnings: string[] = [];

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
