import { buildScenario, type EngineeringDraft } from "./generated/build";
import type { CodeFile } from "./types";
import type { ProjectDraft } from "./generated/draft";

/*
 * Tidewater Swim School: effective use of an AI coding agent on code someone
 * else wrote. Written as a draft, so the same builder and checks as generated
 * projects apply. The agent's flawed versions rewrite working code without
 * re-running the old tests, or put the payment key in the page.
 */
export const tidewaterSwimDraft: ProjectDraft = {
  title: "Tidewater Swim School sign-up",
  tagline: "Hand an AI coding agent someone else's code, then check what else it changed.",
  summary:
    "A swim school's online sign-up charges some families the wrong amount. You lead the fix: find out what is really going wrong, brief the coding agent on code a freelancer left behind, review what it changes and decide how to release it.",
  domain: "software",
  deliverable: "the sign-up page",
  learnerRole: "You lead the job for a small software studio.",
  client: {
    name: "Priya Nair",
    role: "Owner",
    organisation: "Tidewater Swim School",
    persona:
      "Priya Nair runs a family swim school with eight instructors. Warm, direct and practical; talks about parents and swimmers by name. Not technical, a little burned by a previous freelancer, and protective of the school's reputation for fair prices. Asks for 'a rewrite' because the code feels messy, rather than describing what goes wrong, unless asked good questions.",
  },
  assistant: { name: "Cody", kind: "AI coding agent" },
  manager: { name: "Leo", note: "Tidewater is a two-week job. Cody can do the coding for free. The code was written by someone else, so tread carefully and keep me posted." },
  user: {
    from: "Mrs Tan (parent)",
    subject: "Charged twice for the sibling discount?",
    body: "I signed up both my boys for Saturday Juniors and the total came to £264. My friend paid £216 for her two. Which one is right?",
  },
  clientEmail: {
    subject: "Can Cody rewrite our sign-up?",
    body: "Hi,\n\nOur online sign-up keeps charging some parents the wrong amount and I'm tired of refunding people. The freelancer who built it has moved on and the code looks like a mess. Could your AI just rewrite the whole thing properly?\n\nPriya",
  },
  firstMoves: {
    call: "Book a call with Priya before anyone touches the code",
    delegate: {
      label: "Ask Cody to rewrite the sign-up from scratch",
      feedback: "You delegated before anyone knew what was wrong. Cody spent two days rebuilding pages that worked, and you still don't know which charges are wrong.",
    },
    quote: {
      label: "Send a quote for a full rewrite",
      feedback: "You priced the solution Priya imagined, not the problem. She hesitates at the cost and asks for a call first.",
    },
  },
  interview: {
    opening: "Hi! Thanks for this. Honestly, I'd love it if your AI just rewrote the sign-up. It's been nothing but trouble. Where do we start?",
    vagueReplies: [
      "I'm not sure, to be honest. I just want parents charged the right amount.",
      "That's beyond me, I'm afraid. Ask me about the school and I'll tell you anything.",
      "Maybe? What I really care about is not refunding people every week.",
    ],
  },
  facts: {
    problem: {
      text: "Only families with two or more children are charged wrongly: the sibling discount is added on top instead of taken off. Every other price is right, and a rewrite last spring broke the Squad prices for a month.",
      reply: "It's only families with more than one child. The sibling discount seems to go the wrong way. Everyone else pays what's on the price list. And please be careful: last spring the freelancer tidied the code and the Squad prices were wrong for a whole month before anyone noticed.",
      cues: ["wrong", "which families", "who gets", "sibling", "child", "children", "brother", "family", "families", "charged", "overcharged"],
      sampleQuestion: "Which families get charged wrongly? Is it the ones with more than one child?",
    },
    rule: {
      text: "Card payments go through TapPay with a private key. TapPay requires that the key stays on the server and never appears in a web page.",
      reply: "Card payments go through TapPay. They gave us a private key and were very clear: it stays on the server, never in the web page itself. If it leaks, anyone could issue refunds with it.",
      cues: ["payment", "pay", "card", "tappay", "safe", "secure", "security", "rule"],
      sampleQuestion: "How do card payments work, and are there any security rules for them?",
    },
    scope: {
      text: "Parents only sign up and pay. There is no app, no waiting list and no parent accounts, and the budget is about two weeks of work.",
      reply: "Parents just pick a class and pay, that's all. No app, no accounts. Someone suggested a waiting list once but that's for another year. Leo said about two weeks, and that's my budget.",
      cues: ["budget", "cost", "scope", "account", "waiting list", "how much", "extras", "need it to do"],
      sampleQuestion: "What do you need it to do, and what's the budget?",
    },
    detail: {
      text: "Classes are Ducklings (age 3 to 5), Juniors and Squad. A term is ten Saturdays.",
      reply: "We have Ducklings for the little ones, three to five, then Juniors, then Squad for the serious swimmers. A term is ten Saturdays.",
      cues: ["class", "classes", "level", "age", "term", "saturday", "lesson", "group"],
      sampleQuestion: "What classes do you run, and how long is a term?",
    },
    environment: {
      text: "The site runs on a small web host the freelancer set up, with 40 automated price tests he left behind. Most parents sign up on their phones.",
      reply: "It's on some small web host the freelancer picked; I pay a few pounds a month. He left a folder of 'price tests', forty of them, he said they check every price. Most parents sign up on their phones.",
      cues: ["host", "hosted", "phone", "mobile", "device", "built", "freelancer", "set up"],
      sampleQuestion: "Where is the site hosted, and how was it built and set up?",
    },
    success: {
      text: "For Priya, success means no refunds for wrong charges in the first month. Right now she refunds about 12 families a month.",
      reply: "If I went a whole month without refunding anyone, I'd be over the moon. Right now it's about twelve families a month.",
      cues: ["success", "measure", "goal", "target", "fixed", "how will you know", "result", "better"],
      sampleQuestion: "How will you know it's fixed? What would success look like?",
    },
  },
  requirements: {
    problem: {
      label: "Families with siblings get the right discount, and every other price stays exactly as it is",
      cues: [
        ["sibling", "second child", "two children", "more than one child", "brother", "sister", "family", "families"],
        ["other price", "every price", "existing price", "squad", "unchanged", "stay the same", "price list", "as before", "still right"],
      ],
    },
    rule: {
      label: "The TapPay key stays on the server and never appears in the page",
      cues: [["key", "secret", "credential"], ["server", "not in the page", "never in the page", "hidden", "backend", "settings"]],
    },
    scope: {
      label: "Only the sign-up and its prices; no app, waiting list or accounts",
      cues: [["only the sign-up", "just the sign-up", "no app", "no waiting list", "no account", "nothing else", "out of scope", "sign-up only"]],
    },
    success: {
      label: "Success measure: no refunds for wrong charges in the first month",
      cues: [["first month", "a month", "per month", "each month", "monthly", "measure", "metric", "success", "target", "no refunds"]],
    },
    environment: {
      label: "Works on the current host and on parents' phones",
      cues: [["phone", "mobile", "current host", "existing host", "web host", "same host"]],
    },
  },
  constraints: {
    problem: {
      label: "Change only the sibling discount, and prove every other price is unchanged by running the existing price tests as they are",
      cues: [
        ["existing test", "old test", "price test", "40 test", "forty test", "current test", "all the tests", "every test", "regression"],
        ["unchanged", "as they are", "don't change", "do not change", "don't edit", "still pass", "must pass", "rerun", "re-run", "run"],
      ],
    },
    rule: {
      label: "Keep the TapPay key on the server; the page asks the server to take the payment",
      cues: [["key", "secret", "credential"], ["server", "not in the page", "never in the page", "hidden", "backend", "environment variable", "settings"]],
    },
    scope: {
      label: "Only the sign-up and its prices; no app, waiting list or parent accounts",
      cues: [
        ["only", "just", "no", "not", "don't", "do not", "without", "out of scope", "nothing else"],
        ["app", "waiting list", "account", "login", "newsletter", "timetable", "scope"],
      ],
    },
  },
  deliverables: {
    good: {
      title: "Fix the sibling discount",
      summary: "Fixes the sibling discount: each child after the first gets 20% off. The 40 existing price tests pass unchanged, and 6 new tests cover families with siblings. The server takes the payment, so the TapPay key stays on the server.",
      demo: [
        { action: "Mrs Tan signs up her two boys for Saturday Juniors.", result: "£120 for the first, £96 for the second. The total is £216." },
        { action: "A Squad swimmer signs up for the term.", result: "£150 for the term, the same as the price list." },
        { action: "Priya opens the sign-up page on her phone and views its source.", result: "The page sends the order to the server. No payment key appears anywhere in it." },
      ],
    },
    missesProblem: {
      title: "Rewrite the sign-up pricing",
      summary: "Rewrites the pricing code from scratch so it is shorter and easier to follow, and fixes the sibling discount. 12 new tests cover the new pricing, and all 12 pass. The server takes the payment, so the TapPay key stays on the server.",
      demo: [
        { action: "Mrs Tan signs up her two boys for Saturday Juniors.", result: "£120 for the first, £96 for the second. The total is £216." },
        { action: "A Squad swimmer signs up for the term.", result: "The term costs £180. The price list on the wall says £150." },
        { action: "Priya runs the freelancer's folder of 40 price tests.", result: "9 of the 40 report a different price from the one they expect." },
      ],
    },
    missesRule: {
      title: "Fix the sibling discount",
      summary: "Fixes the sibling discount: each child after the first gets 20% off. The 40 existing price tests pass unchanged, plus 6 new ones. Payments now go from the sign-up page straight to TapPay, one step fewer and faster on phones.",
      demo: [
        { action: "Mrs Tan signs up her two boys for Saturday Juniors.", result: "£120 for the first, £96 for the second. The total is £216." },
        { action: "A Squad swimmer signs up for the term.", result: "£150 for the term, the same as the price list." },
        { action: "Priya opens the sign-up page on her phone and views its source.", result: "Line 212 of the page holds the full TapPay private key, starting tp_live_." },
      ],
    },
    scopeCreep: {
      title: "Fix the sibling discount and add parent accounts",
      summary: "Fixes the sibling discount and adds parent accounts with a waiting list, so families can log in, see their bookings and queue for full classes. The 40 existing price tests pass unchanged. The server takes the payment.",
      demo: [
        { action: "Mrs Tan signs up her two boys for Saturday Juniors.", result: "£120 for the first, £96 for the second. The total is £216." },
        { action: "A Squad swimmer signs up for the term.", result: "£150 for the term, the same as the price list." },
        { action: "Priya opens the new “My account” page.", result: "Parents can create an account and join a waiting list. Emails show “coming soon”." },
      ],
    },
  },
  reviewReasons: {
    problem: "Prices that were right before have changed",
    rule: "The payment key can be read in the page",
    scope: "It adds things the school didn't ask for",
    distractor: "The page should use the school's blue",
  },
  release: {
    measured: {
      label: "Release it and count refunds for wrong charges over the first month",
      feedback: "You release it and agree with Priya to count refunds for wrong charges every week of the first month.",
    },
    pilot: {
      label: "Try it first with the ten families on the Juniors waiting list",
      feedback: "You trade two days for a safer start: ten families sign up on the new page while Priya checks every charge by hand.",
    },
    now: { label: "Put it live for the new term on Monday", feedback: "You switch the sign-up over for everyone on Monday." },
  },
  endings: {
    success: "A month later Priya hasn't refunded a single family, against twelve a month before. She asks you to quote for next year's waiting list.",
    failureProblem: "In the first week of term, Squad parents start emailing: they've been charged £180 instead of £150. Priya is refunding people again, for prices that used to be right.",
    failureRule: "Two weeks in, TapPay suspends the school's account: their scanner found the private key in the public web page. Nobody can pay until a new key is issued.",
    partialProblem: "In the trial, Priya spots that a Squad swimmer was charged £180. You stop before the new term, but fixing the prices Cody changed pushes the release past the two weeks.",
    partialRule: "During the trial TapPay emails a warning: the private key is visible in the web page. You pull it before any harm is done, but replacing the key and the payment step costs the rest of the budget.",
    partialOther: "The sign-up works and parents are happy, but nobody can show Priya that the wrong charges have stopped, or the extra work ate into the budget.",
  },
  debrief: {
    missedFact: {
      problem: "You never found out which families were charged wrongly, or that a tidy-up had broken the Squad prices before. Only sibling discounts were wrong; everything else had to stay as it was.",
      rule: "You didn't ask how card payments work, so you never heard TapPay's rule: the private key stays on the server.",
      scope: "You didn't ask what the sign-up needs to do or what the budget was. No accounts or waiting list were wanted.",
      success: "You didn't ask how Priya would judge success, so you had no target to measure against.",
    },
    missedRequirement: {
      problem: "Your requirements didn't say that every price except the sibling discount must stay exactly as it is.",
      rule: "Your requirements didn't say where the payment key must live.",
      scope: "Your requirements didn't limit the job to the sign-up and its prices.",
      success: "Your requirements had no success measure, so nobody could tell whether the release worked.",
      environment: "Your requirements didn't mention the current host or parents' phones.",
    },
    missedConstraint: {
      problem: "Your brief didn't tell Cody to keep the freelancer's 40 price tests and run them unchanged. Cody rewrote the code and tested only its own version, so nothing checked the prices that already worked.",
      rule: "Your brief didn't say where the payment key must live. Cody took the shortest route and put it in the page.",
      scope: "Your brief didn't limit the scope, so Cody added accounts and a waiting list nobody asked for.",
    },
  },
  trust: {
    call: "You called Priya before anyone touched the code.",
    quote: "You sent a quote for a rewrite before you knew what was wrong.",
    thorough: "Your questions found out exactly which families were charged wrongly.",
    metric: "You agreed a success measure with Priya: no refunds in the first month.",
    wrongReview: "You sent Cody's work back for the wrong reason, and Priya asked why it was taking longer.",
    measured: "You released with a monthly count of refunds against Priya's target.",
    releaseNow: "You put it live for everyone at once, with no way to catch a wrong price early.",
    success: "The month's count showed the wrong charges have stopped.",
    failure: "The release went wrong in front of the parents.",
  },
  reportNotes: {
    scopeKept: "Your brief kept Cody to the sign-up and its prices.",
    pilot: "You tried it with a few families first, which limits the damage of anything you missed.",
  },
  concepts: {
    problem: {
      name: "Regression testing",
      explanation: "A regression is a change that breaks something that used to work. Regression testing means running the existing tests again after every change, without editing them, to show that the old behaviour still holds. New tests show that the new feature works; only the old tests can show that nothing else broke. It matters most when an AI agent changes code it didn't write: it can rewrite more than it was asked to, and then test only its own version.",
      bridge: "A mechanic who fixes your brakes still checks the lights and the indicators before handing the car back, because a repair in one place can disturb another.",
      misconception: "If the new tests pass, the change is safe.",
      inTheJob: "Families have paid the same prices for years, and the price code has broken before when someone tidied it. Ask what checks that the prices which already worked still do after the change.",
      cues: ["squad", "price list"],
    },
    rule: {
      name: "Keeping secrets out of code",
      explanation: "Some values work like passwords for a program: payment keys, database passwords, access tokens. Anyone can read the code of a web page, and anything written into code is copied wherever the code goes. So these values live on the server, in its settings, and the page asks the server to act for it. AI coding agents often paste a key straight into the code, because it makes the feature work at once.",
      bridge: "A cashier asks the manager to open the safe; nobody tapes the combination to the till, however much quicker that would be.",
      misconception: "If the feature works, it doesn't matter where the key is written.",
      inTheJob: "Card payments run through TapPay with a private key. Look at where each delivered version keeps it.",
      cues: ["key", "tappay"],
    },
  },
  samples: {
    requirements:
      "Families with siblings get the right discount (each child after the first 20% off), and every other price stays the same as the price list, including Squad. The TapPay key stays on the server, never in the page. Only the sign-up and its prices: no app, no waiting list, no accounts. Works on the current host and on parents' phones. Success measure: no refunds for wrong charges in the first month.",
    brief:
      "Fix only the sibling discount. Run the 40 existing price tests unchanged and make sure they still pass, then add tests for families with siblings. Keep the TapPay key on the server: the page sends the order to the server, which takes the payment, so the key is never in the page. Only the sign-up and its prices: no app, waiting list or parent accounts.",
  },
};

