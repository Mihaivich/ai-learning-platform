import test from "node:test";
import assert from "node:assert/strict";
import { resetModelCooldowns, type ModelCall } from "../src/lib/ai/gemini";
import { harbourClinicDraft } from "../src/lib/projects/generated/draft-example";
import { conceptsAsked, generateProject } from "../src/lib/projects/generated/generate";
import { checkPlan, isPathId, newPathId, planPath, stepStatuses, type PathPlan } from "../src/lib/projects/generated/path";

const plan: PathPlan = {
  title: "Statistics on the ward",
  summary: "Read ward numbers without being fooled. Plan an audit a committee will trust.",
  steps: [
    { title: "Counting fairly", topic: "a hand gel trial on a surgical ward", level: "none", concepts: ["Rates vs raw counts", "Confounding variables"], why: "Starts with what a number is out of." },
    { title: "Who got counted", topic: "a falls audit on an elderly-care ward", level: "some", concepts: ["Selection bias", "Missing data"], why: "Adds who is in the data at all." },
    { title: "Is it real?", topic: "a new pain score in an emergency department", level: "some", concepts: ["Regression to the mean", "Statistical significance"], why: "Adds whether a change is more than chance." },
  ],
};

const request = { subject: "statistics", domain: "healthcare", learner: "a second-year nursing student", level: "none" as const };

test("a plan teaches six different concepts and never gets easier", () => {
  assert.deepEqual(checkPlan(plan, request), []);

  const repeated = structuredClone(plan);
  repeated.steps[2].concepts[0] = "rates vs raw counts";
  assert.ok(checkPlan(repeated, request).some((problem) => problem.includes("taught twice")));

  const easier = structuredClone(plan);
  easier.steps[2].level = "none";
  assert.ok(checkPlan(easier, request).some((problem) => problem.includes("Step 3 is easier than step 2")));

  const tooHard = structuredClone(plan);
  tooHard.steps[0].level = "comfortable";
  assert.ok(checkPlan(tooHard, request).some((problem) => problem.includes("starts above the learner's level")));
});

test("a plan that fails its checks goes back to the model once", async () => {
  resetModelCooldowns();
  const repeated = structuredClone(plan);
  repeated.steps[1].concepts[1] = "Confounding variables";
  const prompts: string[] = [];
  const call: ModelCall = async (_model, req) => {
    prompts.push(req.prompt);
    return JSON.stringify(prompts.length === 1 ? repeated : plan);
  };
  const result = await planPath(request, { call, models: ["fake"] });
  assert.ok(!("error" in result));
  assert.equal(prompts.length, 2);
  assert.match(prompts[0], /The learner: a second-year nursing student/);
  assert.match(prompts[1], /taught twice/);
});

test("a step opens when the one before is finished, whatever the outcome", () => {
  assert.deepEqual(stepStatuses(3, [], []).map((step) => step.status), ["ready", "locked", "locked"]);

  const projects = [{ path_step: 1, id: "gen-aaaaaaaaaaaa" }];
  const playing = stepStatuses(3, projects, [{ course_id: "project:gen-aaaaaaaaaaaa", status: "active", outcome: null }]);
  assert.deepEqual(playing.map((step) => step.status), ["playing", "locked", "locked"]);

  const failed = stepStatuses(3, projects, [{ course_id: "project:gen-aaaaaaaaaaaa", status: "completed", outcome: "failure" }]);
  assert.deepEqual(failed.map((step) => step.status), ["done", "ready", "locked"]);
  assert.equal(failed[0].outcome, "failure");
  assert.equal(failed[0].projectId, "gen-aaaaaaaaaaaa");
});

test("a step's project is asked for its two concepts and told what came before", async () => {
  resetModelCooldowns();
  let prompt = "";
  const call: ModelCall = async (_model, req) => {
    prompt = req.prompt;
    return JSON.stringify(harbourClinicDraft);
  };
  await generateProject(
    { domain: "software", topic: "clinic bookings", subject: "software engineering", concepts: ["Race conditions", "Audit trails"], avoid: ["Input validation", "Idempotency"] },
    { id: "gen-7", call, models: ["fake"] },
  );
  assert.match(prompt, /problem concept "Race conditions", rule concept "Audit trails"/);
  assert.match(prompt, /do not teach them again: Input validation; Idempotency/);
});

test("a step's draft must teach the concepts its plan names", () => {
  const asked = { domain: "software", topic: "bookings", concepts: ["Race conditions", "Audit trail"] };
  assert.deepEqual(conceptsAsked(harbourClinicDraft, asked), []);
  const problems = conceptsAsked(harbourClinicDraft, { ...asked, concepts: ["Input validation", "Audit trail"] });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /this step teaches "Input validation"/);
  assert.deepEqual(conceptsAsked(harbourClinicDraft, { domain: "software", topic: "bookings" }), []);
});

test("path ids are unguessable and match the table's check", () => {
  const ids = new Set(Array.from({ length: 50 }, newPathId));
  assert.equal(ids.size, 50);
  for (const id of ids) assert.ok(isPathId(id) && /^path-[a-z0-9]{10,32}$/.test(id));
  assert.equal(isPathId("path-../etc"), false);
});
