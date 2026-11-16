import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { GenerateContentResponse, type Content, type GenerateContentParameters } from "@google/genai";
import { getClient } from "../src/lib/ai/gemini";
import { activityHistory, MODEL_HISTORY_LIMIT } from "../src/lib/learning/attempt-history";
import { evaluateActivity } from "../src/lib/learning/evaluate";
import { newActivity, type LearningActivity } from "../src/lib/learning/registry";

const lessonId = "conversation-lesson";
function conversation(minTurns: number) {
  const block = newActivity("conversation") as Extract<LearningActivity, { activityType: "conversation" }>;
  block.config.minTurns = minTurns;
  return block;
}
function attempts(block: LearningActivity, count: number) {
  return Array.from({ length: count }, (_, index) => ({
    activity_id: block.id,
    lesson_id: lessonId,
    activity_snapshot: block,
    response: `Learner turn ${index + 1}`,
    feedback: null,
  }));
}

type Prompt = { turn: number; minTurns: number; transcript: { response: string }[] };
function mockModel(t: TestContext) {
  const oldKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test-only-key";
  t.after(() => {
    if (oldKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = oldKey;
  });
  const prompts: Prompt[] = [];
  t.mock.method(getClient().models, "generateContent", async (params: GenerateContentParameters) => {
    const prompt: Prompt = JSON.parse((params.contents as Content[])[0].parts![0].text!);
    prompts.push(prompt);
    const criteria = prompt.turn >= prompt.minTurns ? [{
      criterion: "Model criterion",
      assessment: "met",
      evidence: "The learner made a concrete proposal.",
      suggestion: "Clarify the handoff time.",
    }] : [];
    const response = new GenerateContentResponse();
    response.candidates = [{ content: { role: "model", parts: [{ text: JSON.stringify({
      summary: "Your proposal addresses the scenario.", criteria,
      nextStep: "Explain your next decision.", characterReply: "When can you send it?",
    }) }] } }];
    return response;
  });
  return prompts;
}

for (const minimum of [9, 10, 12]) {
  test(`${minimum}-turn conversation finishes on its threshold with at most 8 model-history entries`, async t => {
    const prompts = mockModel(t);
    const block = conversation(minimum);
    // A single criterion keeps the fake model response aligned with this fixture.
    block.config.rubric = ["Responds to the scenario"];
    const before = activityHistory(attempts(block, minimum - 2), block, lessonId);
    const incomplete = await evaluateActivity(block, {
      lessonText: "A workplace negotiation", response: "Let us confirm the deadline.", ...before,
    });
    assert.equal(incomplete.complete, false);
    assert.equal(incomplete.feedback.criteria.length, 0);
    const atThreshold = activityHistory(attempts(block, minimum - 1), block, lessonId);
    const complete = await evaluateActivity(block, {
      lessonText: "A workplace negotiation", response: "I will send it by ten.", ...atThreshold,
    });
    assert.equal(complete.complete, true);
    assert.equal(complete.feedback.criteria.length, 1);
    assert.equal(complete.feedback.criteria[0].criterion, block.config.rubric[0]);
    assert.equal(prompts.at(-1)!.turn, minimum);
    assert.ok(prompts.every(prompt => prompt.transcript.length <= MODEL_HISTORY_LIMIT));
    assert.equal(atThreshold.previousAttemptCount, minimum - 1);
  });
}

test("conversation keeps counting after the threshold without expanding model context", async t => {
  const prompts = mockModel(t);
  const block = conversation(12);
  block.config.rubric = ["Stays relevant"];
  const history = activityHistory(attempts(block, 20), block, lessonId);
  const result = await evaluateActivity(block, { lessonText: "Practice", response: "Next step", ...history });
  assert.equal(result.complete, true);
  assert.equal(prompts[0].turn, 21);
  assert.equal(prompts[0].transcript.length, 8);
  assert.equal(prompts[0].transcript[0].response, "Learner turn 13");
});

test("saved evidence excludes other activities, lessons, snapshots and missing snapshots", () => {
  const block = conversation(12);
  const current = attempts(block, 3);
  const edited = structuredClone(block);
  edited.config.scenario = "A different task";
  const rows = [
    ...current,
    ...attempts(edited, 12),
    { ...current[0], activity_id: "other" },
    { ...current[0], lesson_id: "other-lesson" },
    { ...current[0], activity_snapshot: undefined },
    { ...current[0], activity_snapshot: { ...block, version: 2 } },
  ];
  const result = activityHistory(rows, block, lessonId);
  assert.equal(result.previousAttemptCount, 3);
  assert.deepEqual(result.attempts, current);
  assert.deepEqual(result.previous.map(row => row.response), current.map(row => row.response));
});

test("saved evidence ignores a forged preview count and unscoped browser history", () => {
  const block = conversation(12);
  const rows = [...attempts(block, 2), { response: "Untrusted turn", feedback: null }];
  const result = activityHistory(rows, block, lessonId, { previewAttemptCount: 1000 });
  assert.equal(result.previousAttemptCount, 2);
  assert.equal(result.previous.length, 2);
});

test("preview separates its full turn count from its recent 8 messages", async t => {
  const prompts = mockModel(t);
  const block = conversation(12);
  block.config.rubric = ["Stays relevant"];
  const recent = Array.from({ length: 8 }, (_, index) => ({ response: `Recent turn ${index + 4}`, feedback: null }));
  const context = activityHistory(recent, block, lessonId, { ephemeral: true, previewAttemptCount: 11 });
  const result = await evaluateActivity(block, { lessonText: "Practice", response: "Twelfth turn", ...context });
  assert.equal(result.complete, true);
  assert.equal(prompts[0].turn, 12);
  assert.equal(prompts[0].transcript.length, 8);
});

test("legacy preview history works without a count and cannot undercount supplied messages", () => {
  const block = conversation(3);
  const rows = [{ response: "First", feedback: null }, { response: "Second", feedback: null }];
  assert.equal(activityHistory(rows, block, lessonId, { ephemeral: true }).previousAttemptCount, 2);
  assert.equal(activityHistory(rows, block, lessonId, { ephemeral: true, previewAttemptCount: 0 }).previousAttemptCount, 2);
});

test("reordered JSONB fields preserve valid attempts while changed minTurns resets them", () => {
  const block = conversation(12);
  const reordered = { ...block, config: Object.fromEntries(Object.entries(block.config).reverse()) };
  const rows = [{ ...attempts(block, 1)[0], activity_snapshot: reordered }];
  assert.equal(activityHistory(rows, block, lessonId).previousAttemptCount, 1);
  const changed = structuredClone(block);
  changed.config.minTurns = 10;
  assert.equal(activityHistory(rows, changed, lessonId).previousAttemptCount, 0);
});