// The tech lead's view: the same versions as pull requests.
const goodPricing: CodeFile = {
  path: "src/pricing.ts",
  lines: [
    'import { termPrice } from "./prices";',
    'import type { Child } from "./types";',
    "",
    "const SIBLING_DISCOUNT = 0.2;",
    "",
    "// Each child after the first gets 20% off their own term price.",
    "export function familyTotal(children: Child[]) {",
    "  return children.reduce((total, child, index) => {",
    "    const price = termPrice(child.className);",
    "    return total + (index === 0 ? price : Math.round(price * (1 - SIBLING_DISCOUNT)));",
    "  }, 0);",
    "}",
  ],
};

const serverCheckout: CodeFile = {
  path: "src/checkout.ts",
  lines: [
    'import { TapPay } from "@tappay/node";',
    'import { familyTotal } from "./pricing";',
    'import type { Order } from "./types";',
    "",
    "// Runs on the server. The page sends the order here.",
    "const tapPay = new TapPay(process.env.TAPPAY_SECRET_KEY!);",
    "",
    "export async function checkout(order: Order) {",
    "  const amount = familyTotal(order.children);",
    "  return tapPay.charge({ amount, card: order.cardToken });",
    "}",
  ],
};

const siblingTest: CodeFile = {
  path: "tests/sibling.test.ts",
  lines: [
    'import { familyTotal } from "../src/pricing";',
    "",
    'test("a family of two Juniors pays £216", () => {',
    '  const boys = [{ className: "juniors" }, { className: "juniors" }];',
    "  expect(familyTotal(boys)).toBe(21600);",
    "});",
  ],
};

