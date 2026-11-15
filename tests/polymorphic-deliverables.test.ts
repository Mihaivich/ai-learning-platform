import test from "node:test";
import assert from "node:assert/strict";
import { getProjectScenario } from "../src/lib/projects";
import { beanAndBreadDraft } from "../src/lib/projects/bean-and-bread";
import { offlineEvaluator } from "../src/lib/projects/evaluate";
import { buildScenario, TEMPLATE_VERSION } from "../src/lib/projects/generated/build";
import { checkProject } from "../src/lib/projects/generated/validate";
import { riverNitrateLabDraft } from "../src/lib/projects/river-nitrate-lab";
import { answerViva, askClient, chooseAction, endInterview, projectView, startProject, submitBrief, submitRequirements } from "../src/lib/projects/runtime";
import { sunsetDaycareDraft } from "../src/lib/projects/sunset-daycare";

test("TEMPLATE_VERSION is bumped to 2 for cross-disciplinary deliverables and Live Viva", () => {
  assert.equal(TEMPLATE_VERSION, 2);
});

const deliverableExpectations = [
  { id: "sunset-daycare", draft: sunsetDaycareDraft, kind: "table" as const, entryWord: "row" },
  { id: "bean-and-bread", draft: beanAndBreadDraft, kind: "document" as const, entryWord: "§" },
  { id: "river-nitrate-lab", draft: riverNitrateLabDraft, kind: "steps" as const, entryWord: "step" },
];

for (const { id, draft, kind, entryWord } of deliverableExpectations) {
  test(`${id} exposes polymorphic '${kind}' deliverable and '${entryWord}' review labels`, async () => {
    const scenario = getProjectScenario(id)!;
    assert.ok(scenario);
    assert.equal(scenario.artifactKind, kind);

    const built = buildScenario(draft, { id });
    const check = await checkProject(built, draft, { requireConcepts: true });
    assert.deepEqual(check.problems, []);

    let state = startProject(scenario);
    state = chooseAction(scenario, state, "pick-engineering").state;
    state = chooseAction(scenario, state, "call-grace").state;
    for (const fact of Object.values(draft.facts)) {
      state = (await askClient(scenario, state, fact.sampleQuestion, offlineEvaluator)).state;
    }
    state = endInterview(scenario, state).state;
    state = (await submitRequirements(scenario, state, draft.samples.requirements, offlineEvaluator)).state;
    state = (await submitBrief(scenario, state, draft.samples.brief, offlineEvaluator)).state;

    const view = projectView(scenario, state, []);
    assert.equal(view.scenario.artifactKind, kind);
    assert.ok(view.work && view.work.files.length > 0);
    assert.equal(view.work.files[0].kind, kind);
    // Specialist deliverables show artifact checks even without software code-test flags.
    assert.ok(view.work.checks.length > 0);

    // Trigger wrong review reason check cleanly by reaching release on missesProblem? Wait: brief covered everything,
    // verify entryLabel format in build check variant indirectly on missesProblem:
    let flawState = startProject(scenario);
    flawState = chooseAction(scenario, flawState, "pick-engineering").state;
    flawState = chooseAction(scenario, flawState, "call-grace").state;
    for (const fact of Object.values(draft.facts)) {
      flawState = (await askClient(scenario, flawState, fact.sampleQuestion, offlineEvaluator)).state;
    }
    flawState = endInterview(scenario, flawState).state;
    flawState = (await submitRequirements(scenario, flawState, draft.samples.requirements, offlineEvaluator)).state;
    flawState = (await submitBrief(scenario, flawState, `${draft.constraints.rule.label}. ${draft.constraints.scope.label}.`, offlineEvaluator)).state;
    flawState = (await import("../src/lib/projects/runtime").then((m) =>
      m.sendBack(scenario, flawState, { ...scenario.variants.find((v) => v.id === "misses-problem")!.problemLines[0], explanation: draft.concepts!.problem.explanation }, offlineEvaluator),
    )).state;
    const reviewLabel = projectView(scenario, flawState, []).work!.reviews[0].label;
    assert.ok(reviewLabel.includes(entryWord), `Expected '${reviewLabel}' to include '${entryWord}'`);
  });
}

test("Live Viva rejects generic filler and rewards domain risk + verification answers", async () => {
  async function reachRelease(id: string) {
    const scenario = getProjectScenario(id)!;
    let state = startProject(scenario);
    state = chooseAction(scenario, state, "pick-product").state;
    state = chooseAction(scenario, state, "call-grace").state;
    for (const q of ["What is going wrong today?", "What rules must we keep?", "What is in scope?"]) {
      state = (await askClient(scenario, state, q, offlineEvaluator)).state;
    }
    state = endInterview(scenario, state).state;
    state = (await submitRequirements(scenario, state, "General overview", offlineEvaluator)).state;
    state = (await submitBrief(scenario, state, "General brief", offlineEvaluator)).state;
    state = chooseAction(scenario, state, "approve").state;
    return { scenario, state };
  }

  for (const [id, strongAnswer] of [
    [
      "harbour-clinic",
      "The database rejects two receptionists trying to book the same time slot simultaneously, and we will test with Mandy first to keep double bookings fewer than one.",
    ],
    [
      "sunset-daycare",
      "A £6 small fee crowds out social guilt and triggers higher lateness, so we remove the fee and track all 65 families via door clipboard down to 6 or fewer by week 4.",
    ],
  ] as const) {
    const { scenario, state } = await reachRelease(id);
    const beforeTrust = Number(state.variables.trust ?? 0);

    const generic = await answerViva(
      scenario,
      state,
      "We will run a weekly pilot to measure next week's count rate and check target goals to make it better.",
      offlineEvaluator,
    );
    const genericView = projectView(scenario, generic.state, generic.events);
    assert.notEqual(genericView.viva?.response?.rating, "strong");
    assert.equal(genericView.viva?.response?.trustDelta, 0);
    assert.equal(Number(generic.state.variables.trust ?? 0), beforeTrust);

    const specific = await answerViva(scenario, state, strongAnswer, offlineEvaluator);
    const specificView = projectView(scenario, specific.state, specific.events);
    assert.equal(specificView.viva?.response?.rating, "strong");
    assert.equal(specificView.viva?.response?.trustDelta, 1);
    assert.equal(Number(specific.state.variables.trust ?? 0), Math.min(10, beforeTrust + 1));
  }
});
