import { buildScenario } from "./generated/build";
import type { ProjectDraft } from "./generated/draft";

/*
 * Sunset Daycare Late-Pickup Policy (Business & Behavioural Economics):
 * Inspired by Gneezy & Rustichini's daycare study. Uses a structured policy-trial
 * spreadsheet (`table`) so learners can audit behavioural incentives & sampling bias.
 */
export const sunsetDaycareDraft: ProjectDraft = {
  title: "Sunset Daycare pickup policy",
  tagline: "Design a behavioural intervention with an AI policy analyst without backfiring on late pickups.",
  summary:
    "Parents keep arriving after 5:30 PM at Sunset Daycare, leaving exhausted teachers on overtime. Investigate why a small fee backfired in one room, guide your AI policy analyst, audit its trial workbook and defend the rollout plan.",
  domain: "behavioural economics",
  deliverable: "the pickup policy plan",
  learnerRole: "You lead a two-week behavioural operations project for a community childcare group.",
  client: {
    name: "Hannah Okafor",
    role: "Centre Director",
    organisation: "Sunset Community Daycare",
    persona:
      "Hannah Okafor runs a three-room neighbourhood nursery with 65 families. Warm, fair-minded, tired of paying unplanned overtime, and eager not to sour relationships with working parents. Assumes adding a neat £6 late fee across every room will nudge parents to hurry, unless asked what happened when Elm Room tried tokens and which families actually run late.",
  },
  assistant: {
    name: "Milo",
    kind: "AI policy analyst",
    workSteps: [
      "tabulating room-by-room pickup logs",
      "comparing commuter and flexible cohorts",
      "modelling four-week late-pickup projections",
    ],
  },
  manager: {
    name: "Claire Wu",
    note: "We have two weeks to give Sunset Daycare an evidence-backed pickup plan. Milo can run all the spreadsheets for free—make sure its recommendations fit real parent behaviour.",
  },
  user: {
    from: "Tasha (Toddler Room Lead)",
    subject: "Staying past 6pm three nights this week",
    body: "Hi—two of us missed our train again yesterday waiting for 5:45 PM pickups. When Elm Room tried that £6 late jar in spring, parents stopped apologising and started arriving even later, saying they'd 'paid for the half-hour'!",
  },
  clientEmail: {
    subject: "Help rolling out our £6 late-pickup fee?",
    body: "Hi there,\n\nSeveral parents arrive 15–20 minutes after our 5:30 PM close and my staff are burning out. Could you and your AI analyst put together a clean £6-per-pickup fee schedule and evaluation sheet we can launch across the nursery?\n\nWarmly,\nHannah",
  },
  firstMoves: {
    call: "Speak with Hannah about past room trials and who arrives late before drafting",
    delegate: {
      label: "Ask Milo to draft the £6 fee schedule straight away",
      feedback:
        "You delegated before asking what happened in Elm Room. Milo produced a polished £6 tariff that turns a social obligation into cheap babysitting.",
    },
    quote: {
      label: "Send Hannah a quote for an automated parent billing portal",
      feedback:
        "You priced software Hannah didn't need before understanding why parents arrive late. She asks for a short call first.",
    },
  },
  interview: {
    opening:
      "Thanks for making time! My staff finish at 5:30 PM on paper, yet someone is stuck locking up at six almost every evening. Should we just put a £6 late fee in next week's newsletter?",
    vagueReplies: [
      "I don't want to punish anyone harshly—£6 felt polite enough that parents wouldn't complain.",
      "Most of our families are lovely people; they're just rushing from work or the train.",
      "Ask me about our three rooms, how we log sign-outs, or what we tried in spring.",
    ],
  },
  facts: {
    problem: {
      text: "When Elm Room trialled a small £6 late token in spring, late pickups jumped from 7 to 16 per week—parents treated the small charge as a guilt-free babysitting price instead of a social duty to staff.",
      reply:
        "Actually, we tested a £6 late jar in Elm Room back in April. Before that we had 7 late pickups a week; within three weeks it jumped to 16! Parents stopped apologising to Tasha and cheerfully handed over £6 like they were buying an extra half-hour slot.",
      cues: ["elm", "spring", "tried", "token", "fee", "fine", "jar", "guilt", "happened before", "backfire"],
      sampleQuestion: "What happened before in Elm Room when you tried a small fee or jar?",
    },
    rule: {
      text: "Optional email polls miss rail-commuter parents in Birch and Elm who drive 85% of late pickups, so evaluation must use mandatory door sign-out logs for all 65 families.",
      reply:
        "About 85% of late pickups come from train-commuter parents in Birch and Elm who sprint in at 5:45 PM. Last term an intern sent an optional daytime email poll—only home-working parents who pick up at 4:30 PM replied, so the numbers looked rosy while evenings stayed chaotic.",
      cues: ["commuter", "poll", "volunteer", "optional", "who arrives", "which parents", "evaluate", "track", "bias"],
      sampleQuestion: "Which commuter parents arrive late, and how will we track everyone rather than optional polls?",
    },
    scope: {
      text: "The two-week brief covers only the 5:30 PM pickup policy and four-week sign-out sheet across the 3 rooms; after-school club expansion or billing software is out of scope.",
      reply:
        "We only have budget for two weeks: a clear 5:30 PM pickup rule and a four-week tracking sheet for our three rooms. Opening a paid 6:30 PM after-school club or buying billing software is completely out of reach this year.",
      cues: ["scope", "budget", "after-school", "club", "software", "three rooms", "boundary", "two weeks"],
      sampleQuestion: "What is the two weeks budget scope—just the three rooms policy without new software or an after-school club?",
    },
    detail: {
      text: "The nursery has three rooms—Acorn (babies), Birch (toddlers), and Elm (pre-school)—closing at 5:30 PM Monday to Friday.",
      reply:
        "We run three rooms: Acorn for babies, Birch for toddlers, and Elm for pre-schoolers. Doors close at 5:30 PM sharp Monday to Friday.",
      cues: ["acorn", "birch", "rooms", "closing time", "monday", "hours", "age", "how many rooms"],
      sampleQuestion: "What are the three rooms and closing time hours from Monday to Friday?",
    },
    environment: {
      text: "Staff record pickups on the front-desk paper sign-out clipboard and enter weekly totals into Google Sheets on the office laptop.",
      reply:
        "Parents initial the paper sign-out clipboard by the front door with the exact clock time, and I type the weekly totals into Google Sheets on Friday afternoon.",
      cues: ["clipboard", "google sheets", "paper", "sign-out", "front door", "laptop", "record", "logged"],
      sampleQuestion: "How are sign-out times recorded on the paper clipboard and Google Sheets?",
    },
    success: {
      text: "Success means cutting total nursery late pickups from 22 per week to 6 or fewer per week by week 4 of the rollout.",
      reply:
        "Right now we log 22 late pickups a week across the three rooms. Getting that down to 6 or fewer a week by week four would give my team their evenings back.",
      cues: ["success", "target", "measure", "22", "how many late", "goal", "week four", "cut"],
      sampleQuestion: "What target cut in weekly late pickups by week four counts as success?",
    },
  },
  requirements: {
    problem: {
      label: "Avoid small token fees; pair pre-booked emergency handovers with face-to-face director norms so lateness never looks like a cheap add-on",
      cues: [
        ["no small fee", "no £6", "avoid fee", "norm", "social", "guilt", "babysitting", "not a price", "token"],
        ["director", "emergency", "handover", "conversation", "commitment", "pledge", "pickup"],
      ],
    },
    rule: {
      label: "Measure every family via the mandatory door sign-out log rather than optional parent polls",
      cues: [
        ["mandatory", "all families", "every parent", "full", "commuter"],
        ["sign-out", "clipboard", "door log", "not optional", "no poll", "no volunteer"],
      ],
    },
    scope: {
      label: "Cover only the three rooms' 5:30 PM pickup policy and tracking sheet; no billing app or paid evening club",
      cues: [
        ["three rooms", "3 rooms", "5:30", "policy"],
        ["no app", "no billing", "no club", "no after-school", "only", "out of scope"],
      ],
    },
    success: {
      label: "Target: reduce nursery-wide late pickups from 22 per week to 6 or fewer by week 4",
      cues: [
        ["six", "6 or fewer", "fewer", "at most"],
        ["week 4", "week four", "fourth week", "from 22", "per week"],
      ],
    },
    environment: {
      label: "Work with the front-desk paper sign-out clipboard and Friday Google Sheets tally",
      cues: [["clipboard", "paper", "sign-out"], ["google sheets", "friday", "office laptop"]],
    },
  },
  constraints: {
    problem: {
      label: "Do not introduce a small per-pickup fee; use a signed pickup pledge, designated backup contact, and mandatory director check-in after two late arrivals",
      cues: [
        ["no £6", "no small fee", "do not introduce", "do not charge", "avoid fee", "no token", "norm", "pledge"],
        ["backup", "director", "check-in", "conversation", "social"],
      ],
    },
    rule: {
      label: "Evaluate results using 100% of mandatory front-door sign-out logs stratified by commuter room, never optional parent surveys",
      cues: [
        ["sign-out", "clipboard", "mandatory", "all families", "100%", "commuter"],
        ["never optional", "no survey", "no optional", "no poll", "not volunteer"],
      ],
    },
    scope: {
      label: "Keep strictly to the three-room pickup policy and Google Sheets tracker; exclude paid evening clubs or billing apps",
      cues: [
        ["only", "no", "exclude", "out of scope"],
        ["club", "after-school", "billing", "app", "software"],
      ],
    },
  },
  deliverables: {
    good: {
      title: "Norm-based pickup compact & full-census sign-out tracker",
      summary:
        "Replaces token fines with a named backup-collector compact and a mandatory Friday chat with Hannah on a second late arrival. Tracks 100% of families from the front-door clipboard in Google Sheets, separating high-commuter rooms (Birch/Elm) from Acorn.",
      demo: [
        {
          action: "Hannah reviews the intervention rules for Birch and Elm rooms.",
          result: "Zero £6 tariff; each family names a local backup contact and signs a shared staff-home-on-time pledge, backed by a director call after 2 late sign-outs.",
        },
        {
          action: "Tasha checks how weekly numbers are counted on Friday.",
          result: "Every initialled line past 5:30 PM on the door clipboard is tallied across all 65 families, split by room.",
        },
        {
          action: "Hannah opens the 4-week tracker on the office laptop.",
          result: "Google Sheets compares weekly counts against the ≤6/week target with zero new software.",
        },
      ],
    },
    missesProblem: {
      title: "£6 graduated late-token tariff & full sign-out tracker",
      summary:
        "Introduces a neat £6 late-pickup charge per 30 minutes across Acorn, Birch, and Elm, framed on posters as 'Convenient Extended Cover — £6'. Tracks all 65 families via the mandatory door clipboard.",
      demo: [
        {
          action: "Tasha reads the poster drafted for the front door.",
          result: "It advertises 'Running behind? Add 30 mins cover for £6 on Friday's sheet.'",
        },
        {
          action: "Milo projects week-4 pickups based on Elm Room's spring pilot.",
          result: "Projected late pickups climb from 22/week to 34/week while generating £204 in fee revenue.",
        },
        {
          action: "Hannah checks the tracking method.",
          result: "All 65 families are logged accurately on the front-door sign-out sheet.",
        },
      ],
    },
    missesRule: {
      title: "Norm-based pickup compact & parent newsletter pulse check",
      summary:
        "Uses the backup-collector pledge and director check-in with no small fee. Evaluates success via an optional Wednesday morning email link asking parents to self-report how many times they arrived past 5:30 PM.",
      demo: [
        {
          action: "Hannah checks the policy rules.",
          result: "No token fee appears; families nominate backup contacts and meet Hannah after two late pickups.",
        },
        {
          action: "Milo sets up the week-4 evaluation sheet.",
          result: "Only the 19 parents who clicked the Wednesday 10 AM newsletter link appear in the sample—almost all flexible-hours Acorn families.",
        },
        {
          action: "Tasha compares the poll tab against Thursday's door clipboard.",
          result: "The poll tab reports '1 late pickup all week', while 14 rail commuters signed the paper sheet after 5:40 PM.",
        },
      ],
    },
    scopeCreep: {
      title: "Pickup compact, Stripe billing portal & Twilight Club proposal",
      summary:
        "Pairs the backup-collector pledge and full clipboard tracker with a paid 5:30–6:30 PM 'Twilight Supper Club' staffing roster and an online parent card-billing integration.",
      demo: [
        {
          action: "Hannah reviews the core 5:30 PM compact and clipboard sheet.",
          result: "Both match the three rooms and track all 65 families.",
        },
        {
          action: "Hannah opens tabs 4 and 5 of the pack.",
          result: "Tab 4 budgets £1,800/month in extra evening catering staff and Tab 5 requires Stripe card onboarding.",
        },
        {
          action: "Claire checks calendar and licensing constraints.",
          result: "Extending hours past 5:30 PM requires municipal childcare licence amendments outside the two-week brief.",
        },
      ],
    },
  },
  reviewReasons: {
    problem: "A £6 charge frames lateness as cheap extra childcare rather than protecting staff time",
    rule: "It relies on voluntary self-reports instead of the mandatory door sign-out log",
    scope: "It adds a paid Twilight Club and card-billing portal outside our brief",
    distractor: "The parent letter uses bullet points instead of numbered paragraphs",
  },
  release: {
    measured: {
      label: "Launch across all three rooms and tally Friday door-clipboard counts for four weeks against the ≤6 target",
      feedback: "You launch the compact and review every Friday's mandatory clipboard count with Hannah through week four.",
    },
    pilot: {
      label: "Trial the backup-collector compact in Elm Room for one week while logging clipboard times",
      feedback: "You test the new framing with Elm Room's commuter parents first before rolling out nursery-wide.",
    },
    now: {
      label: "Email the new policy to all 65 families on Friday afternoon and move on",
      feedback: "You announce the policy nursery-wide with no structured weekly review booked.",
    },
  },
  endings: {
    success:
      "By week four, mandatory door-clipboard logs show late pickups down from 22 a week to 4. Parents text their named backup neighbours on train-delay days, and Tasha catches her 5:42 PM train every evening.",
    failureProblem:
      "Within three weeks of posting the £6 tariff, late arrivals surge from 22 to 35 a week. Commuter parents treat £6 as a bargain half-hour extension, and two exhausted staff hand in notice.",
    failureRule:
      "Hannah reports '95% on-time pickups' to trustees from the optional daytime poll—until Tasha brings the paper clipboard showing 19 uncounted commuter late sign-outs in Birch and Elm.",
    partialProblem:
      "In the one-week Elm pilot, three parents ask if they can pre-pay £30 for five late pickups. You scrap the £6 fee immediately, losing a week before rolling out the norm-based compact.",
    partialRule:
      "During the Elm pilot, Tasha notices none of the train commuters filled in the online form. Switching to the paper door clipboard fixes measurement just in time, though week-one baseline comparison is lost.",
    partialOther:
      "Evening pickups improve noticeably, though without booked four-week clipboard tallies—or after stripping out Twilight Club extras—Hannah has to assemble trustee proof manually.",
  },
  debrief: {
    missedFact: {
      problem: "You didn't ask about April's Elm Room test, where a £6 jar more than doubled late pickups from 7 to 16.",
      rule: "You didn't ask who runs late or how past polls failed, missing that rail commuters skip optional daytime surveys.",
      scope: "You didn't check scope limits, leaving paid evening clubs and billing portals on the table.",
      success: "You didn't agree the ≤6 late pickups/week target against the 22/week baseline.",
    },
    missedRequirement: {
      problem: "Your requirements didn't warn against small monetary fees that crowd out moral obligation to staff.",
      rule: "Your requirements didn't mandate full-census measurement from the front-door sign-out log.",
      scope: "Your requirements didn't exclude billing apps and paid after-hours clubs.",
      success: "Your requirements omitted the target of ≤6 late pickups per week by week four.",
      environment: "Your requirements didn't reference the paper door clipboard and Friday Google Sheets workflow.",
    },
    missedConstraint: {
      problem: "Your brief allowed a small token fee, so Milo priced lateness at £6 and turned a norm into a cheap product.",
      rule: "Your brief didn't forbid optional polls, so Milo measured only self-selected daytime volunteers.",
      scope: "Your brief didn't cap scope, so Milo designed a paid Twilight Supper Club and Stripe billing.",
    },
  },
  trust: {
    call: "You asked Hannah about past room experiments before drafting parent policy.",
    quote: "You quoted for billing software before learning why parents arrived late.",
    thorough: "Your questions uncovered both the Elm Room £6 backfire and the commuter sign-out gap.",
    metric: "You agreed a concrete goal: 22 weekly late pickups down to 6 or fewer by week four.",
    wrongReview: "You queried formatting while leaving the behavioural or sampling flaw in place.",
    measured: "You tracked mandatory Friday clipboard counts across all four rollout weeks.",
    releaseNow: "You emailed all 65 families with no weekly clipboard check scheduled.",
    success: "Clipboard logs proved late pickups fell below 6 per week and staff overtime ended.",
    failure: "The rollout backfired on evening staff or collapsed under trustee scrutiny.",
  },
  reportNotes: {
    scopeKept: "Your brief kept Milo focused on the three-room policy and Google Sheets tracker.",
    pilot: "Testing in Elm Room first exposed parent reactions before all 65 families were affected.",
  },
  concepts: {
    problem: {
      name: "Crowding out",
      explanation:
        "People often follow rules out of intrinsic motivation—fairness, empathy, or respect for others' time. Putting a small monetary price on rule-breaking can replace moral obligation with a market transaction: once rule-breaking has a modest price tag, people feel licensed to buy it guilt-free.",
      bridge:
        "If a friend cooks you dinner, bringing wine feels warm; handing them a £5 note at the door turns hospitality into cheap catering.",
      misconception: "Adding any financial penalty on top of a rule will always reduce rule-breaking.",
      inTheJob:
        "Elm Room's £6 token turned apologetic late arrivals into guilt-free purchases. Check whether the delivered policy prices lateness like a cheap add-on or reinforces social accountability.",
      cues: ["£6", "token", "fee", "babysitting", "guilt", "elm"],
    },
    rule: {
      name: "Selection bias",
      explanation:
        "When participants choose for themselves whether to enter a sample, those who respond often differ systematically from those who do not. Measuring an intervention on volunteers alone hides the very group whose behaviour drives the outcome.",
      bridge:
        "Judging city train punctuality by polling relaxed passengers in the station café at 11 AM misses everyone stranded on the 8 AM commuter platform.",
      misconception: "An optional survey sent to everyone gives a representative picture of the whole group.",
      inTheJob:
        "Train-commuter parents drive 85% of late pickups and skip daytime email polls. Check whether evaluation covers 100% of door sign-out logs or relies on voluntary responses.",
      cues: ["commuter", "poll", "optional", "volunteer", "clipboard", "sign-out"],
    },
  },
  artifact: {
    kind: "table",
    fileName: "pickup-policy-trial.xlsx",
    columns: ["Room Cohort", "Intervention Rule", "Measurement Source", "Baseline → Wk 4 Target"],
    check: {
      label: "Include a 65-family coverage check confirming every enrolled child is represented in weekly logs",
      cues: [["65", "coverage", "check", "verify", "all families", "100%", "census"]],
      passedDetail: "Coverage check: 65 / 65 enrolled families accounted for on door sign-out sheets",
      failedDetail: "Coverage check failed: voluntary poll captured 19 / 65 families (commuters missing)",
    },
    good: [
      "Acorn (15 babies, flex hrs) | Backup contact + pledge | Mandatory door clipboard | 2/wk → ≤1/wk",
      "Birch (25 toddlers, commuters) | Backup contact + director chat at #2 | Mandatory door clipboard | 9/wk → ≤2/wk",
      "Elm (25 pre-school, commuters) | Backup contact + director chat at #2 | Mandatory door clipboard | 11/wk → ≤3/wk",
      "Nursery Total (65 families) | Zero token fee (social compact) | Friday Google Sheets census | 22/wk → ≤6/wk",
    ],
    missesProblem: {
      lines: [
        "Acorn (15 babies, flex hrs) | £6 / 30m Extended Cover tariff | Mandatory door clipboard | 2/wk → 3/wk",
        "Birch (25 toddlers, commuters) | £6 / 30m Extended Cover tariff | Mandatory door clipboard | 9/wk → 15/wk",
        "Elm (25 pre-school, commuters) | £6 / 30m Extended Cover tariff | Mandatory door clipboard | 11/wk → 16/wk",
        "Nursery Total (65 families) | £6 late fee (£204/wk projected) | Friday Google Sheets census | 22/wk → 34/wk",
      ],
      flawedLine: 4,
    },
    missesRule: {
      lines: [
        "Acorn (flex-hour respondents) | Backup contact + pledge | Optional Wed 10am email poll (n=14) | 2/wk → 0/wk",
        "Birch (commuter room) | Backup contact + director chat | Optional Wed 10am email poll (n=3) | 9/wk → '0/wk reported'",
        "Elm (commuter room) | Backup contact + director chat | Optional Wed 10am email poll (n=2) | 11/wk → '1/wk reported'",
        "Nursery Summary | Social compact | Voluntary self-report link (19/65 replies) | Claims 1/wk total",
      ],
      flawedLine: 4,
    },
    scopeCreep: {
      lines: [
        "Acorn / Birch / Elm (5:30 close) | Backup contact + director chat | Mandatory door clipboard | 22/wk → ≤6/wk",
        "New Twilight Supper Club (5:30–6:30) | Paid evening catering & 2 extra staff | Stripe auto-billing app | £1,800/mo new cost",
        "Municipal Licence Amendment | Extend operating hours to 6:30 PM | Council inspection filing | +6 weeks lead time",
        "Parent Billing Portal | Saved credit cards & auto-invoices | App onboarding | Out of 2-week budget",
      ],
      flawedLine: 2,
    },
  },
  viva: {
    question:
      "One trustee still asks why we shouldn't charge a polite £6 fee and judge it with a quick parent email survey—how do you answer both points before we print Friday's letter?",
  },
  samples: {
    requirements:
      "Avoid small £6 token fees so lateness never looks like cheap babysitting; use a social pickup pledge, emergency backup contact, and director conversation. Measure all families via the mandatory door sign-out clipboard rather than an optional commuter-skipping poll. Cover the three rooms' 5:30 policy only—no billing app or after-school club. Work with the paper clipboard and Friday Google Sheets. Target: cut late pickups from 22 per week to 6 or fewer by week 4.",
    brief:
      "Do not charge a £6 small fee; use a signed social pledge, named backup collector, and director check-in after two late pickups. Evaluate 100% of all families from mandatory sign-out clipboard logs with a 65-family coverage check—no optional survey or volunteer poll. Keep strictly to the three-room policy and Google Sheets only; exclude any after-school club or billing software.",
  },
};

export const sunsetDaycare = buildScenario(sunsetDaycareDraft, { id: "sunset-daycare" });