const siblingPassed = { name: "sibling.test.ts", passed: true, detail: "a family of two Juniors pays £216: passed" };
const oldTestsPassed = { name: "prices.test.ts", passed: true, detail: "40 of 40 price tests: passed" };

const engineering: EngineeringDraft = {
  test: {
    label: "Include a test of the sibling discount",
    cues: [["test", "tests", "testing", "unit test", "spec"]],
    asked: "You asked Cody for tests, so the pull request showed which prices were checked.",
    missed: "Your brief didn't ask for tests, so the pull request showed nothing about which prices still hold.",
    file: siblingTest,
  },
  code: {
    good: { files: [goodPricing, serverCheckout], problemLines: [], checks: [siblingPassed, oldTestsPassed] },
    missesProblem: {
      files: [
        {
          path: "src/pricing.ts",
          lines: [
            'import type { Child } from "./types";',
            "",
            "// Term prices in pence, in one table instead of the old price code.",
            "const TERM_PRICES = {",
            "  ducklings: 9000,",
            "  juniors: 12000,",
            "  squad: 18000,",
            "};",
            "",
            "const SIBLING_DISCOUNT = 0.2;",
            "",
            "export function familyTotal(children: Child[]) {",
            "  return children.reduce((total, child, index) => {",
            "    const price = TERM_PRICES[child.className];",
            "    return total + (index === 0 ? price : Math.round(price * (1 - SIBLING_DISCOUNT)));",
            "  }, 0);",
            "}",
          ],
        },
        serverCheckout,
        {
          path: "tests/pricing.test.ts",
          lines: [
            'import { familyTotal } from "../src/pricing";',
            "",
            "// Replaces tests/prices.test.ts: its 40 cases were written for the old price code.",
            'test("one Junior pays the Junior price", () => {',
            '  expect(familyTotal([{ className: "juniors" }])).toBe(12000);',
            "});",
            'test("a second child gets 20% off", () => {',
            '  expect(familyTotal([{ className: "juniors" }, { className: "juniors" }])).toBe(21600);',
            "});",
          ],
        },
      ],
      problemLines: [
        { path: "src/pricing.ts", line: 3 },
        { path: "src/pricing.ts", line: 7 },
        { path: "tests/pricing.test.ts", line: 3 },
      ],
      checks: [siblingPassed, { name: "pricing.test.ts", passed: true, detail: "12 of 12 pricing tests: passed" }],
    },
    missesRule: {
      files: [
        goodPricing,
        {
          path: "public/signup.js",
          lines: [
            'import { TapPay } from "https://js.tappay.example/v3";',
            'import { familyTotal } from "./pricing.js";',
            "",
            "// Charge straight from the page: one step fewer on phones.",
            'const tapPay = new TapPay("tp_live_51Hx9QeTidewater8f2c");',
            "",
            "export async function payForTerm(order) {",
            "  const amount = familyTotal(order.children);",
            "  return tapPay.charge({ amount, card: order.card });",
            "}",
          ],
        },
      ],
      problemLines: [
        { path: "public/signup.js", line: 4 },
        { path: "public/signup.js", line: 5 },
      ],
      checks: [siblingPassed, oldTestsPassed],
    },
    scopeCreep: {
      files: [
        goodPricing,
        serverCheckout,
        {
          path: "src/accounts.ts",
          lines: [
            'import { db, hashPassword } from "./db";',
            "",
            "// Parents can create an account and join a waiting list.",
            "export async function signUp(email: string, password: string) {",
            '  await db.insert("parents", { email, passwordHash: await hashPassword(password) });',
            "}",
            "",
            "export async function joinWaitingList(parentId: string, className: string) {",
            '  await db.insert("waiting_list", { parentId, className, joinedAt: new Date() });',
            "}",
          ],
        },
      ],
      problemLines: [
        { path: "src/accounts.ts", line: 3 },
        { path: "src/accounts.ts", line: 4 },
        { path: "src/accounts.ts", line: 8 },
      ],
      checks: [siblingPassed, oldTestsPassed],
    },
  },
};

export const tidewaterSwim = buildScenario(tidewaterSwimDraft, { id: "tidewater-swim" }, engineering);
