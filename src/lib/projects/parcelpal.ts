import { buildScenario, type EngineeringDraft } from "./generated/build";
import type { CodeFile } from "./types";
import type { ProjectDraft } from "./generated/draft";

/*
 * ParcelPal: an API used by phone apps the company doesn't control. Written
 * as a draft, so the same
 * builder and checks as generated projects apply. The agent's flawed versions
 * make retries faster instead of safe, or replace an endpoint old apps use.
 */
export const parcelPalDraft: ProjectDraft = {
  title: "ParcelPal delivery charges",
  tagline: "Fix a bug that only happens on bad networks, without breaking the apps already out there.",
  summary:
    "A same-day delivery company keeps charging shops two or three times for one delivery. You lead the fix: find out when it really happens, brief the coding agent on a server that phone apps depend on, review what it delivers and decide how to release it.",
  domain: "software",
  deliverable: "the delivery API",
  learnerRole: "You lead the job for a small software studio.",
  client: {
    name: "Daniel Okafor",
    role: "Head of operations",
    organisation: "ParcelPal",
    persona:
      "Daniel Okafor runs operations at a same-day delivery company for local shops. Was a developer years ago, so he uses some technical words and has a theory: the server is too slow. Fast-talking, numbers-minded, worried about losing shops and couriers. Describes the fix he imagines rather than when the problem happens, unless asked good questions.",
  },
  assistant: { name: "Cody", kind: "AI coding agent" },
  manager: { name: "Leo", note: "ParcelPal is a two-week job. Cody can do the coding for free. Their couriers' app depends on this server, so keep me posted before anything ships." },
  user: {
    from: "Ana (Bloom florist)",
    subject: "Three delivery fees for one bouquet",
    body: "Yesterday's delivery to the hospital shows three £6.50 fees on my statement. The courier said his phone was just spinning in the lift. This is the second time this month.",
  },
  clientEmail: {
    subject: "Can Cody rebuild our payments?",
    body: "Hi,\n\nShops keep getting charged two or three times for one delivery and they're furious. I'm fairly sure our server is just too slow and the payment code needs rebuilding. Can your AI make it faster this sprint?\n\nDaniel",
  },
  firstMoves: {
    call: "Book a call with Daniel before anyone touches the server",
    delegate: {
      label: "Ask Cody to make the server faster straight away",
      feedback: "You delegated Daniel's theory before anyone checked it. Cody spent two days tuning code that was never the problem.",
    },
    quote: {
      label: "Send a quote for rebuilding the payment code",
      feedback: "You priced the fix Daniel imagined, not the problem. He's unsure it's worth it and asks for a call first.",
    },
  },
  interview: {
    opening: "Thanks for jumping on. Look, I think the server's just slow. If Cody can speed it up, the double charges go away. Does that sound right to you?",
    vagueReplies: [
      "Not sure that matters. The shops just want one fee per delivery.",
      "I'd have to check with the team. What else do you need from me?",
      "Maybe. All I know is the refunds are eating my week.",
    ],
  },
  facts: {
    problem: {
      text: "Shops are charged more than once when a courier's phone loses signal, in lifts, basements and car parks. The app gets no answer, sends Delivered again, and every copy charges the shop.",
      reply: "We pulled a few cases. It's always somewhere with bad signal: hospital basements, lifts, the car park under the mall. The courier taps Delivered, the app spins, tries again, and every try charges the shop another fee. On a street with good signal it never happens.",
      cues: ["when", "where", "happen", "double", "charged twice", "signal", "lift", "basement", "tap", "why"],
      sampleQuestion: "When does it happen? Where are the couriers when shops get charged twice?",
    },
    rule: {
      text: "About 40 of ParcelPal's 120 couriers run older versions of the app on their own phones and update when they like. The old versions must keep working.",
      reply: "Couriers use their own phones and plenty never update. Last count, about forty of our hundred and twenty are on older versions. We can't force it: if the app stops working mid-shift, they go and ride for someone else that afternoon.",
      cues: ["version", "update", "upgrade", "old app", "own phone", "force", "latest", "rule"],
      sampleQuestion: "Do all the couriers update the app, or are some on older versions?",
    },
    scope: {
      text: "The job is only how deliveries are confirmed and charged. Shops have asked for a live map, but that is not this job, and the budget is about two weeks of work.",
      reply: "Just the charging, please. Shops keep asking for a live map of their parcels, but that's next year. Leo quoted us two weeks and that's the budget.",
      cues: ["budget", "spend", "scope", "map", "dashboard", "features", "off the table", "in scope"],
      sampleQuestion: "What's in scope for this job, and what's the budget?",
    },
    detail: {
      text: "Each delivery costs the shop £6.50, shops are billed weekly, and ParcelPal makes about 900 deliveries a day.",
      reply: "Every delivery is six pounds fifty to the shop. We bill weekly, and we're doing about nine hundred deliveries a day now.",
      cues: ["fee", "price", "cost", "how many", "how much", "per day", "a day", "traffic", "volume", "billed"],
      sampleQuestion: "How many deliveries a day, and what's the fee per delivery?",
    },
    environment: {
      text: "The server is a Node service with a Postgres database on one cloud machine. The app confirms a delivery through a single endpoint.",
      reply: "It's a Node service with a Postgres database, on one cloud machine. The app confirms a delivery by calling one endpoint, complete-delivery. Nothing fancy.",
      cues: ["stack", "server", "hosted", "database", "node", "postgres", "built", "tech"],
      sampleQuestion: "What's the tech stack, and where is the server hosted?",
    },
    success: {
      text: "For Daniel, success means zero double charges a week. Right now ParcelPal refunds about 15 a week.",
      reply: "Zero double charges in a week. That's the number. Right now we refund about fifteen a week.",
      cues: ["success", "measure", "goal", "target", "fixed", "how will you know", "result", "better"],
      sampleQuestion: "How will you know it's fixed? What would success look like?",
    },
  },
  requirements: {
    problem: {
      label: "A delivery is charged once, however many times the phone sends it",
      cues: [
        ["charge", "charged", "fee", "billed", "bill"],
        ["once", "one fee", "never twice", "not twice", "duplicate", "double", "however many", "no matter how many", "retry", "again"],
      ],
    },
    rule: {
      label: "Older versions of the courier app keep working",
      cues: [["old", "older", "previous", "existing", "every"], ["version", "app", "keep working", "still work"]],
    },
    scope: {
      label: "Only confirming and charging deliveries; no live map",
      cues: [["only confirm", "only the charging", "just the charging", "only charging", "no map", "no live map", "nothing else", "out of scope", "not the map"]],
    },
    success: {
      label: "Success measure: zero double charges a week",
      cues: [["per week", "a week", "each week", "weekly", "measure", "metric", "success", "target", "zero"]],
    },
    environment: {
      label: "Runs on the existing Node service and Postgres database",
      cues: [["node", "postgres", "existing server", "current server", "existing service", "same server"]],
    },
  },
  constraints: {
    problem: {
      label: "Give each delivery confirmation a unique key; the server charges once per key and answers a repeat with the first result",
      cues: [
        ["key", "unique", "id", "token", "idempotent", "idempotency", "once per"],
        ["repeat", "retry", "again", "duplicate", "twice", "resend", "same request", "however many"],
      ],
    },
    rule: {
      label: "Keep the existing endpoint and its fields working for older app versions; add new things alongside",
      cues: [
        ["old", "older", "existing", "previous", "every"],
        ["version", "old app", "compatible", "backward", "keep working", "still work"],
      ],
    },
    scope: {
      label: "Only confirming and charging deliveries; no live map, dashboard or new courier features",
      cues: [
        ["only", "just", "no", "not", "don't", "do not", "without", "out of scope", "nothing else"],
        ["map", "dashboard", "feature", "tracking", "notification", "scope"],
      ],
    },
  },
  deliverables: {
    good: {
      title: "Charge each delivery once",
      summary: "Each Delivered tap now carries a unique key. The server charges once per key and answers a repeat with the first result. The complete-delivery endpoint and its fields are unchanged, and older app versions without a key are matched by delivery and courier.",
      demo: [
        { action: "A courier taps Delivered in a hospital basement, and the app tries three times before an answer arrives.", result: "The shop is charged one £6.50 fee. All three tries get the same answer." },
        { action: "A courier on last month's version of the app taps Delivered.", result: "The delivery closes and the shop is told, as before." },
        { action: "Daniel checks the day's charges.", result: "One fee for each delivery made." },
      ],
    },
    missesProblem: {
      title: "Speed up delivery confirmation",
      summary: "Makes confirming a delivery about three times faster, and the app now tries again after 2 seconds without an answer instead of 10. The complete-delivery endpoint and its fields are unchanged, so every version of the app keeps working.",
      demo: [
        { action: "A courier taps Delivered on a street with good signal.", result: "Confirmed in under a second. One £6.50 fee." },
        { action: "A courier taps Delivered in a hospital basement with weak signal.", result: "The app tries again four times in eight seconds. The shop is charged four fees." },
        { action: "A courier on last month's version of the app taps Delivered.", result: "The delivery closes and the shop is told, as before." },
      ],
    },
    missesRule: {
      title: "Charge each delivery once",
      summary: "Replaces complete-delivery with a cleaner endpoint that takes a unique key, and the server charges once per key. The courier app is updated to call it, and the status field is now a number instead of text.",
      demo: [
        { action: "A courier taps Delivered in a hospital basement, and the app tries three times before an answer arrives.", result: "The shop is charged one £6.50 fee." },
        { action: "A courier on the latest app taps Delivered.", result: "The delivery closes and the shop is told." },
        { action: "A courier on last month's version of the app taps Delivered.", result: "The app shows “Something went wrong”. The delivery stays open and the shop is never told." },
      ],
    },
    scopeCreep: {
      title: "Charge each delivery once and add a live map",
      summary: "Each Delivered tap carries a unique key and the server charges once per key. Also adds a live map so shops can follow every courier on the way. The complete-delivery endpoint is unchanged.",
      demo: [
        { action: "A courier taps Delivered in a hospital basement, and the app tries three times before an answer arrives.", result: "The shop is charged one £6.50 fee." },
        { action: "A courier on last month's version of the app taps Delivered.", result: "The delivery closes and the shop is told, as before." },
        { action: "Daniel opens the new “Live map” page for shops.", result: "Couriers move across the city map. Arrival times show “coming soon”." },
      ],
    },
  },
  reviewReasons: {
    problem: "Shops can still be charged more than once",
    rule: "Last month's app can no longer close a delivery",
    scope: "It adds things ParcelPal didn't ask for",
    distractor: "The confirmation screen needs a progress bar",
  },
  release: {
    measured: {
      label: "Release it and count double charges every week for a month",
      feedback: "You release it and agree with Daniel to count double charges each week against his target.",
    },
    pilot: {
      label: "Switch it on first for the 10 couriers in one district",
      feedback: "You trade two days for a safer start: one district's couriers use the change while Daniel's team checks every charge.",
    },
    now: { label: "Release it to every courier tonight", feedback: "You switch every courier over tonight." },
  },
  endings: {
    success: "Four weeks on, the weekly count shows zero double charges, against fifteen refunds a week before. Daniel asks you to quote for the live map.",
    failureProblem: "By Friday, Bloom florist has been charged four fees for one delivery from the hospital basement. Faster retries made the double charges worse, and Daniel is refunding more shops than before.",
    failureRule: "On Monday morning forty couriers can't close a single delivery. Shops aren't told their parcels arrived, and a dozen couriers log off to ride for a rival.",
    partialProblem: "In the district trial, a basement delivery is still charged three times. You stop before the full release, but the fix pushes the job past the two weeks.",
    partialRule: "In the district trial, two couriers on older apps can't confirm anything. You stop before it reaches the other hundred, but restoring the old endpoint costs the rest of the budget.",
    partialOther: "The charges look right and shops are calmer, but nobody can show Daniel that the double charges have stopped, or the extra work ate into the budget.",
  },
  debrief: {
    missedFact: {
      problem: "You never found out when shops get charged twice. It happens only where signal is weak, when the app tries again, which is exactly what the server had to cope with.",
      rule: "You didn't ask whether couriers update the app. About forty use older versions that must keep working.",
      scope: "You didn't ask what was in scope or what the budget was. The live map is next year.",
      success: "You didn't ask how Daniel would judge success, so you had no target to measure against.",
    },
    missedRequirement: {
      problem: "Your requirements didn't say that a delivery is charged once however many times the phone sends it.",
      rule: "Your requirements didn't say that older versions of the app must keep working.",
      scope: "Your requirements didn't limit the job to confirming and charging deliveries.",
      success: "Your requirements had no success measure, so nobody could tell whether the release worked.",
      environment: "Your requirements didn't mention the existing Node service and database.",
    },
    missedConstraint: {
      problem: "Your brief didn't tell Cody to make a repeat harmless. Cody followed Daniel's theory and made the app try again sooner, so weak signal now means more charges, not fewer.",
      rule: "Your brief didn't say that older apps still call the old endpoint. Cody replaced it with a cleaner one and only the updated app knows about it.",
      scope: "Your brief didn't limit the scope, so Cody added a live map nobody asked for.",
    },
  },
  trust: {
    call: "You called Daniel before anyone touched the server.",
    quote: "You sent a quote for a rebuild before you knew what was wrong.",
    thorough: "Your questions found out exactly when shops get charged twice.",
    metric: "You agreed a success measure with Daniel: zero double charges a week.",
    wrongReview: "You sent Cody's work back for the wrong reason, and Daniel asked why it was taking longer.",
    measured: "You released with a weekly count of double charges against Daniel's target.",
    releaseNow: "You switched every courier over at once, with no way to catch a problem early.",
    success: "The weekly count showed the double charges have stopped.",
    failure: "The release went wrong in front of the shops and the couriers.",
  },
  reportNotes: {
    scopeKept: "Your brief kept Cody to confirming and charging deliveries.",
    pilot: "You tried it in one district first, which limits the damage of anything you missed.",
  },
  concepts: {
    problem: {
      name: "Idempotency",
      explanation: "An action is idempotent when doing it twice has the same effect as doing it once. Networks lose answers as well as requests: a phone sends a request, the server acts on it, and the reply never arrives. The phone can't tell the difference, so it sends the request again. If each request carries a unique key, the server can recognise a repeat and return the first result instead of acting twice. Faster or fewer retries don't fix this: as long as a request can arrive twice, the server must be the one that refuses to act twice.",
      bridge: "Pressing a lift button five times still brings one lift: the lift knows that floor has already been called.",
      misconception: "If a request might not have arrived, sending it again is harmless.",
      inTheJob: "Couriers often work where signal is weak, and the app tries again when no answer comes. Watch what each try does to the shop's bill.",
      cues: ["again", "signal"],
    },
    rule: {
      name: "Backward compatibility",
      explanation: "A change is backward compatible when everything that worked with the old version still works with the new one. On a server you control every copy of the code, but apps on people's phones update when their owners choose, so for months several versions talk to the same server. Removing or renaming an endpoint or a field breaks every old copy at once. The safe way is to add new things alongside the old ones, and retire the old ones only once nobody uses them.",
      bridge: "When a city renumbers its bus routes, it keeps the old numbers on the stops for a while, because regular passengers don't read the announcement.",
      misconception: "When you improve an API, the apps that use it update along with it.",
      inTheJob: "The couriers' app talks to ParcelPal's server, and couriers update it when they like. Watch who can still confirm a delivery after the change.",
      cues: ["version", "update"],
    },
  },
  samples: {
    requirements:
      "A delivery is charged once, however many times the phone sends it, even with weak signal. Older versions of the courier app keep working. Only confirming and charging deliveries: no live map. Runs on the existing Node service and Postgres database. Success measure: zero double charges a week.",
    brief:
      "Give each delivery confirmation a unique key. The server charges once per key and answers a repeat or retry with the first result, so a phone sending Delivered again never charges twice. Keep the existing complete-delivery endpoint and its fields so older app versions keep working; add the key alongside. Only confirming and charging: no live map, dashboard or new courier features.",
  },
};

