import { buildScenario } from "./generated/build";
import type { ProjectDraft } from "./generated/draft";

/*
 * River Meadow Nitrate Assay (Natural Sciences / Environmental Chemistry):
 * Uses a structured lab protocol (`steps`) so learners can inspect step-by-step
 * SOP cards (Step 1, Step 2, ...) in Specialist review mode.
 */
export const riverNitrateLabDraft: ProjectDraft = {
  title: "River Meadow nitrate SOP",
  tagline: "Validate an environmental water-testing protocol with an AI lab-methods agent.",
  summary:
    "Volunteer river-watchers keep getting wildly inconsistent nitrate readings downstream of Meadow Farm. Investigate how blanks are zeroed and how bottles travel back to the bench, brief your AI lab agent, review its SOP steps and defend sign-off.",
  domain: "environmental chemistry",
  deliverable: "the nitrate testing SOP",
  learnerRole: "You lead a two-week analytical quality project for a regional watershed lab.",
  client: {
    name: "Dr Owen Griffiths",
    role: "Catchment Coordinator",
    organisation: "Severn & Meadow Watershed Trust",
    persona:
      "Owen Griffiths coordinates forty citizen-science samplers and a small field house. Enthusiastic about ecology, stretched thin on grant money, and quick to blame 'cheap pocket colorimeters' rather than sample handling or blank preparation unless asked step by step how volunteers collect and zero samples.",
  },
  assistant: {
    name: "Helix",
    kind: "AI lab protocol agent",
    workSteps: [
      "checking colorimetric absorbance steps",
      "specifying sample cooling & holding limits",
      "formatting waterproof bench SOP cards",
    ],
  },
  manager: {
    name: "Prof Nadia Kapoor",
    note: "We promised the Watershed Trust two weeks to stabilise their nitrate assay before council hearings. Helix can draft the bench SOP and QC tables—double-check the chemistry.",
  },
  user: {
    from: "Maya (Volunteer Bench Tech)",
    subject: "Split river bottle read 8.4 mg/L on Tuesday, 1.9 mg/L on Wednesday",
    body: "Hi! Two volunteers filled bottles side by side at Bridge 3. One tested hers straight from a cool bag and got 8.4 mg/L; the other left his crate in a sunny car boot all afternoon, zeroed the meter with kitchen tap water, and read 1.9 mg/L!",
  },
  clientEmail: {
    subject: "Should we replace our colorimeters or rewrite the nitrate sheet?",
    body: "Hello,\n\nOur farm-runoff nitrate numbers jump all over the place and the council won't accept our data until duplicates agree. Could you and your AI lab agent put together a rock-solid nitrate SOP for our volunteers this fortnight?\n\nBest wishes,\nOwen",
  },
  firstMoves: {
    call: "Speak with Owen about how volunteers collect, store, and zero river samples first",
    delegate: {
      label: "Ask Helix to write a generic textbook nitrate SOP straight away",
      feedback:
        "You delegated before learning what happens between riverbank and bench. Helix produced a generic lab sheet that misses both tap-water zeroing and warm van transport.",
    },
    quote: {
      label: "Advise Owen to buy £4,000 laboratory ion chromatographs first",
      feedback:
        "You proposed capital equipment the charity cannot afford before diagnosing why split samples disagreed. Owen asks for a call first.",
    },
  },
  interview: {
    opening:
      "Glad to speak! Honestly, half my trustees think our handheld photometers are broken. Before I spend grant money we don't have, what do you want to check about how we run samples?",
    vagueReplies: [
      "Volunteers mean well, though everyone learned from a photocopy someone made years ago.",
      "The council scientist just wants duplicate bottles from the same bridge to match.",
      "Ask me how we zero the meter, how bottles get back from the river, or what kit our hut has.",
    ],
  },
  facts: {
    problem: {
      text: "Volunteers zero the photometer at 540 nm using utility tap water (~3.5 mg/L background nitrate) and un-reagented clear water instead of a deionized reagent blank, subtracting real nitrate and ignoring river turbidity.",
      reply:
        "At the hut sink, people fill a cuvette from the utility tap—which already carries around 3.5 mg/L nitrate in this farming valley—to zero the photometer, and nobody adds the colour reagent packet to the zero tube or filters silty river water first.",
      cues: ["zero", "tap water", "cuvette", "turbid", "silt", "reagent", "photometer", "baseline", "sink"],
      sampleQuestion: "How do volunteers zero the photometer cuvette—do they use tap water without reagent or filtering silt?",
    },
    rule: {
      text: "Unpreserved river bottles sit 4–5 hours in warm volunteer car boots (up to 26°C), letting microbes consume dissolved nitrate before measurement; samples must stay chilled on ice packs at ≤4°C and be assayed within 6 hours.",
      reply:
        "Sunday samplers start at 9 AM and often stop for lunch with sample crates sitting in warm car boots at 25 or 26 degrees for five hours. Warm river microbes chew up dissolved nitrate fast unless bottles go straight onto ice packs at 4°C and get read within six hours.",
      cues: ["car", "warm", "temperature", "cool", "ice", "hours", "transport", "microbe", "storage", "bottle"],
      sampleQuestion: "At what temperature and hours do bottles travel in cars, and do you pack ice?",
    },
    scope: {
      text: "The two-week job covers only the handheld 540 nm cadmium-free nitrate SOP for 5 river bridges; heavy-metal ICP-MS screening or automated river telemetry buoys are out of scope.",
      reply:
        "Keep strictly to dissolved nitrate at our five Meadow bridges using our existing handheld photometers. Adding heavy-metal lab panels or anchored telemetry buoys would blow past our two-week grant window.",
      cues: ["scope", "heavy metal", "buoy", "telemetry", "bridges", "only", "grant", "budget", "limit"],
      sampleQuestion: "What is the two-week grant scope—nitrate at the five bridges only, excluding heavy metal panels or buoys?",
    },
    detail: {
      text: "Samples are collected every fortnight at five numbered footbridges (Bridges 1–5) above and below Meadow Farm.",
      reply:
        "Teams sample every second Sunday at Bridges 1 through 5—two upstream of Meadow Farm's drainage ditch and three downstream.",
      cues: ["fortnight", "sunday", "upstream", "downstream", "meadow farm", "where", "schedule", "bridge"],
      sampleQuestion: "Which upstream and downstream bridges around Meadow Farm are sampled each fortnight?",
    },
    environment: {
      text: "Volunteers work inside an unheated riverside field hut equipped with 540 nm pocket photometers, 0.45 µm syringe filters, insulated cool-boxes, and laminated A4 bench cards (no fume hood or mains DI still).",
      reply:
        "Our riverside hut has 540 nm pocket photometers, boxes of 0.45-micron syringe filters, insulated cool-boxes with freezer blocks, and carboys of bottled deionized water—no fume hood, so instructions must fit a laminated A4 card.",
      cues: ["hut", "equipment", "syringe", "filter", "laminated", "deionized", "fume hood", "kit"],
      sampleQuestion: "What equipment, syringe filters, and laminated cards do volunteers have in the hut?",
    },
    success: {
      text: "Success means blind split-sample duplicates across all 5 bridges agree within ≤5% relative percent difference (RPD) over two consecutive fortnightly runs.",
      reply:
        "The council's quality officer set a clear bar: blind duplicate bottles from all five bridges have to agree within 5% relative difference across two straight fortnightly runs.",
      cues: ["duplicate", "split", "5%", "percent", "council", "agree", "success", "target", "measure"],
      sampleQuestion: "What duplicate percent agreement target will satisfy the council as success?",
    },
  },
  requirements: {
    problem: {
      label: "Filter silty river water (0.45 µm) and zero the 540 nm photometer on a deionized water + reagent blank rather than tap water",
      cues: [
        ["deionized", "reagent blank", "not tap", "no tap"],
        ["0.45", "filter", "zero", "540", "photometer"],
      ],
    },
    rule: {
      label: "Chill sample bottles immediately in ≤4°C ice-pack cool-boxes and complete bench readings within 6 hours",
      cues: [
        ["4°c", "4 c", "4 degrees", "ice", "chill", "cool"],
        ["6 hour", "six hour", "within 6", "holding"],
      ],
    },
    scope: {
      label: "Cover only the five-bridge handheld nitrate SOP; exclude heavy-metal panels and telemetry buoys",
      cues: [
        ["five bridge", "5 bridge", "nitrate", "handheld"],
        ["only", "no heavy metal", "no buoy", "no telemetry", "out of scope"],
      ],
    },
    success: {
      label: "Target: blind split-sample duplicates within ≤5% difference across two consecutive runs",
      cues: [
        ["5%", "five percent"],
        ["duplicate", "split", "two", "consecutive"],
      ],
    },
    environment: {
      label: "Format as a laminated A4 field-hut SOP using bottled deionized water, syringe filters, and no fume hood",
      cues: [["laminated", "a4", "hut"], ["syringe", "deionized", "no fume hood", "pocket"]],
    },
  },
  constraints: {
    problem: {
      label: "Pass samples through 0.45 µm syringe filters and zero the photometer with bottled deionized water reacted with the colour reagent—never tap water",
      cues: [
        ["deionized", "not tap", "never tap", "reagent"],
        ["0.45", "filter", "zero", "photometer"],
      ],
    },
    rule: {
      label: "Place capped bottles straight into ≤4°C ice-pack cool-boxes at the riverbank and reject any bottle over 6 hours old or above 6°C on arrival",
      cues: [
        ["4°c", "4 c", "ice", "chill", "cool-box"],
        ["6 hour", "six hour", "reject", "arrival"],
      ],
    },
    scope: {
      label: "Limit the SOP strictly to the five-bridge pocket-photometer nitrate assay; exclude heavy-metal digestion or telemetry sensors",
      cues: [
        ["only", "strictly", "no", "exclude"],
        ["heavy metal", "buoy", "telemetry", "icp", "digestion"],
      ],
    },
  },
  deliverables: {
    good: {
      title: "Laminated A4 Five-Bridge Nitrate SOP (v1.0)",
      summary:
        "Six-step riverside-to-hut SOP: chills bottles on ≤4°C ice packs within 2 minutes of collection, enforces a 6-hour bench limit, filters through 0.45 µm syringes, and zeroes the 540 nm photometer using bottled deionized water plus full reagent packet.",
      demo: [
        {
          action: "Maya runs split bottles from Bridge 3 brought in at 3.2°C after 2.5 hours.",
          result: "Bottle A reads 8.3 mg/L and Bottle B reads 8.5 mg/L (2.4% RPD—well inside the 5% council bar).",
        },
        {
          action: "A volunteer prepares the zero cuvette on the laminated A4 card.",
          result: "Uses bottled deionized water + reagent powder after 0.45 µm filtration; zero tap water touches the cuvette.",
        },
        {
          action: "Maya checks a 5.0 mg/L check standard.",
          result: "Reads 4.95 mg/L at 540 nm with no fume-hood reagents required.",
        },
      ],
    },
    missesProblem: {
      title: "Laminated A4 Five-Bridge Nitrate SOP (Tap-Zero Draft)",
      summary:
        "Enforces ≤4°C ice-pack transport and a strict 6-hour bench cutoff. Instructs volunteers to rinse and zero the 540 nm photometer using clear hut tap water before reading unfiltered river water.",
      demo: [
        {
          action: "Bottles arrive chilled at 3.5°C within 2 hours of river sampling.",
          result: "Arrival thermometer log passes every bottle.",
        },
        {
          action: "Maya zeroes the photometer with hut tap water (~3.5 mg/L background nitrate) and reads a 5.0 mg/L standard.",
          result: "The meter reports 1.5 mg/L—under-reading by 70%—while silty Bridge 4 water scatters light upward.",
        },
        {
          action: "Two volunteers zero on different mornings as valley tap nitrate fluctuates.",
          result: "Split-sample RPD swings to 29%, failing council validation.",
        },
      ],
    },
    missesRule: {
      title: "Laminated A4 Five-Bridge Nitrate SOP (Ambient Transit Draft)",
      summary:
        "Requires 0.45 µm syringe filtration and a full deionized-water reagent blank at 540 nm. Allows volunteers to drop sample crates at the hut any time within 24 hours at ambient car temperature.",
      demo: [
        {
          action: "Maya prepares the deionized reagent blank and 5.0 mg/L check standard.",
          result: "Bench calibration hits 5.02 mg/L cleanly.",
        },
        {
          action: "Bridge 3 split bottles arrive: one tested at hour 1, its twin after 8 hours in a 25°C car boot.",
          result: "Hour-1 bottle reads 8.4 mg/L; warm hour-8 twin reads 2.8 mg/L (100% RPD disagreement).",
        },
        {
          action: "Owen reviews the council duplicate log.",
          result: "Biological nitrate uptake during warm transit invalidates three of five bridges.",
        },
      ],
    },
    scopeCreep: {
      title: "Watershed Nitrate, Heavy-Metal Digestion & Telemetry Manual",
      summary:
        "Includes 4°C ice-pack chain, 0.45 µm filtration, and deionized reagent zeroing, plus nitric-acid hotplate digestion for lead/cadmium and solar river-buoy LoRa calibration.",
      demo: [
        {
          action: "Maya checks the nitrate steps.",
          result: "Steps 1–4 run accurately on pocket photometers.",
        },
        {
          action: "Owen flips to pages 3–8 of the manual.",
          result: "Calls for concentrated nitric acid boiling (impossible without a fume hood) and £9,000 telemetry buoys.",
        },
        {
          action: "Prof Kapoor reviews safety sign-off.",
          result: "Unventilated acid digestion fails volunteer hut safety rules immediately.",
        },
      ],
    },
  },
  reviewReasons: {
    problem: "Zeroing with hut tap water and unfiltered river water skews 540 nm absorbance",
    rule: "Allowing 24-hour ambient car transit lets microbes deplete nitrate before reading",
    scope: "It adds concentrated-acid heavy-metal digestion and telemetry buoys outside scope",
    distractor: "Step icons are printed in monochrome grey rather than river-trust green",
  },
  release: {
    measured: {
      label: "Issue the laminated SOP and log blind split-sample RPD across all 5 bridges for two fortnightly runs",
      feedback: "You issue the laminated A4 card and record blind duplicate RPD plus arrival temperatures across two full sampling Sundays.",
    },
    pilot: {
      label: "Dry-run the laminated SOP with Maya and four volunteers at Bridge 3 this Saturday first",
      feedback: "You watch volunteers execute every step from river cool-box to blank cuvette on one bridge before printing 40 cards.",
    },
    now: {
      label: "Email the PDF to all 40 volunteers on Saturday night for Sunday's council run",
      feedback: "You send the protocol straight into Sunday's live catchment run without a bench dry-run.",
    },
  },
  endings: {
    success:
      "Across two consecutive fortnightly runs, blind split duplicates at all five bridges agree within 3.1% RPD. The council accepts the Trust's dataset into the catchment hearing—without spending a penny on new meters.",
    failureProblem:
      "On Sunday's council audit, hut tap-water zeroing subtracts 3.5 mg/L across the board, making polluted farm outflow look pristine. The council's reference lab flags a 65% negative bias and rejects the Trust's evidence.",
    failureRule:
      "Half the afternoon volunteers drop warm car-boot crates off at 5 PM; duplicate RPD hits 58% and the council suspends citizen-science submissions for the season.",
    partialProblem:
      "During Saturday's Bridge 3 dry-run, Maya spots the 5.0 mg/L check standard reading 1.5 mg/L after tap-water zeroing. Switching to bottled deionized reagent blanks saves accuracy, pushing full rollout back one fortnight.",
    partialRule:
      "During Saturday's dry-run, an unchilled afternoon bottle drops 4 mg/L against its iced twin. Adding mandatory ≤4°C cool-boxes and a 6-hour cutoff rescues quality just in time, using the reserve days.",
    partialOther:
      "Bench readings stabilise nicely, though missing duplicate RPD logs or stripping out acid-digestion pages leaves Owen scrambling to format the council dossier.",
  },
  debrief: {
    missedFact: {
      problem: "You didn't ask how meters were zeroed, missing that valley tap water contains ~3.5 mg/L nitrate and river silt wasn't filtered.",
      rule: "You didn't ask how bottles travelled from the river, missing 5-hour warm car boots where microbes consume nitrate.",
      scope: "You didn't confirm boundaries, leaving acid heavy-metal panels and telemetry buoys open.",
      success: "You didn't agree the ≤5% blind split-duplicate RPD benchmark.",
    },
    missedRequirement: {
      problem: "Your requirements omitted 0.45 µm filtration and deionized-water + reagent blank zeroing.",
      rule: "Your requirements omitted ≤4°C ice-pack preservation and the 6-hour holding-time limit.",
      scope: "Your requirements didn't limit the SOP to the five-bridge pocket-photometer nitrate assay.",
      success: "Your requirements lacked the ≤5% split-duplicate RPD target across two runs.",
      environment: "Your requirements didn't note the unheated hut, laminated A4 format, or lack of a fume hood.",
    },
    missedConstraint: {
      problem: "Your brief didn't mandate a deionized reagent blank and 0.45 µm filter, so Helix left tap-water zeroing in.",
      rule: "Your brief didn't specify ≤4°C cooling and a 6-hour cutoff, so Helix allowed 24-hour ambient car storage.",
      scope: "Your brief didn't cap scope, so Helix added nitric-acid heavy-metal digestion and telemetry buoys.",
    },
  },
  trust: {
    call: "You traced sample collection and bench zeroing with Owen before blaming the meters.",
    quote: "You suggested £4,000 lab hardware before checking how volunteers handled water bottles.",
    thorough: "Your questions caught both the valley tap-water blank error and warm car-boot biodegradation.",
    metric: "You locked in the council's exact bar: ≤5% RPD on blind split duplicates over two runs.",
    wrongReview: "You queried print colour while leaving tap-water zeroing or warm storage in the SOP.",
    measured: "You logged blind duplicate RPD and arrival temperatures across two fortnightly runs.",
    releaseNow: "You emailed a PDF on Saturday night with no bench dry-run or duplicate log.",
    success: "Split duplicates hit 3.1% RPD and the council accepted the Trust's river data.",
    failure: "Biased blanks or degraded warm samples collapsed under council reference checks.",
  },
  reportNotes: {
    scopeKept: "Your brief kept Helix strictly on the five-bridge pocket-photometer nitrate SOP.",
    pilot: "Dry-running Bridge 3 with Maya verified volunteer technique before printing 40 cards.",
  },
  concepts: {
    problem: {
      name: "Matrix blank",
      explanation:
        "Spectrophotometric assays measure light absorbed by a coloured reaction product. Zeroing the instrument requires a reagent blank—analyte-free deionized water put through the exact same reagents—plus filtration to remove suspended particles that scatter light. Zeroing with contaminated tap water subtracts real analyte from every unknown.",
      bridge:
        "Zeroing a kitchen scale while a heavy ceramic bowl sits on it makes every bag of flour weigh 400 grams too little.",
      misconception: "Any clear-looking tap water works fine to zero an optical meter.",
      inTheJob:
        "Valley tap water carries background nitrate and river water carries silt. Check Step 3 of the SOP to verify what liquid zeroes the 540 nm meter and whether silt is filtered.",
      cues: ["zero", "tap water", "deionized", "reagent", "filter", "540"],
    },
    rule: {
      name: "Cold chain",
      explanation:
        "Biological and chemical water parameters keep changing inside a bottle after collection: river bacteria rapidly assimilate or denitrify dissolved nitrate at warm temperatures. Chilling samples immediately to ≤4°C in the dark and analysing within a strict holding time preserves the river's true concentration.",
      bridge:
        "Leaving fresh milk in a sunny car boot all afternoon measures what grew in the car, not how fresh it left the dairy.",
      misconception: "Once a water bottle is tightly capped, dissolved nutrient levels stay frozen until you reach the lab.",
      inTheJob:
        "Sample crates were sitting five hours in 26°C car boots. Check the transport step of the SOP for cooling temperature and maximum hours to bench.",
      cues: ["ice", "cool", "4°c", "hours", "car", "warm", "microbe"],
    },
  },
  artifact: {
    kind: "steps",
    fileName: "nitrate-assay.sop",
    check: {
      label: "Include a 5.0 mg/L QC check-standard and blind split-duplicate (<5% RPD) sign-off step",
      cues: [["check standard", "qc", "duplicate", "5%", "rpd", "verify", "standard"]],
      passedDetail: "QC step verified: 5.0 mg/L standard within ±3% & Bridge 3 split RPD = 2.4%",
      failedDetail: "QC step failed: 5.0 mg/L standard read 1.5 mg/L after tap-water zeroing",
    },
    good: [
      "Rinse 250 mL HDPE bottle three times in mid-stream river water at Bridges 1–5, fill with zero headspace, and cap underwater.",
      "Place capped bottle immediately into insulated cool-box with frozen ice packs (≤4°C); log collection time and reject on arrival if >6°C or >6 hours elapsed.",
      "Push 15 mL sample through a 0.45 µm syringe filter; prepare Reagent Blank using bottled deionized water + 1 nitrate reagent pillow (5 min colour development).",
      "Zero the 540 nm pocket photometer on the deionized Reagent Blank, read filtered unknowns + 5.0 mg/L QC standard, and verify blind split duplicate is ≤5% RPD.",
    ],
    missesProblem: {
      lines: [
        "Rinse 250 mL HDPE bottle three times in mid-stream river water at Bridges 1–5, fill with zero headspace, and cap underwater.",
        "Place capped bottle immediately into ≤4°C ice-pack cool-box and deliver to field hut within 6 hours (reject if arrival thermometer >6°C).",
        "Fill zero cuvette directly from the field-hut utility tap (no reagent packet added), press ZERO at 540 nm, then pour unfiltered river sample + reagent pillow into test cuvette.",
        "Record mg/L reading on laminated bench sheet alongside blind duplicate bottle.",
      ],
      flawedLine: 3,
    },
    missesRule: {
      lines: [
        "Rinse 250 mL HDPE bottle three times in mid-stream river water at Bridges 1–5 and cap tightly.",
        "Store sample crates in volunteer car boot at ambient temperature and drop off at the field hut within 24 hours of collection.",
        "Filter 15 mL through a 0.45 µm syringe filter and prepare a Reagent Blank using bottled deionized water + 1 nitrate reagent pillow.",
        "Zero the 540 nm photometer on the deionized Reagent Blank and read filtered river samples + 5.0 mg/L check standard.",
      ],
      flawedLine: 2,
    },
    scopeCreep: {
      lines: [
        "Collect river water at Bridges 1–5 into ≤4°C ice-pack cool-boxes and filter through 0.45 µm syringes within 6 hours.",
        "Boil 50 mL unfiltered river water with 5 mL concentrated nitric acid on an open hotplate in the volunteer hut for Pb/Cd heavy-metal digestion.",
        "Deploy anchored solar LoRawan ion-selective telemetry buoys at all five bridges and pair with cloud dashboard.",
        "Zero 540 nm pocket photometer on bottled deionized Reagent Blank and log nitrate mg/L + ≤5% duplicate RPD.",
      ],
      flawedLine: 2,
    },
  },
  viva: {
    question:
      "The council auditor will ask two blunt questions: why can't volunteers zero the meter with clear hut tap water, and why reject a tightly capped bottle that sat five hours in a car boot?",
  },
  samples: {
    requirements:
      "Filter silty water through a 0.45 µm syringe filter and zero the 540 nm photometer on bottled deionized water with a reagent blank, not tap water. Chill sample bottles immediately in ≤4°C ice cool-boxes and complete readings within 6 hours. Cover the five-bridge handheld nitrate SOP only—no heavy metal panels and no telemetry buoys. Format as a laminated A4 hut card using syringe filters and bottled deionized water with no fume hood. Target: blind split duplicates within 5% difference across two consecutive runs.",
    brief:
      "Pass samples through a 0.45 µm filter and zero the photometer with bottled deionized water plus reagent—never tap water—and include a 5.0 mg/L QC check standard and 5% duplicate RPD step. Pack capped bottles into ≤4°C ice cool-boxes immediately and reject any bottle over 6 hours on arrival. Keep strictly to the five-bridge nitrate assay only; exclude heavy metal acid digestion and telemetry buoys.",
  },
};

export const riverNitrateLab = buildScenario(riverNitrateLabDraft, { id: "river-nitrate-lab" });
