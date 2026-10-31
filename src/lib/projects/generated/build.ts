import type { z } from "zod";
import {
  SIMULATION_SCHEMA_VERSION,
  simulationComparisonSchema,
  simulationConditionSchema,
  simulationConfigSchema,
} from "@/lib/learning/simulation/schema";
import type { ChecklistItem, CodeFile, CodeVariant, ProjectFact, ProjectScenario } from "../types";
import type { FactRole, ProjectDraft } from "./draft";

/*
 * Turns AI-written content into a playable project. The structure is fixed and
 * mirrors Harbour Clinic: the same stages, the same effects and trust changes,
 * and the same endings. Generated projects use the product track only (review
 * a walkthrough and send it back with a reason), which works in any domain.
 * Built-in projects may add the engineering track: the code of each version,
 * reviewed line by line, and a test the brief can ask for.
 *
 * Action and checklist ids are the ones the runtime and report rely on
 * ("call-grace", C1-C3, R4, ...). They are internal and never shown.
 */

const FACT_IDS: Record<FactRole, string> = {
  problem: "F1",
  rule: "F2",
  scope: "F3",
  detail: "F4",
  environment: "F5",
  success: "F6",
};

const VARIANTS = {
  good: "good",
  missesProblem: "misses-problem",
  missesRule: "misses-rule",
  scopeCreep: "scope-creep",
} as const;

function firstName(name: string) {
  return name.trim().split(/\s+/)[0];
}

type Comparison = z.input<typeof simulationComparisonSchema>;
type Condition = z.input<typeof simulationConditionSchema>;

function cond(variable: string, op: "eq" | "neq", value: string | boolean): Comparison {
  return { kind: "compare", variable, op, value };
}

function all(...conditions: Comparison[]): Condition {
  return { kind: "group", op: "and", conditions };
}

/**
 * The engineering track, written by hand for built-in projects; it is not part
 * of the draft schema, so generation never sees it.
 */
export type EngineeringDraft = {
  /** What the brief asks for to get the test (C4), and what the report says about it. */
  test: { label: string; cues: string[][]; asked: string; missed: string; file: CodeFile };
  /** Each version's pull request: problemLines are where its flaw is; checks are shown when the brief asked for the test. */
  code: Record<keyof typeof VARIANTS, Pick<CodeVariant, "files" | "problemLines" | "checks">>;
};

/** Bump when the structure below changes, so runs built on the old one restart. */
export const TEMPLATE_VERSION = 1;