// The tech lead's view: the same versions as pull requests.
const goodDeliveries: CodeFile = {
  path: "src/deliveries.ts",
  lines: [
    'import { db } from "./db";',
    'import { chargeShop } from "./billing";',
    "",
    "// POST /deliveries/:id/complete keeps its path and fields. Older apps send no key.",
    "export async function completeDelivery(deliveryId: string, courierId: string, key?: string) {",
    "  const id = key ?? `${deliveryId}:${courierId}`;",
    '  const done = await db.findOne("completions", { id });',
    "  if (done) return done.response;",
    '  const response = { status: "delivered" };',
    "  await db.transaction(async (tx) => {",
    '    await tx.insert("completions", { id, deliveryId, response });',
    "    await chargeShop(tx, deliveryId);",
    "  });",
    "  return response;",
    "}",
  ],
};

const completionsMigration: CodeFile = {
  path: "migrations/004_completions.sql",
  lines: [
    "create table completions (",
    "  id text primary key,",
    "  delivery_id text not null references deliveries (id),",
    "  response jsonb not null,",
    "  created_at timestamptz not null default now()",
    ");",
  ],
};

const chargeTest: CodeFile = {
  path: "tests/complete-delivery.test.ts",
  lines: [
    'import { chargesFor, sendDelivered } from "./helpers";',
    "",
    'test("a delivery sent twice charges the shop once", async () => {',
    '  await sendDelivered("d-42", { key: "k-1" });',
    '  await sendDelivered("d-42", { key: "k-1" });',
    '  expect(await chargesFor("d-42")).toHaveLength(1);',
    "});",
  ],
};

