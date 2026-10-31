import test from "node:test";
import assert from "node:assert/strict";
import { offlineEvaluator } from "../src/lib/projects/evaluate";
import { buildScenario } from "../src/lib/projects/generated/build";
import { projectDraftSchema } from "../src/lib/projects/generated/draft";
import { checkProject } from "../src/lib/projects/generated/validate";
import { askClient, chooseAction, endInterview, startProject, submitBrief, submitRequirements, type ProjectStep } from "../src/lib/projects/runtime";
import { getProjectScenario } from "../src/lib/projects";
import { projectListings } from "../src/lib/projects/catalog";
import { parcelPalDraft } from "../src/lib/projects/parcelpal";
import { tidewaterSwimDraft } from "../src/lib/projects/tidewater-swim";

// Built-in projects written as drafts: they must pass the same checks as generated ones.
const drafts = { "tidewater-swim": tidewaterSwimDraft, parcelpal: parcelPalDraft };

for (const [id, draft] of Object.entries(drafts)) {
  test(`${id} passes every check and teaches its two concepts`, async () => {
    const parsed = projectDraftSchema.parse(draft);
    const check = await checkProject(buildScenario(parsed, { id }), parsed, { requireConcepts: true });
    assert.deepEqual(check.problems, []);
    assert.ok(getProjectScenario(id), "registered as a built-in project");
    assert.ok(projectListings.some((listing) => listing.id === id && listing.title === draft.title), "listed on the projects page");
  });

  test(`${id} plays through to a 10/10 success`, async () => {
    const scenario = getProjectScenario(id)!;
    const take = (step: ProjectStep) => step.state;
    let state = startProject(scenario);
    state = take(chooseAction(scenario, state, "pick-product"));
    state = take(chooseAction(scenario, state, "call-grace"));
    for (const fact of Object.values(draft.facts)) {
      state = (await askClient(scenario, state, fact.sampleQuestion, offlineEvaluator)).state;
    }
    state = take(endInterview(scenario, state));
    state = take(await submitRequirements(scenario, state, draft.samples.requirements, offlineEvaluator));
    state = take(await submitBrief(scenario, state, draft.samples.brief, offlineEvaluator));
    state = take(chooseAction(scenario, state, "approve"));
    state = take(chooseAction(scenario, state, "release-measure"));
    assert.equal(state.outcome, "success");
    assert.equal(state.variables.trust, 10);
  });
}
