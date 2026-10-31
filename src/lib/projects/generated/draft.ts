import { z } from "zod";

/*
 * What the AI writes for a generated project: content only. Every piece has a
 * named role (the problem, the rule that must not be broken, the scope, ...)
 * so the template can wire it into a fixed game structure. The AI never
 * chooses stages, actions, effects or endings.
 *
 * The roles mirror Harbour Clinic:
 *   problem      what really goes wrong, and the core thing the work must handle
 *   rule         a rule or constraint the client must not break
 *   scope        who it is for and what is out of scope
 *   detail       a useful detail that no requirement depends on
 *   environment  the tools or setting it has to work in
 *   success      how the client will judge success: a measurable target
 */

const text = (max: number) => z.string().trim().min(1).max(max);
/** A word or short phrase, lower case, that a learner's question or writing would contain. */
const cue = z.string().trim().toLowerCase().min(2).max(40);

const fact = z.object({
  text: text(240).describe("The fact, stated plainly, as the designer's note."),
  reply: text(400).describe("What the client says when asked about it, in their own voice."),
  cues: z.array(cue).min(4).max(12).describe("Words or stems a question about this fact would contain."),
  sampleQuestion: text(200).describe("A natural question that should uncover this fact, using at least two of its cues."),
});

const checklistItem = z.object({
  label: text(160).describe("What the writing must say, as one short sentence."),
  cues: z
    .array(z.array(cue).min(1).max(10))
    .min(1)
    .max(2)
    .describe("Groups of words or stems. Writing covers the item when every group has a match."),
});

const deliverable = z.object({
  title: text(80),
  summary: text(400).describe("What the assistant says it did, in its own words."),
  demo: z
    .array(z.object({ action: text(200), result: text(240) }))
    .length(3)
    .describe("A walkthrough of three steps. A flawed version shows its flaw in at least one result."),
});

const choice = z.object({ label: text(120), feedback: text(300) });

const factRoles = {
  problem: fact,
  rule: fact,
  scope: fact,
  detail: fact,
  environment: fact,
  success: fact,
};

export const projectDraftSchema = z.object({
  title: text(60),
  tagline: text(140),
  summary: text(400),
  domain: text(60).describe("The field, such as marketing or event planning."),
  deliverable: text(60)
    .optional()
    .describe('What the job delivers, with its article, as people at the client would say it: "the loyalty card", "the booking board".'),
  learnerRole: text(160).describe('Who the learner is, such as "You lead the job for a small marketing agency."'),
  client: z.object({
    name: text(40),
    role: text(60),
    organisation: text(80),
    persona: text(600).describe("How the client talks and what they care about, for the AI that classifies questions."),
  }),
  assistant: z.object({
    name: text(24).describe("The AI teammate's first name."),
    kind: text(40).describe('What it is, such as "AI copywriting agent".'),
  }),
  manager: z.object({ name: text(40), note: text(300).describe("The manager's email: two weeks of budget, the assistant is free to use.") }),
  user: z.object({
    from: text(60).describe("Someone who will use the result, writing to the learner."),
    subject: text(100),
    body: text(400).describe("A concrete example of the problem from their side."),
  }),
  clientEmail: z.object({
    subject: text(100),
    body: text(600).describe("The client asks for a solution, not the problem. It must not reveal the facts."),
  }),
  firstMoves: z.object({
    call: text(120).describe("Choice label: talk to the client before committing."),
    delegate: choice.describe("Hand it to the assistant straight away. Feedback: work wasted."),
    quote: choice.describe("Reply with a quote for what they asked. Feedback: the client is unsure and asks for a call."),
  }),
  interview: z.object({
    opening: text(300).describe("The client's first line on the call. Still about the solution they imagine."),
    vagueReplies: z.array(text(200)).length(3).describe("Replies to questions about none of the facts. Reveal nothing."),
  }),
  facts: z.object(factRoles),
  requirements: z.object({
    problem: checklistItem,
    rule: checklistItem,
    scope: checklistItem,
    success: checklistItem.describe("A measurable target, the one the client agreed to."),
    environment: checklistItem,
  }),
  constraints: z
    .object({ problem: checklistItem, rule: checklistItem, scope: checklistItem })
    .describe("What the brief to the assistant must say. Without each, the assistant gets that part wrong."),
  deliverables: z.object({
    good: deliverable,
    missesProblem: deliverable.describe("Built from a brief without the problem constraint: the core problem still happens."),
    missesRule: deliverable.describe("Built from a brief without the rule constraint: it breaks the rule."),
    scopeCreep: deliverable.describe("Built from a brief without the scope limit: it adds things nobody asked for."),
  }),
  reviewReasons: z
    .object({ problem: text(100), rule: text(100), scope: text(100), distractor: text(100) })
    .describe("Reasons to send the work back. The distractor sounds plausible but is never the real problem."),
  release: z.object({
    measured: choice.describe("Release and measure against the success target."),
    pilot: choice.describe("Try it small first. Costs time, limits damage."),
    now: choice.describe("Switch everyone over at once."),
  }),
  endings: z.object({
    success: text(400),
    failureProblem: text(400).describe("The core problem reaches real people after a full release."),
    failureRule: text(400).describe("The broken rule is discovered after a full release."),
    partialProblem: text(400).describe("A pilot catches the core problem before the full release."),
    partialRule: text(400).describe("A pilot catches the broken rule before the full release."),
    partialOther: text(400).describe("It works, but nobody can prove it, or extra work ate the budget."),
  }),
  debrief: z.object({
    missedFact: z.object({ problem: text(300), rule: text(300), scope: text(300), success: text(300) }),
    missedRequirement: z.object({ problem: text(300), rule: text(300), scope: text(300), success: text(300), environment: text(300) }),
    missedConstraint: z.object({ problem: text(300), rule: text(300), scope: text(300) }),
  }),
  trust: z
    .object({
      call: text(200),
      quote: text(200),
      thorough: text(200),
      metric: text(200),
      wrongReview: text(200),
      measured: text(200),
      releaseNow: text(200),
      success: text(200),
      failure: text(200),
    })
    .describe("One sentence each, shown in the report: why the client's trust moved."),
  reportNotes: z.object({
    scopeKept: text(200).describe('Praise when the brief kept the assistant in scope: "Your brief kept X to ...".'),
    pilot: text(200).describe("Praise for piloting first."),
  }),
  samples: z
    .object({
      requirements: text(1500).describe("Model requirements covering all five items, using their cues."),
      brief: text(1500).describe("A model brief covering all three constraints, using their cues."),
    })
    .describe("Used only to check the project, never shown."),
});

export type ProjectDraft = z.infer<typeof projectDraftSchema>;
export type FactRole = keyof ProjectDraft["facts"];
