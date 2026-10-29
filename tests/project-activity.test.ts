import test from "node:test";
import assert from "node:assert/strict";
import { evaluateProjectEvidence, projectAttemptId, type ProjectEvidence } from "../src/lib/learning/project-evidence";
import { activityForTutor, completionThreshold, newActivity, validateActivity } from "../src/lib/learning/registry";
import { evaluateActivity } from "../src/lib/learning/evaluate";
import { lessonHref, projectHref } from "../src/lib/learning/project-links";
import { harbourClinic } from "../src/lib/projects/harbour-clinic";
import { startProject, chooseAction, askClient, endInterview, submitRequirements, submitBrief, type ProjectStep } from "../src/lib/projects/runtime";
import { offlineEvaluator } from "../src/lib/projects/evaluate";
import type { SimulationHistory } from "../src/lib/learning/simulation/engine";
import { courses } from "../src/content/courses";
import { safeSignInReturn } from "../src/lib/auth-redirect";

const block = newActivity("project");
if (block.activityType !== "project") throw new Error("Expected project activity");
const activity = block;

async function finishedRun(track: "product" | "engineering"): Promise<ProjectEvidence> {
  const scenario = harbourClinic;
  let state = startProject(scenario);
  const history: SimulationHistory = [];
  function step(result: ProjectStep) { state = result.state; history.push(...result.events); }
  step(chooseAction(scenario, state, `pick-${track}`));
  step(chooseAction(scenario, state, "call-grace"));
  for (const question of ["Why do the double bookings happen?", "What happens to cancelled appointments?", "Who will use it?"]) {
    state = (await askClient(scenario, state, question, offlineEvaluator)).state;
  }
  step(endInterview(scenario, state));
  step(await submitRequirements(scenario, state, "Stop double bookings.", offlineEvaluator));
  step(await submitBrief(scenario, state, "Stop double bookings when saving.", offlineEvaluator));
  step(chooseAction(scenario, state, "approve"));
  step(chooseAction(scenario, state, "release-pilot"));
  return { run_id: crypto.randomUUID(), activity_snapshot: { project: scenario.id, version: scenario.version }, state, history };
}

test("immersive projects extend the registry while generic simulation stays available", () => {
  assert.equal(validateActivity(activity).success, true);
  assert.equal(completionThreshold(activity), 1);
  assert.equal(newActivity("simulation").activityType, "simulation");
  assert.equal(validateActivity({ ...activity, config: { scenarioId: "unavailable-project" } }).success, false);
  assert.ok(courses.some((course) => course.lessons.some((lesson) => lesson.blocks.some((item) => item.activityType === "project"))));
  assert.doesNotMatch(JSON.stringify(activityForTutor(activity)), /checklist|variant|hidden|bugLines/);
});

test("text submissions cannot bypass the authoritative project completion path", async () => {
  await assert.rejects(evaluateActivity(activity, { response: "I finished successfully", previous: [], lessonText: "" }), /server session/);
  assert.throws(() => evaluateProjectEvidence(activity, null), /Complete the current version/);
  assert.throws(() => evaluateProjectEvidence(activity, {
    run_id: crypto.randomUUID(), activity_snapshot: { project: harbourClinic.id, version: harbourClinic.version },
    state: startProject(harbourClinic), history: [],
  }), /Finish the project/);
});

test("both tracks produce course feedback from the actual completion report", async () => {
  for (const track of ["product", "engineering"] as const) {
    const evidence = await finishedRun(track);
    const result = evaluateProjectEvidence(activity, evidence);
    assert.equal(result.complete, true);
    assert.equal(result.score, null);
    assert.equal(result.feedback.criteria.length, 4);
    assert.match(result.feedback.summary, /partial/);
    assert.ok(result.feedback.criteria.every((item) => item.evidence.length));
    const stale = { ...evidence, activity_snapshot: { project: harbourClinic.id, version: -1 } };
    assert.throws(() => evaluateProjectEvidence(activity, stale), /current version/);
  }
});

test("retries are idempotent and separate activities, courses, users and runs stay separate", () => {
  const context = { courseId: "course", lessonId: "lesson", activityId: activity.id };
  const first = projectAttemptId(context, "user", "run", activity);
  assert.match(first, /^[a-f0-9]{8}-[a-f0-9]{4}-5[a-f0-9]{3}-a[a-f0-9]{3}-[a-f0-9]{12}$/);
  assert.equal(first, projectAttemptId({ activityId: activity.id, lessonId: "lesson", courseId: "course" }, "user", "run", activity));
  assert.notEqual(first, projectAttemptId(context, "other-user", "run", activity));
  assert.notEqual(first, projectAttemptId(context, "user", "new-run", activity));
  assert.notEqual(first, projectAttemptId({ ...context, courseId: "other" }, "user", "run", activity));
  assert.notEqual(first, projectAttemptId({ ...context, activityId: "other" }, "user", "run", activity));
});

test("course launch links retain context and construct a local lesson return path", () => {
  const context = { courseId: "course", lessonId: "lesson", activityId: "activity" };
  assert.equal(projectHref("harbour-clinic"), "/projects/harbour-clinic");
  assert.equal(projectHref("harbour-clinic", context), "/projects/harbour-clinic?courseId=course&lessonId=lesson&activityId=activity");
  assert.equal(lessonHref(context), "/courses/course/lesson");
  assert.equal(lessonHref({ ...context, courseId: "https://evil.example", lessonId: "../../" }), "/courses/https%3A%2F%2Fevil.example/..%2F..%2F");
});

test("sign-in retains the course activity without accepting an external redirect", () => {
  const href = projectHref("harbour-clinic", { courseId: "course", lessonId: "lesson", activityId: "activity" });
  assert.equal(safeSignInReturn(href), href);
  for (const invalid of ["https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)", undefined, null]) {
    assert.equal(safeSignInReturn(invalid), "/");
  }
});
