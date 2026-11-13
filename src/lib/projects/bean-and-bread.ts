import { buildScenario } from "./generated/build";
import type { ProjectDraft } from "./generated/draft";

/*
 * Bean & Bread Loyalty Scheme (Law, Data Privacy & Service Design):
 * Uses a structured policy/campaign specification (`document`) so learners can
 * inspect redline clauses (§1, §2, ...) in Specialist review mode.
 */
export const beanAndBreadDraft: ProjectDraft = {
  title: "Bean & Bread loyalty pass",
  tagline: "Launch a compliant café loyalty scheme with an AI marketing & legal-copy agent.",
  summary:
    "Bean & Bread loses morning commuters when counter queues stall, yet its owner asks for a full chain-style mobile app. Uncover the rush-hour snag and SMS consent law, brief your AI agent, redline its campaign terms and defend the launch.",
  domain: "marketing & privacy law",
  deliverable: "the loyalty pass & terms",
  learnerRole: "You lead a two-week service design & compliance brief for an independent studio.",
  client: {
    name: "Marco Bellini",
    role: "Owner",
    organisation: "Bean & Bread Bakery Café",
    persona:
      "Marco Bellini owns a busy corner espresso bar and bakery. Warm, enthusiastic about big-brand coffee chains, and quick to ask for flashy mobile apps rather than describing what slows his counter down. Takes his solicitor's warning seriously when asked about messaging customers.",
  },
  assistant: {
    name: "Sora",
    kind: "AI campaign & policy agent",
    workSteps: [
      "mapping counter checkout timing",
      "drafting registration & SMS consent clauses",
      "packaging Square iPad browser pass specs",
    ],
  },
  manager: {
    name: "Elena Cho",
    note: "Bean & Bread has two weeks of studio budget maximum. Sora can draft the checkout workflow and customer terms for free—check every clause carefully before launch.",
  },
  user: {
    from: "Chloe (Head Barista)",
    subject: "8:00 AM walkouts at Till 1",
    body: "Our morning queue hit the pavement again today. At least ten regulars walked out when baristas spent nearly a minute typing 11-digit mobile numbers into the till to log loyalty stamps.",
  },
  clientEmail: {
    subject: "Can your studio build us a coffee-chain loyalty app?",
    body: "Hi team,\n\nAll the big high-street coffee chains have slick smartphone apps and we'd love one for Bean & Bread too! Can you and your AI teammate put together a digital rewards programme starting this week?\n\nGrazie,\nMarco",
  },
  firstMoves: {
    call: "Call Marco to ask how the morning counter works before scoping anything",
    delegate: {
      label: "Ask Sora to spec an iOS and Android loyalty app right away",
      feedback:
        "You delegated before checking budget or counter operations. Sora drafted an app-store build Bean & Bread can neither afford nor approve in two weeks.",
    },
    quote: {
      label: "Send Marco a quote for a custom app-store build",
      feedback:
        "You priced the solution Marco named rather than the problem hurting his mornings. He winces at the cost and asks for a call first.",
    },
  },
  interview: {
    opening:
      "Thanks for jumping on! Honestly, I'd love an app just like the big chains so our regulars keep coming back. Where do we begin?",
    vagueReplies: [
      "I just want regulars to feel rewarded without slowing my baristas down.",
      "Something crisp and modern on people's phones—that's the dream.",
      "Ask me about the morning rush, our till setup, or the rules our solicitor flagged.",
    ],
  },
  facts: {
    problem: {
      text: "Between 7:40 AM and 8:40 AM, baristas typing 11-digit phone numbers into the till stalls each order to ~50 seconds and causes commuter walkouts.",
      reply:
        "Between 7:40 and 8:40 AM, baristas have to key an 11-digit mobile number into the till screen whenever someone claims stamps. One mistyped digit takes fifty seconds to fix, the queue stalls to the street, and commuters walk out.",
      cues: ["queue", "stall", "rush", "phone number", "walkout", "slow", "morning", "till", "typing", "checkout"],
      sampleQuestion: "Why does the morning rush queue stall when typing phone numbers at the till?",
    },
    rule: {
      text: "Under electronic marketing law, customer mobile numbers collected for loyalty stamps must never receive promotional SMS unless the customer ticks an unchecked opt-in box themselves.",
      reply:
        "Our solicitor gave us a strict warning on data protection: we cannot send promotional text offers to loyalty members unless they actively tick an unchecked permission box themselves during sign-up.",
      cues: ["consent", "opt-in", "sms", "promotional", "solicitor", "legal", "permission", "text message", "law", "marketing"],
      sampleQuestion: "What legal permission or opt-in consent rules apply to promotional SMS messages?",
    },
    scope: {
      text: "Scope is a two-week in-store browser QR stamp pass only; native app-store downloads and automated SMS drip campaigns are out of scope.",
      reply:
        "Elena said two weeks is our ceiling, and that's all my budget covers. We only want an in-store browser QR stamp pass—no App Store downloads and no automated SMS drip sequences.",
      cues: ["budget", "scope", "app store", "native", "drip", "two weeks", "only", "limit", "out of scope"],
      sampleQuestion: "What is the two weeks budget scope—browser pass only, with App Store builds out of scope?",
    },
    detail: {
      text: "Customers earn 1 stamp per hot or iced drink; loaves, pastries, and retail coffee bags do not earn stamps.",
      reply:
        "It's one stamp per hot or iced drink—nine stamps get the tenth coffee free. Sourdough loaves, pastries, and retail bean bags don't earn stamps.",
      cues: ["stamp", "drink", "food", "pastry", "bread", "earn", "free coffee", "qualify"],
      sampleQuestion: "Which drinks earn a stamp, and do food or bread items qualify?",
    },
    environment: {
      text: "The counter runs a single older iPad Air in the Square POS browser over patchy back-room Wi-Fi.",
      reply:
        "Till 1 runs on an older iPad Air inside the Square POS web view, and our back-room router drops out for a few seconds when the oven fan kicks in.",
      cues: ["ipad", "square", "wi-fi", "wifi", "browser", "hardware", "counter", "device", "router"],
      sampleQuestion: "What iPad or Square browser hardware and Wi-Fi setup runs at the counter?",
    },
    success: {
      text: "Success means reaching at least 150 stamp redemptions per week while keeping counter checkout under 25 seconds.",
      reply:
        "If we hit 150 free-coffee redemptions a week while keeping checkout under 25 seconds per customer in the morning rush, I'll be thrilled.",
      cues: ["150", "redemption", "25", "seconds", "success", "target", "measure", "goal", "per week"],
      sampleQuestion: "What weekly redemption count and checkout seconds target would measure success?",
    },
  },
  requirements: {
    problem: {
      label: "Replace manual till phone-number entry with instant QR code scanning to clear morning rush queues",
      cues: [
        ["qr", "scan", "no typing", "no manual", "eliminate"],
        ["phone number", "queue", "rush", "stall", "till", "checkout"],
      ],
    },
    rule: {
      label: "Keep promotional SMS permission unchecked by default and require active customer opt-in",
      cues: [
        ["opt-in", "unchecked", "explicit", "active", "permission", "consent"],
        ["sms", "promotional", "marketing", "text"],
      ],
    },
    scope: {
      label: "Deliver an in-store browser QR stamp pass only; exclude native App Store apps and SMS drip automation",
      cues: [
        ["browser", "web", "qr", "in-store"],
        ["no app store", "no native", "no drip", "only", "out of scope"],
      ],
    },
    success: {
      label: "Target: 150 weekly redemptions with counter checkout under 25 seconds",
      cues: [
        ["150", "redemption"],
        ["25 second", "under 25", "per week", "weekly"],
      ],
    },
    environment: {
      label: "Run smoothly on the counter iPad Air inside Square POS browser over patchy Wi-Fi",
      cues: [["ipad", "square"], ["wi-fi", "wifi", "browser", "counter"]],
    },
  },
  constraints: {
    problem: {
      label: "Use a 2-second QR scan workflow at the till with zero manual phone-number entry by baristas",
      cues: [
        ["qr", "scan", "instant", "2-second", "fast"],
        ["phone number", "no typing", "no manual", "queue", "barista"],
      ],
    },
    rule: {
      label: "Draft registration terms with an unchecked promotional SMS box requiring explicit opt-in consent",
      cues: [
        ["unchecked", "opt-in", "explicit", "consent", "permission"],
        ["sms", "promotional", "text", "marketing"],
      ],
    },
    scope: {
      label: "Restrict deliverables to the browser QR stamp pass and terms; exclude App Store builds and automated SMS engines",
      cues: [
        ["only", "no", "exclude", "restrict", "out of scope"],
        ["app store", "native", "drip", "automated sms", "campaign engine"],
      ],
    },
  },
  deliverables: {
    good: {
      title: "Browser QR loyalty pass & compliant privacy terms",
      summary:
        "Specifies a lightweight browser QR pass cached for patchy Wi-Fi on the Square iPad Air, eliminating till phone-number typing. Registration terms leave promotional SMS unchecked by default and record timestamped opt-in consent.",
      demo: [
        {
          action: "Chloe scans a commuter's browser QR pass at 8:05 AM.",
          result: "Stamp registers in 2 seconds on the iPad Air with zero digits typed at the till.",
        },
        {
          action: "A regular registers a pass on their phone.",
          result: "Clause §3 presents an unchecked SMS marketing box; stamp saving works even when left unticked.",
        },
        {
          action: "Marco toggles the back-room router off for ten seconds.",
          result: "The cached pass screen stays responsive inside the Square browser.",
        },
      ],
    },
    missesProblem: {
      title: "Mobile number lookup loyalty portal & compliant terms",
      summary:
        "Specifies a web loyalty ledger with compliant unchecked SMS opt-in terms. At checkout, customers dictate their 11-digit mobile number for the barista to key into the Square iPad lookup form.",
      demo: [
        {
          action: "Three commuters order flat whites at 8:10 AM.",
          result: "Chloe types 11-digit mobile numbers at the till; one misheard digit pushes average checkout to 48 seconds.",
        },
        {
          action: "Customers waiting by the pastry case check the clock.",
          result: "The queue backs up to the pavement door during the train rush.",
        },
        {
          action: "A new member completes the sign-up page.",
          result: "Promotional SMS remains unchecked by default with clean consent logs.",
        },
      ],
    },
    missesRule: {
      title: "Browser QR loyalty pass & bundled SMS marketing terms",
      summary:
        "Delivers a 2-second counter QR scan pass cached for the iPad Air. Under Clause §3 of the terms, registering a stamp pass automatically enrols every mobile number into weekly promotional SMS blasts.",
      demo: [
        {
          action: "Chloe scans five commuters' QR passes during the 8:00 AM rush.",
          result: "Average checkout drops to 19 seconds with zero phone numbers typed.",
        },
        {
          action: "A commuter signs up solely to collect coffee stamps.",
          result: "No separate tick-box appears; submitting the form queues their number for Saturday pastry promo texts.",
        },
        {
          action: "Marco inspects the member export table.",
          result: "All 230 numbers show 'marketing_sms = active' with zero individual opt-in timestamps.",
        },
      ],
    },
    scopeCreep: {
      title: "iOS/Android App Store suite & automated SMS campaign engine",
      summary:
        "Combines the counter QR scanner and compliant opt-in box with native Apple/Google App Store builds, push notifications, and a multi-stage automated SMS win-back engine.",
      demo: [
        {
          action: "Chloe tests the QR scan step.",
          result: "Scanning registers stamps in 2 seconds.",
        },
        {
          action: "Marco opens the launch checklist.",
          result: "Requires Apple Developer enrollment, App Store review wait times, and paid SMS gateway retainers.",
        },
        {
          action: "Elena checks studio hours remaining.",
          result: "Native app packaging pushes delivery three weeks past Bean & Bread's two-week budget.",
        },
      ],
    },
  },
  reviewReasons: {
    problem: "Staff still key customer numbers manually instead of scanning QR passes",
    rule: "Clause §3 bundles promotional SMS into sign-up without an unchecked opt-in box",
    scope: "It adds native App Store builds and an automated SMS drip engine",
    distractor: "The stamp pass header uses espresso black instead of oat-milk cream",
  },
  release: {
    measured: {
      label: "Launch the QR pass and track weekly redemptions plus 8 AM checkout seconds for two weeks",
      feedback: "You launch at the counter and log weekly stamp redemptions and rush-hour transaction times against Marco's targets.",
    },
    pilot: {
      label: "Run a three-morning pilot with Chloe on Till 1 during the 7:40–8:40 AM rush first",
      feedback: "You test QR scanning and sign-up wording on Till 1 over three morning rushes before printing table tent cards.",
    },
    now: {
      label: "Put QR tent cards on every counter and switch all staff over on Monday morning",
      feedback: "You go live across every shift on Monday morning with no staged check.",
    },
  },
  endings: {
    success:
      "Two weeks in, Bean & Bread logs 178 weekly stamp redemptions and 21-second average morning checkouts. Morning walkouts stop, 38% of members voluntarily tick SMS opt-in, and Marco books your studio for summer catering.",
    failureProblem:
      "On Monday's 8:00 AM rush, dictating 11-digit numbers stalls Till 1 to 50 seconds per coffee. Commuters walk out the door and Chloe switches back to paper stamp cards by 8:30 AM.",
    failureRule:
      "After Saturday's automated pastry text hits 300 commuters who never opted in, two regulars file ICO spam complaints and Marco's solicitor orders the database frozen.",
    partialProblem:
      "On morning one of Chloe's Till 1 pilot, typing mobile numbers backs up five commuters. You swap in QR camera scanning before full launch, slipping the schedule by four days.",
    partialRule:
      "During the Till 1 pilot, a regular who works in compliance spots the bundled SMS clause on the sign-up screen. You add an unchecked opt-in box before any texts go out, using the last days of budget.",
    partialOther:
      "The QR pass runs briskly at the till, though unlogged checkout timings or leftover app-store paperwork leave Marco unsure whether targets were met.",
  },
  debrief: {
    missedFact: {
      problem: "You didn't ask what stalled morning queues—baristas typing 11-digit phone numbers at Till 1.",
      rule: "You didn't ask about marketing rules, missing the legal requirement for an unchecked SMS opt-in box.",
      scope: "You didn't check budget boundaries, leaving App Store builds and drip engines in play.",
      success: "You didn't agree the 150 weekly redemptions and sub-25-second checkout target.",
    },
    missedRequirement: {
      problem: "Your requirements didn't replace manual phone-number typing with instant QR scanning.",
      rule: "Your requirements didn't require an unchecked, explicit opt-in box for promotional SMS.",
      scope: "Your requirements didn't restrict work to an in-store browser QR pass.",
      success: "Your requirements omitted the 150/week redemption and <25s checkout targets.",
      environment: "Your requirements didn't mention the Square iPad Air browser or patchy back-room Wi-Fi.",
    },
    missedConstraint: {
      problem: "Your brief didn't forbid manual phone entry, so Sora kept 11-digit till lookup.",
      rule: "Your brief didn't mandate an unchecked opt-in box, so Sora bundled promotional SMS into registration.",
      scope: "Your brief didn't cap scope, so Sora added App Store builds and SMS drip automation.",
    },
  },
  trust: {
    call: "You spoke with Marco about counter queues and legal rules before scoping.",
    quote: "You quoted for a native mobile app before learning what slowed the morning rush.",
    thorough: "Your questions uncovered both the 11-digit till bottleneck and the SMS consent rule.",
    metric: "You agreed clear targets: 150 redemptions/week and sub-25-second checkouts.",
    wrongReview: "You queried card colours while leaving checkout speed or SMS consent unaddressed.",
    measured: "You tracked weekly redemptions and rush-hour checkout times post-launch.",
    releaseNow: "You rolled out across every shift on Monday without timing a rush hour first.",
    success: "Morning queues cleared in 21 seconds and opt-in records passed legal check.",
    failure: "Rush-hour walkouts or unlawful promotional texts hit Bean & Bread in public.",
  },
  reportNotes: {
    scopeKept: "Your brief kept Sora strictly to the two-week browser QR pass and terms.",
    pilot: "Piloting on Till 1 during rush hour caught issues before full counter rollout.",
  },
  concepts: {
    problem: {
      name: "Cycle time",
      explanation:
        "In service operations, cycle time is the elapsed time required to complete one customer transaction at the bottleneck station. During peak arrival bursts, shaving or adding even 25 seconds per transaction determines whether a queue clears steadily or compounds exponentially into walkouts.",
      bridge:
        "At a stadium turnstile, fumbling with paper tickets takes forty seconds while tapping a travel card takes two—the crowd size is identical, yet only one gate backs into the street.",
      misconception: "Digitising a paper process automatically makes checkout faster, regardless of how many steps staff perform.",
      inTheJob:
        "Between 7:40 and 8:40 AM, typing 11-digit numbers pushes each order near fifty seconds. Check how many seconds and staff keystrokes the delivered checkout flow requires.",
      cues: ["queue", "stall", "phone number", "rush", "seconds", "scan"],
    },
    rule: {
      name: "Opt-in privacy",
      explanation:
        "Data-protection and electronic marketing laws distinguish service operation from promotional outreach. Collecting a phone number to run a loyalty card does not grant permission to send marketing texts: valid consent must be freely given, specific, and indicated by an affirmative act such as ticking an unchecked box.",
      bridge:
        "Leaving your coat phone number at a theatre cloakroom lets staff call if your scarf drops—not text you ticket promos every Friday.",
      misconception: "Putting marketing terms in fine print or a pre-ticked box counts as valid customer permission.",
      inTheJob:
        "Customers register a mobile number to back up their coffee stamps. Check Clause §3 of the specification to see whether promotional SMS requires an unchecked opt-in action.",
      cues: ["opt-in", "unchecked", "consent", "sms", "promotional", "permission"],
    },
  },
  artifact: {
    kind: "document",
    fileName: "loyalty-terms-and-flow.md",
    check: {
      label: "Include a pre-launch legal & till-timing compliance checklist",
      cues: [["compliance", "checklist", "verify", "check", "audit", "legal"]],
      passedDetail: "Compliance check: 2s QR scan verified on iPad Air; PECR/GDPR unchecked SMS box verified",
      failedDetail: "Compliance check flagged: till cycle time exceeds 25s cap under peak load",
    },
    good: [
      "§1 Scope & Access — Customers save a browser-based QR stamp pass to their phone bookmarks; zero App Store download required, cached locally for Square iPad Air Wi-Fi dips.",
      "§2 Counter Stamp Flow — Barista scans customer screen QR via iPad camera (<3s target); beverages earn 1 stamp each (9 stamps = 10th drink free), zero digits typed at till.",
      "§3 Marketing Privacy & SMS — Promotional SMS checkbox is UNCHECKED by default at registration; stamp collection works identically whether or not a member opts into marketing texts.",
      "§4 Data Retention & Audit — Timestamped opt-in records and instant 'STOP' unsubscribe logs are stored separately from beverage redemption tallies.",
    ],
    missesProblem: {
      lines: [
        "§1 Scope & Access — Customers register a browser loyalty profile linked to their 11-digit mobile number; runs inside the Square iPad Air web view.",
        "§2 Counter Stamp Flow — Customer reads aloud their 11-digit mobile number at payment; barista manually keys all 11 digits into the Square lookup modal (~48s per order).",
        "§3 Marketing Privacy & SMS — Promotional SMS checkbox is UNCHECKED by default at registration and logged with an explicit opt-in timestamp.",
        "§4 Qualifying Items — Hot and iced beverages earn 1 stamp per drink; bakery loaves and retail bean bags are excluded.",
      ],
      flawedLine: 2,
    },
    missesRule: {
      lines: [
        "§1 Scope & Access — Browser-based QR stamp pass cached locally for instant loading on the counter Square iPad Air.",
        "§2 Counter Stamp Flow — Barista scans customer QR code in ~2 seconds with zero manual phone-number entry during rush hour.",
        "§3 Marketing Privacy & SMS — By activating a stamp pass, the member's mobile number is automatically subscribed to weekly promotional SMS offers (no separate tick-box shown).",
        "§4 Qualifying Items — Beverages earn 1 stamp per drink; 9 stamps unlock 1 complimentary barista drink.",
      ],
      flawedLine: 3,
    },
    scopeCreep: {
      lines: [
        "§1 Counter Stamp Flow — 2-second QR camera scan on the counter iPad Air with unchecked SMS opt-in box at sign-up.",
        "§2 Native App Store Releases — Studio will compile, submit, and maintain standalone iOS App Store and Google Play apps plus push-notification certificates (+3 weeks).",
        "§3 Automated Drip Campaign Engine — Multi-branch SMS & email win-back journeys trigger automatically at 7, 14, and 30 days of inactivity.",
        "§4 Qualifying Items — Hot and iced beverages earn 1 stamp per drink; food items excluded.",
      ],
      flawedLine: 2,
    },
  },
  viva: {
    question:
      "Before we print the counter cards: why aren't we letting baristas look people up by phone number, and why leave the SMS promo box unticked when pre-ticking it would double our text list?",
  },
  samples: {
    requirements:
      "Replace manual phone number typing at the till with instant QR code scanning to clear morning rush queues. Keep promotional SMS permission unchecked by default and require explicit opt-in consent. Deliver an in-store browser QR pass only—no App Store native build and no drip engine. Must run in the Square browser on the counter iPad Air over patchy Wi-Fi. Target: 150 weekly redemptions with checkout under 25 seconds.",
    brief:
      "Specify a browser QR stamp pass with instant 2-second scan at the till and no manual phone number typing by baristas, plus a legal compliance check. Draft terms with an unchecked promotional SMS box requiring explicit opt-in consent. Restrict scope to the browser pass only—exclude App Store native apps and automated SMS drip tools.",
  },
};

export const beanAndBread = buildScenario(beanAndBreadDraft, { id: "bean-and-bread" });