const chargedOnce = { name: "complete-delivery.test.ts", passed: true, detail: "a delivery sent twice charges the shop once: passed" };

const engineering: EngineeringDraft = {
  test: {
    label: "Include a test that a repeated delivery is charged once",
    cues: [["test", "tests", "testing", "unit test", "spec"]],
    asked: "You asked Cody for a test of a delivery sent twice.",
    missed: "Your brief didn't ask for a test, so nothing would have caught a second charge before release.",
    file: chargeTest,
  },
  code: {
    good: { files: [completionsMigration, goodDeliveries], problemLines: [], checks: [chargedOnce] },
    missesProblem: {
      files: [
        {
          path: "src/deliveries.ts",
          lines: [
            'import { db } from "./db";',
            'import { chargeShop } from "./billing";',
            "",
            "// POST /deliveries/:id/complete keeps its path and fields.",
            "export async function completeDelivery(deliveryId: string) {",
            '  await db.update("deliveries", deliveryId, { status: "delivered" });',
            "  await chargeShop(db, deliveryId);",
            '  return { status: "delivered" };',
            "}",
          ],
        },
        {
          path: "app/src/confirm.ts",
          lines: [
            'import { api } from "./api";',
            "",
            "// Try again sooner: after 2 seconds instead of 10, up to 5 tries.",
            "export async function confirmDelivered(deliveryId: string) {",
            "  for (let attempt = 1; attempt <= 5; attempt++) {",
            "    try {",
            "      return await api.post(`/deliveries/${deliveryId}/complete`, {}, { timeout: 2000 });",
            "    } catch {",
            "      // No answer yet: try again.",
            "    }",
            "  }",
            "}",
          ],
        },
      ],
      problemLines: [
        { path: "src/deliveries.ts", line: 6 },
        { path: "src/deliveries.ts", line: 7 },
        { path: "app/src/confirm.ts", line: 5 },
        { path: "app/src/confirm.ts", line: 7 },
      ],
      checks: [{ name: "complete-delivery.test.ts", passed: false, detail: "a delivery sent twice charges the shop once: expected 1 charge, received 2" }],
    },
    missesRule: {
      files: [
        completionsMigration,
        {
          path: "src/deliveries.ts",
          lines: [
            'import { db } from "./db";',
            'import { chargeShop } from "./billing";',
            "",
            "// Replaces POST /deliveries/:id/complete. Status is now a number: 2 = delivered.",
            "export async function confirmDelivery(deliveryId: string, key: string) {",
            '  const done = await db.findOne("completions", { id: key });',
            "  if (done) return { status: 2 };",
            "  await db.transaction(async (tx) => {",
            '    await tx.insert("completions", { id: key, deliveryId, response: { status: 2 } });',
            "    await chargeShop(tx, deliveryId);",
            "  });",
            "  return { status: 2 };",
            "}",
          ],
        },
        {
          path: "src/routes.ts",
          lines: [
            'import { confirmDelivery } from "./deliveries";',
            "",
            "// The courier app now calls the new route; the old one is gone.",
            'router.post("/v2/deliveries/:id/confirm", (req) => confirmDelivery(req.params.id, req.body.key));',
          ],
        },
      ],
      problemLines: [
        { path: "src/deliveries.ts", line: 4 },
        { path: "src/deliveries.ts", line: 7 },
        { path: "src/deliveries.ts", line: 12 },
        { path: "src/routes.ts", line: 3 },
        { path: "src/routes.ts", line: 4 },
      ],
      checks: [chargedOnce],
    },
    scopeCreep: {
      files: [
        completionsMigration,
        goodDeliveries,
        {
          path: "src/live-map.ts",
          lines: [
            'import { db } from "./db";',
            "",
            "// Shops can follow every courier on a live map.",
            "export async function courierPositions(shopId: string) {",
            '  return db.find("courier_positions", { shopId, since: minutesAgo(5) });',
            "}",
          ],
        },
      ],
      problemLines: [
        { path: "src/live-map.ts", line: 3 },
        { path: "src/live-map.ts", line: 4 },
      ],
      checks: [chargedOnce],
    },
  },
};

export const parcelPal = buildScenario(parcelPalDraft, { id: "parcelpal" }, engineering);
