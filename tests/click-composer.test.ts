import test from "node:test";
import assert from "node:assert/strict";
import { harbourClinic } from "../src/lib/projects/harbour-clinic";
import { parcelPal } from "../src/lib/projects/parcelpal";
import { tidewaterSwim } from "../src/lib/projects/tidewater-swim";
import { wardInfectionAudit } from "../src/lib/projects/ward-infection-audit";
import { offlineEvaluator, rankFacts } from "../src/lib/projects/evaluate";
import {
  buildBriefComposer,
  buildRequirementsComposer,
  buildReviewNoteOptions,
  buildSuggestedQuestions,
  containsConceptName,
  itemCoveredBy,
} from "../src/lib/projects/composer";
import {
  chooseAction,
  explanationItems,
  projectView,
  startProject,
} from "../src/lib/projects/runtime";

const SCENARIOS = [harbourClinic, tidewaterSwim, parcelPal, wardInfectionAudit];

test("click-composer emits zero bracketed cue hints across all built-in projects", () => {
  for (const scenario of SCENARIOS) {
    const questions = buildSuggestedQuestions(scenario, []);
    for (const q of questions) {
      assert.equal(/\[[^\]]+\]/.test(q), false, `${scenario.id}: bracketed hint in question: ${q}`);
      assert.equal(containsConceptName(scenario, q), false, `${scenario.id}: concept name leaked in question: ${q}`);
    }

    const allFactIds = scenario.facts.map((f) => f.id);
    for (const track of ["product", "engineering"] as const) {
      for (const revealed of [[], allFactIds]) {
        const reqSlots = buildRequirementsComposer(scenario, track, revealed);
        const briefSlots = buildBriefComposer(scenario, track, revealed);
        for (const slot of [...reqSlots, ...briefSlots]) {
          assert.equal(/\[[^\]]+\]/.test(slot.prompt), false, `${scenario.id}: bracketed hint in prompt`);
          assert.equal(containsConceptName(scenario, slot.prompt), false, `${scenario.id}: concept leak in prompt`);
          for (const opt of slot.options) {
            assert.equal(/\[[^\]]+\]/.test(opt.text), false, `${scenario.id} ${slot.id}: bracketed hint in ${opt.text}`);
            assert.equal(
              containsConceptName(scenario, opt.text),
              false,
              `${scenario.id} ${slot.id}: concept name leak in ${opt.text}`,
            );
          }
        }
      }
    }

    const notes = buildReviewNoteOptions(scenario);
    for (const opt of notes) {
      assert.equal(/\[[^\]]+\]/.test(opt.text), false, `${scenario.id}: bracketed hint in note: ${opt.text}`);
      assert.equal(containsConceptName(scenario, opt.text), false, `${scenario.id}: concept leak in note: ${opt.text}`);
    }
  }
});

test("suggested questions provide >= 5 unproductive distractors and exceed maxQuestions", () => {
  for (const scenario of SCENARIOS) {
    const questions = buildSuggestedQuestions(scenario, []);
    assert.ok(
      questions.length > scenario.interview.maxQuestions,
      `${scenario.id}: expected > ${scenario.interview.maxQuestions} options, got ${questions.length}`,
    );
    const unproductive = questions.filter((q) => rankFacts(scenario, q, []).length === 0);
    const productive = questions.filter((q) => rankFacts(scenario, q, []).length > 0);
    assert.ok(
      unproductive.length >= 5,
      `${scenario.id}: expected >= 5 unproductive distractors, got ${unproductive.length}`,
    );
    assert.ok(productive.length >= 4, `${scenario.id}: expected >= 4 productive questions, got ${productive.length}`);

    const afterOne = buildSuggestedQuestions(scenario, [{ role: "learner", text: questions[0] }]);
    assert.equal(afterOne.includes(questions[0]), false);
    assert.equal(afterOne.length, questions.length - 1);
  }
});