export function buildScenario(draft: ProjectDraft, meta: { id: string; version?: number }, engineering?: EngineeringDraft): ProjectScenario {
  const client = firstName(draft.client.name);
  const agent = draft.assistant.name;

  const facts: ProjectFact[] = (Object.keys(FACT_IDS) as FactRole[]).map((role) => ({
    id: FACT_IDS[role],
    text: draft.facts[role].text,
    cues: draft.facts[role].cues,
    reply: draft.facts[role].reply,
  }));

  const requirements: ChecklistItem[] = [
    { id: "R1", label: draft.requirements.problem.label, competency: "description", fact: "F1", cues: draft.requirements.problem.cues },
    { id: "R2", label: draft.requirements.rule.label, competency: "description", fact: "F2", cues: draft.requirements.rule.cues },
    { id: "R3", label: draft.requirements.scope.label, competency: "description", fact: "F3", cues: draft.requirements.scope.cues },
    { id: "R4", label: draft.requirements.success.label, competency: "diligence", fact: "F6", cues: draft.requirements.success.cues },
    { id: "R5", label: draft.requirements.environment.label, competency: "description", fact: "F5", cues: draft.requirements.environment.cues },
  ];

  const brief: ChecklistItem[] = [
    { id: "C1", label: draft.constraints.problem.label, competency: "description", cues: draft.constraints.problem.cues },
    { id: "C2", label: draft.constraints.rule.label, competency: "description", cues: draft.constraints.rule.cues },
    { id: "C3", label: draft.constraints.scope.label, competency: "delegation", cues: draft.constraints.scope.cues },
  ];
  if (engineering) {
    brief.push({ id: "C4", label: engineering.test.label, competency: "diligence", tracks: ["engineering"], cues: engineering.test.cues });
  }

  const variant = (key: keyof typeof VARIANTS, problemReason: string | null): CodeVariant => ({
    id: VARIANTS[key],
    prTitle: draft.deliverables[key].title,
    prSummary: draft.deliverables[key].summary,
    files: engineering?.code[key].files ?? [],
    problemLines: engineering?.code[key].problemLines ?? [],
    problemReason,
    demo: draft.deliverables[key].demo,
    checks: engineering?.code[key].checks ?? [],
  });

  return {
    id: meta.id,
    version: meta.version ?? TEMPLATE_VERSION,
    title: draft.title,
    tagline: draft.tagline,
    summary: draft.summary,
    client: draft.client,
    assistant: draft.assistant,
    cast: [
      { kind: "client", name: draft.client.name, role: `${draft.client.role}, ${draft.client.organisation}`, note: "Your client. Knows the business, and only tells you what you ask about." },
      { kind: "manager", name: draft.manager.name, role: "Your manager", note: "Gave this job two weeks. Watches the budget." },
      { kind: "assistant", name: agent, role: draft.assistant.kind, note: "Does exactly what you ask, fast. Never asks a clarifying question." },
      { kind: "users", name: draft.user.from, role: "Will use the result", note: "Lives with whatever you ship, and is the first to notice what you missed." },
    ],
    words: { deliverable: draft.deliverable ?? "the work", manager: draft.manager.name },
    concepts: draft.concepts
      ? (["problem", "rule"] as const).map((role) => {
          const { name, explanation, bridge, misconception, inTheJob, cues } = draft.concepts![role];
          const variant = role === "problem" ? VARIANTS.missesProblem : VARIANTS.missesRule;
          return { id: `K-${role}`, fact: FACT_IDS[role], name, explanation, bridge, misconception, inTheJob, variant, cues };
        })
      : undefined,
    reportNotes: engineering ? { ...draft.reportNotes, testAsked: engineering.test.asked } : draft.reportNotes,
    facts,
    inbox: [
      { id: "client-email", kind: "email", from: draft.client.name, subject: draft.clientEmail.subject, body: draft.clientEmail.body },
      { id: "user-ticket", kind: "ticket", from: draft.user.from, subject: draft.user.subject, body: draft.user.body },
      { id: "manager-email", kind: "email", from: `${draft.manager.name} (your manager)`, subject: draft.client.organisation, body: draft.manager.note },
    ],
    interview: {
      opening: draft.interview.opening,
      minQuestions: 3,
      maxQuestions: 8,
      thoroughFacts: 5,
      vagueReplies: draft.interview.vagueReplies,
    },
    trust: {
      reasons: {
        "call-grace": draft.trust.call,
        "send-quote": draft.trust.quote,
        "end-interview-thorough": draft.trust.thorough,
        "requirements-metric": draft.trust.metric,
        "changes-wrong": draft.trust.wrongReview,
        "release-measure": draft.trust.measured,
        "release-now": draft.trust.releaseNow,
      },
      outcome: {
        success: { delta: 1, reason: draft.trust.success },
        failure: { delta: -2, reason: draft.trust.failure },
      },
    },
    requirements,
    brief,
    // Same order as Harbour Clinic: the first missing constraint decides what goes wrong.
    variantRules: [
      { missing: "C2", variant: VARIANTS.missesRule, action: "brief-rule" },
      { missing: "C1", variant: VARIANTS.missesProblem, action: "brief-problem" },
      { missing: "C3", variant: VARIANTS.scopeCreep, action: "brief-scope" },
    ],
    defaultVariant: { variant: VARIANTS.good, action: "brief-good" },
    variants: [
      variant("good", null),
      variant("missesProblem", "problem"),
      variant("missesRule", "rule"),
      variant("scopeCreep", "scope"),
    ],
    reviewReasons: [
      { id: "problem", label: draft.reviewReasons.problem },
      { id: "rule", label: draft.reviewReasons.rule },
      { id: "scope", label: draft.reviewReasons.scope },
      { id: "distractor", label: draft.reviewReasons.distractor },
    ],
    ...(engineering ? { testFile: engineering.test.file } : {}),
    stageKinds: {
      "choose-track": "choice",
      inbox: "choice",
      interview: "interview",
      requirements: "requirements",
      brief: "brief",
      "brief-test": "brief",
      review: "review",
      release: "release",
    },
    trackNarratives: {
      review: {
        product: `${agent} has finished and recorded a short walkthrough. Look at it as ${client} would, then approve it or send it back with a reason.`,
        ...(engineering ? { engineering: `${agent} has opened a pull request. Read the diff and the checks. Approve it, or point at the line that's wrong and request changes.` } : {}),
      },
    },
    debriefNotes: {
      missedFact: {
        F1: draft.debrief.missedFact.problem,
        F2: draft.debrief.missedFact.rule,
        F3: draft.debrief.missedFact.scope,
        F6: draft.debrief.missedFact.success,
      },
      missedRequirement: {
        R1: draft.debrief.missedRequirement.problem,
        R2: draft.debrief.missedRequirement.rule,
        R3: draft.debrief.missedRequirement.scope,
        R4: draft.debrief.missedRequirement.success,
        R5: draft.debrief.missedRequirement.environment,
      },
      missedConstraint: {
        C1: draft.debrief.missedConstraint.problem,
        C2: draft.debrief.missedConstraint.rule,
        C3: draft.debrief.missedConstraint.scope,
        ...(engineering ? { C4: engineering.test.missed } : {}),
      },
    },
    config: simulationConfigSchema.parse({
      schemaVersion: SIMULATION_SCHEMA_VERSION,
      title: draft.title,
      scenario: {
        description: draft.summary,
        objectives: [
          "Find out what the client really needs before anything is made",
          `Give ${agent} a brief with the constraints that matter`,
          `Review ${agent}'s work and catch what it got wrong`,
          "Release in a way that proves the problem is solved",
        ],
        initialSituation: `Your inbox has an email from ${draft.client.name}, a message from ${draft.user.from} and a note from your manager about the budget.`,
        participantRole: draft.learnerRole,
        persona: `${draft.client.name}, ${draft.client.role}.`,
      },
      variables: [
        { id: "track", type: "enum", label: "Track", initial: "unset", options: engineering ? ["unset", "product", "engineering"] : ["unset", "product"], visible: false },
        { id: "trust", type: "number", label: "Client trust", initial: 5, min: 0, max: 10, visible: true, description: `How much ${client} trusts you to deliver what they need.` },
        { id: "effort", type: "number", label: "Days used", initial: 0, min: 0, max: 10, unit: "of 10", visible: true, description: "You can spend two working weeks on this job." },
        { id: "hasMetric", type: "boolean", label: "Has a success measure", initial: false, visible: false },
        { id: "variant", type: "enum", label: "Delivered version", initial: "none", options: ["none", ...Object.values(VARIANTS)], visible: false },
        { id: "hasTest", type: "boolean", label: "Has a test", initial: false, visible: false },
        { id: "release", type: "enum", label: "Release", initial: "none", options: ["none", "plain", "pilot", "measured"], visible: false },
      ],
      startStage: "choose-track",
      stages: [
        {
          id: "choose-track",
          title: engineering ? "Choose your role" : "Your role",
          narrative: engineering ? `${draft.learnerRole} Same project, two ways in. Pick the role that fits you. You can try the other one later.` : draft.learnerRole,
          actions: engineering
            ? [
                {
                  id: "pick-product",
                  label: "Product lead",
                  description: "No coding needed. You'll review how the software behaves.",
                  effects: [{ op: "set", variable: "track", value: "product" }],
                  feedback: `You're the product lead. You'll judge ${agent}'s work by how it behaves for ${client}.`,
                  nextStage: "inbox",
                },
                {
                  id: "pick-engineering",
                  label: "Tech lead",
                  description: `You'll review ${agent}'s pull request and code.`,
                  effects: [{ op: "set", variable: "track", value: "engineering" }],
                  feedback: `You're the tech lead. You'll review ${agent}'s pull request line by line.`,
                  nextStage: "inbox",
                },
              ]
            : [
                {
                  id: "pick-product",
                  label: "Start the job",
                  description: `You'll judge ${agent}'s work by what it does for ${client}.`,
                  effects: [{ op: "set", variable: "track", value: "product" }],
                  feedback: `You lead the job. You'll judge ${agent}'s work by what it does for ${client}.`,
                  nextStage: "inbox",
                },
              ],
        },
        {
          id: "inbox",
          title: "Monday morning",
          narrative: "Three messages are waiting. Read them, then decide your first move.",
          actions: [
            {
              id: "call-grace",
              label: draft.firstMoves.call,
              effects: [{ op: "add", variable: "trust", value: 1 }],
              feedback: `You want to understand the problem before deciding what to make. ${client} appreciates being asked.`,
              nextStage: "interview",
            },
            {
              id: "cody-starts",
              label: draft.firstMoves.delegate.label,
              effects: [{ op: "add", variable: "effort", value: 2 }],
              feedback: draft.firstMoves.delegate.feedback,
              nextStage: "interview",
            },
            {
              id: "send-quote",
              label: draft.firstMoves.quote.label,
              effects: [{ op: "add", variable: "trust", value: -1 }],
              feedback: draft.firstMoves.quote.feedback,
              nextStage: "interview",
            },
          ],
        },
        {
          id: "interview",
          title: `Call with ${client}`,
          narrative: `${client} has a few minutes. Ask the questions that tell you what's really going wrong. End the call when you have what you need.`,
          actions: [
            {
              id: "end-interview",
              trigger: "system",
              label: "End the call",
              feedback: "You wrap up the call and head back to write things down.",
              nextStage: "requirements",
            },
            {
              id: "end-interview-thorough",
              trigger: "system",
              label: "End the call",
              effects: [{ op: "add", variable: "trust", value: 1 }],
              feedback: `You wrap up the call. ${client} feels heard: your questions got to what really goes wrong.`,
              nextStage: "requirements",
            },
          ],
        },
        {
          id: "requirements",
          title: "Write the requirements",
          narrative: "Write a short requirements note: what the work must do, what it must never do, and how you'll know it worked.",
          actions: [
            {
              id: "requirements-metric",
              trigger: "system",
              label: "Requirements with a success measure",
              effects: [{ op: "set", variable: "hasMetric", value: true }, { op: "add", variable: "trust", value: 1 }],
              feedback: "Your note includes a way to tell whether the release worked.",
              nextStage: "brief",
            },
            {
              id: "requirements-plain",
              trigger: "system",
              label: "Requirements without a success measure",
              feedback: "Your note describes what to make.",
              nextStage: "brief",
            },
          ],
        },
        {
          id: "brief",
          title: `Brief ${agent}`,
          narrative: `${agent} will do whatever you ask, exactly as you ask it. Write the task.`,
          actions: [
            ["brief-good", VARIANTS.good, 3, `${agent} gets to work on your brief.`],
            ["brief-problem", VARIANTS.missesProblem, 3, `${agent} gets to work on your brief.`],
            ["brief-rule", VARIANTS.missesRule, 3, `${agent} gets to work on your brief.`],
            ["brief-scope", VARIANTS.scopeCreep, 5, `${agent} gets to work on your brief, and on a few ideas of its own.`],
          ].map(([id, value, days, feedback]) => ({
            id: id as string,
            trigger: "system" as const,
            label: `${agent} does the work`,
            effects: [
              { op: "set" as const, variable: "variant", value: value as string },
              { op: "add" as const, variable: "effort", value: days as number },
            ],
            feedback: feedback as string,
            nextStage: "brief-test",
          })),
        },
        {
          id: "brief-test",
          title: `${agent} is working`,
          narrative: `${agent} is working on the brief.`,
          actions: [
            { id: "with-test", trigger: "system", label: `${agent} adds a check`, effects: [{ op: "set", variable: "hasTest", value: true }], feedback: `${agent} adds the check you asked for.`, nextStage: "review" },
            { id: "without-test", trigger: "system", label: `${agent} finishes`, feedback: `${agent} has finished.`, nextStage: "review" },
          ],
        },
        {
          id: "review",
          title: `Review ${agent}'s work`,
          narrative: `${agent} has finished. Review the work, then approve it or send it back.`,
          actions: [
            { id: "approve", label: "Approve", feedback: `You approve ${agent}'s work. It's ready to release.`, nextStage: "release" },
            {
              id: "changes-fixed",
              trigger: "system",
              label: "Send it back",
              effects: [{ op: "set", variable: "variant", value: VARIANTS.good }, { op: "add", variable: "effort", value: 2 }],
              feedback: `You sent it back for the right reason. ${agent} fixes the problem. It cost two more days.`,
              nextStage: "review",
            },
            {
              id: "changes-wrong",
              trigger: "system",
              label: "Send it back",
              effects: [{ op: "add", variable: "effort", value: 1 }, { op: "add", variable: "trust", value: -1 }],
              feedback: `${agent} looks again but finds nothing to change for that reason. A day is gone and ${client} asks why it's taking longer.`,
              nextStage: "review",
            },
          ],
        },
        {
          id: "release",
          title: "Release",
          narrative: `The work is ready. How do you put it in front of ${client}'s people?`,
          actions: [
            {
              id: "release-measure",
              label: draft.release.measured.label,
              availableWhen: cond("hasMetric", "eq", true),
              effects: [{ op: "set", variable: "release", value: "measured" }, { op: "add", variable: "trust", value: 1 }],
              feedback: draft.release.measured.feedback,
            },
            {
              id: "release-pilot",
              label: draft.release.pilot.label,
              effects: [{ op: "set", variable: "release", value: "pilot" }, { op: "add", variable: "effort", value: 2 }],
              feedback: draft.release.pilot.feedback,
            },
            {
              id: "release-now",
              label: draft.release.now.label,
              effects: [{ op: "set", variable: "release", value: "plain" }, { op: "add", variable: "trust", value: -1 }],
              feedback: draft.release.now.feedback,
            },
          ],
        },
      ],
      completion: {
        maxSteps: 20,
        rules: [
          {
            outcome: "failure",
            when: all(cond("variant", "eq", VARIANTS.missesRule), cond("release", "neq", "none"), cond("release", "neq", "pilot")),
            summary: draft.endings.failureRule,
          },
          {
            outcome: "failure",
            when: all(cond("variant", "eq", VARIANTS.missesProblem), cond("release", "neq", "none"), cond("release", "neq", "pilot")),
            summary: draft.endings.failureProblem,
          },
          { outcome: "partial", when: all(cond("variant", "eq", VARIANTS.missesRule), cond("release", "eq", "pilot")), summary: draft.endings.partialRule },
          { outcome: "partial", when: all(cond("variant", "eq", VARIANTS.missesProblem), cond("release", "eq", "pilot")), summary: draft.endings.partialProblem },
          { outcome: "success", when: all(cond("variant", "eq", VARIANTS.good), cond("release", "eq", "measured")), summary: draft.endings.success },
          { outcome: "partial", when: cond("release", "neq", "none"), summary: draft.endings.partialOther },
        ],
        exhaustedSummary: `The two weeks ran out while the work was still going back and forth. ${client} is still waiting.`,
      },
      rubric: [
        { id: "delegation", criterion: "Delegation", description: "Decided what to find out first and what to hand to the assistant." },
        { id: "description", criterion: "Description", description: "Asked the right questions and briefed the assistant with the constraints that matter." },
        { id: "discernment", criterion: "Discernment", description: "Reviewed the assistant's work and caught what it got wrong." },
        { id: "diligence", criterion: "Diligence", description: "Released in a way that proves the problem is solved." },
      ],
      debrief: {
        success: `You found the real problem, briefed ${agent} precisely, checked its work and released with a way to prove it worked.`,
        partial: `${client} got something that mostly works. The debrief below shows where a different decision would have changed the result.`,
        failure: "The release went wrong in a way you could have prevented. The debrief below traces it back to the decision that caused it.",
        incomplete: "The job ran out of time before it reached the client.",
      },
    }),
  };
}