test("strict discovery gating: locked options cover 0 requirements or brief rules when revealed=[]", async () => {
  for (const scenario of SCENARIOS) {
    const reqSlots = buildRequirementsComposer(scenario, "product", []);
    assert.equal(reqSlots.every((slot) => !slot.unlocked), true);
    const allLockedReqText = reqSlots.flatMap((slot) => slot.options.map((o) => o.text)).join(" ");
    const reqCheck = await offlineEvaluator.checklist({ items: scenario.requirements, text: allLockedReqText });
    assert.deepEqual(reqCheck.covered, [], `${scenario.id}: locked requirements should cover nothing`);

    const briefSlots = buildBriefComposer(scenario, "engineering", []);
    const activeBriefItems = scenario.brief;
    briefSlots.forEach((slot, idx) => {
      if (activeBriefItems[idx].id !== "C4") assert.equal(slot.unlocked, false);
    });
    const lockedBriefText = briefSlots
      .filter((slot) => !slot.unlocked)
      .flatMap((slot) => slot.options.map((o) => o.text))
      .join(" ");
    const gatedBriefItems = scenario.brief.filter((item) => item.id !== "C4");
    const briefCheck = await offlineEvaluator.checklist({ items: gatedBriefItems, text: lockedBriefText });
    assert.deepEqual(briefCheck.covered, [], `${scenario.id}: locked brief should cover nothing`);
  }
});

test("unlocked composer has exactly 1 accurate option and 2 distractors per slot and passes grading", async () => {
  for (const scenario of SCENARIOS) {
    const allFacts = scenario.facts.map((f) => f.id);
    const supportsEng = scenario.variants.some((v) => v.files.length > 0);
    const track = supportsEng ? "engineering" : "product";

    const reqSlots = buildRequirementsComposer(scenario, track, allFacts);
    assert.equal(reqSlots.length, 5);
    const reqPicked: string[] = [];
    reqSlots.forEach((slot, idx) => {
      assert.equal(slot.unlocked, true);
      assert.equal(slot.options.length, 3);
      const item = scenario.requirements[idx];
      const matches = slot.options.filter((opt) => itemCoveredBy(opt.text, item));
      assert.equal(matches.length, 1, `${scenario.id} ${item.id}: expected exactly 1 accurate option`);
      reqPicked.push(matches[0].text);
    });
    const reqResult = await offlineEvaluator.checklist({ items: scenario.requirements, text: reqPicked.join(" ") });
    assert.equal(reqResult.covered.length, 5, `${scenario.id}: assembled requirements missed an item`);

    const activeBriefItems = scenario.brief.filter((b) => !b.tracks || b.tracks.includes(track));
    const briefSlots = buildBriefComposer(scenario, track, allFacts);
    assert.equal(briefSlots.length, activeBriefItems.length);
    const briefPicked: string[] = [];
    briefSlots.forEach((slot, idx) => {
      assert.equal(slot.unlocked, true);
      assert.equal(slot.options.length, 3);
      const item = activeBriefItems[idx];
      const matches = slot.options.filter((opt) => itemCoveredBy(opt.text, item));
      assert.equal(matches.length, 1, `${scenario.id} ${item.id}: expected exactly 1 accurate brief option`);
      briefPicked.push(matches[0].text);
    });
    const briefResult = await offlineEvaluator.checklist({ items: activeBriefItems, text: briefPicked.join(" ") });
    assert.equal(briefResult.covered.length, activeBriefItems.length, `${scenario.id}: assembled brief missed an item`);
  }
});

test("review note starters offer 6 concept-free options where causal ones earn what+why", async () => {
  for (const scenario of SCENARIOS) {
    const starters = buildReviewNoteOptions(scenario);
    assert.equal(starters.length, 6, `${scenario.id}: expected 6 note starters`);

    for (const concept of scenario.concepts ?? []) {
      const items = explanationItems(scenario, concept);
      let strongCount = 0;
      for (const opt of starters) {
        assert.equal(containsConceptName(scenario, opt.text), false);
        const res = await offlineEvaluator.checklist({ items, text: opt.text });
        if (res.covered.includes("what") && res.covered.includes("why")) {
          strongCount += 1;
        }
      }
      assert.ok(strongCount >= 1, `${scenario.id} ${concept.id}: expected >= 1 starter covering what+why`);
    }
  }
});

test("projectView wires composer fields without exposing server samples", () => {
  const step = chooseAction(harbourClinic, startProject(harbourClinic), "pick-product");
  const view = projectView(harbourClinic, step.state, []);
  assert.ok(view.interview.suggestedQuestions.length > harbourClinic.interview.maxQuestions);
  assert.equal(view.requirementsComposer.length, 5);
  assert.equal(view.briefComposer.length, 3);
  assert.equal("samples" in view.scenario, false);
});
