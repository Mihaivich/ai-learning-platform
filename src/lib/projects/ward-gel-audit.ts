import { buildScenario } from "./generated/build";
import type { ProjectDraft } from "./generated/draft";

/*
 * Ward 4B Infection Audit (Healthcare & Clinical Statistics):
 * Uses a structured spreadsheet artifact (`table`) so learners can lead the
 * audit in Overview mode or audit cell-by-cell in Specialist review mode.
 */
export const wardGelAuditDraft: ProjectDraft = {
  title: "Ward 4B hand-gel audit",
  tagline: "Audit clinical infection data with an AI statistical analyst before the hospital committee meets.",
  summary:
    "Ward 4B switched to a new sanitising hand gel and raw infection cases dropped from 12 to 8. Investigate what really changed on the ward, brief your AI statistical analyst, audit its Excel workbook and defend your findings before sign-off.",
  domain: "healthcare statistics",
  deliverable: "the ward audit workbook",
  learnerRole: "You lead a two-week clinical audit placement at St Jude's Hospital.",
  client: {
    name: "Sister Brenda Vance",
    role: "Ward Unit Manager",
    organisation: "St Jude's Hospital (Ward 4B)",
    persona:
      "Sister Brenda Vance, senior manager on Ward 4B. Practical, busy, protective of her nurses, and non-statistical. Talks about beds, shifts, and ward charts rather than denominators or epidemiology. Hopes the audit proves the new October hand gel worked, unless asked concrete questions about bed numbers and who was on the ward.",
  },
  assistant: {
    name: "Iris",
    kind: "AI statistical analyst",
    workSteps: [
      "cleaning monthly bed-occupancy logs",
      "stratifying ward admission cohorts",
      "building hospital Excel rate tables",
    ],
  },
  manager: {
    name: "Dr Marcus Lin",
    note: "You have two weeks for Ward 4B's clinical audit. Iris can crunch the ward spreadsheets at no cost, so check her assumptions carefully before anything goes to the committee.",
  },
  user: {
    from: "Sam Patel (Infection Control Link Nurse)",
    subject: "October numbers on the Ward 4B wall chart",
    body: "Sister Brenda is thrilled that catheter cases dropped from 12 in September to 8 in October, right after the new gel arrived. Thing is, half our bays were shut for pipework in October, so I'm nervous about presenting raw case totals.",
  },
  clientEmail: {
    subject: "Quick report showing our new hand gel cut infections?",
    body: "Hello,\n\nWe switched Ward 4B to the new alcohol hand gel on 1 October and our monthly cases fell from 12 to 8. Could you and your AI analyst put together a clean report for the Infection Control Committee showing the gel worked?\n\nMany thanks,\nSister Brenda",
  },
  firstMoves: {
    call: "Meet Sister Brenda to check how Ward 4B's figures were recorded first",
    delegate: {
      label: "Ask Iris to chart the drop from 12 to 8 cases straight away",
      feedback:
        "You delegated before checking ward exposure time. Iris produced a celebratory bar chart of raw monthly cases while half the ward beds had been closed.",
    },
    quote: {
      label: "Promise Sister Brenda a positive effectiveness summary by Friday",
      feedback:
        "You promised a conclusion before inspecting the denominators. Sister Brenda still needs a call to walk through what happened on the ward.",
    },
  },
  interview: {
    opening:
      "Thanks for popping up to Ward 4B. The committee meets next fortnight and our wall chart went down from 12 cases to 8 after we brought in the new gel. What do you need from me?",
    vagueReplies: [
      "Honestly, the committee is busy—a simple before-and-after chart is what they usually like.",
      "I'm a ward sister, not a statistician. Ask me about our bays, patients, or routine and I can tell you.",
      "We just tally the cases on the whiteboard at month end. Isn't eight better than twelve?",
    ],
  },
  facts: {
    problem: {
      text: "Raw catheter infection cases fell from 12 in September to 8 in October, while ward occupancy dropped from 600 patient-days to 250 patient-days—so the rate rose from 20 to 32 per 1,000 patient-days.",
      reply:
        "In September every bay was full, so we logged 12 cases across 600 patient-days. In October two bays closed for pipe repairs, so we logged 8 cases across only 250 patient-days in total.",
      cues: ["occupancy", "patient-day", "bed-day", "empty", "closed", "denominator", "bays", "how many patients"],
      sampleQuestion: "What was the ward occupancy in patient-day numbers when bays were closed?",
    },
    rule: {
      text: "In October Ward 4B absorbed high-acuity post-op surgical transfers with central lines while Ward 2 was refurbished, skewing baseline patient risk unless cohorts are stratified.",
      reply:
        "Ward 2 shut for refurbishment in October, so we took seven post-op surgical patients with central lines. Those transfers arrive frail and carry much higher infection risk than our usual general medical beds.",
      cues: ["surgical", "transfer", "case mix", "patient type", "who was admitted", "ward 2", "central line", "severity"],
      sampleQuestion: "Did the patient type or surgical transfer case mix change in October?",
    },
    scope: {
      text: "The two-week audit covers Ward 4B catheter-associated infections over six months only; hospital-wide staff scent or skin surveys are out of scope.",
      reply:
        "Keep it strictly to Ward 4B's catheter records over the last six months. Someone mentioned polling staff across all twelve wards about bottle scent, which is way outside our two-week window.",
      cues: ["scope", "which ward", "other wards", "six months", "timeframe", "survey", "budget", "boundary"],
      sampleQuestion: "Which ward and six months timeframe are in scope, and are other wards or surveys out?",
    },
    detail: {
      text: "Dispensers were fitted at all 15 bed spaces on 1 October and housekeeping topped them up each morning.",
      reply:
        "Estates fitted the new dispensers at all 15 bed spaces on the morning of 1 October, and housekeeping checks bottle levels on the 7am round.",
      cues: ["dispenser", "bottle", "installed", "fitted", "bed space", "housekeeping", "morning round"],
      sampleQuestion: "When were the bed space dispensers fitted and who checks the bottle levels?",
    },
    environment: {
      text: "The workbook must open cleanly in standard hospital Excel on locked-down ward PCs with no external R or Python packages.",
      reply:
        "Everything has to open in ordinary Excel on our ward PCs. Hospital IT locks those terminals down tight, so R scripts or external plug-ins won't run.",
      cues: ["excel", "spreadsheet", "ward pc", "workstation", "software", "it locks", "computer", "format"],
      sampleQuestion: "What Excel spreadsheet software runs on the ward PC workstations?",
    },
    success: {
      text: "Success means the Infection Control Committee accepts the per-1,000 patient-day audit with 0 methodological revisions requested.",
      reply:
        "If the Infection Control Committee signs off our per-1,000-days workbook with zero methodological revisions sent back, that is a win for Ward 4B.",
      cues: ["committee", "success", "accept", "revision", "sign off", "target", "measure", "judge"],
      sampleQuestion: "How will the committee judge success, and is zero revision requests the target?",
    },
  },
  requirements: {
    problem: {
      label: "Report catheter infections per 1,000 patient-days using monthly bed occupancy as the denominator",
      cues: [
        ["1,000", "1000", "rate", "per patient-day"],
        ["patient-day", "bed-day", "occupancy", "denominator"],
      ],
    },
    rule: {
      label: "Stratify post-op surgical transfers separately from general medical admissions",
      cues: [
        ["stratify", "stratified", "separate", "split", "cohort"],
        ["surgical", "transfer", "medical", "case mix", "severity"],
      ],
    },
    scope: {
      label: "Restrict the workbook to six months of Ward 4B catheter logs with no hospital-wide staff survey",
      cues: [
        ["ward 4b", "six months", "6 months"],
        ["only", "no survey", "exclude", "out of scope", "no hospital-wide"],
      ],
    },
    success: {
      label: "Target: Infection Control Committee sign-off with zero methodological revisions",
      cues: [
        ["committee", "sign-off", "sign off", "accept"],
        ["zero", "no revision", "without revision", "methodological"],
      ],
    },
    environment: {
      label: "Deliver as a standard hospital Excel workbook that runs on locked-down ward PCs",
      cues: [["excel", "spreadsheet", "workbook"], ["ward pc", "workstation", "hospital", "no external", "standard"]],
    },
  },
  constraints: {
    problem: {
      label: "Compute incidence per 1,000 patient-days from bed occupancy rather than comparing raw case totals",
      cues: [
        ["1,000", "1000", "rate", "denominator"],
        ["patient-day", "bed-day", "occupancy", "raw"],
      ],
    },
    rule: {
      label: "Stratify October figures into general medical beds versus post-op surgical transfers",
      cues: [
        ["stratify", "stratified", "separate", "split", "control"],
        ["surgical", "transfer", "medical", "case mix"],
      ],
    },
    scope: {
      label: "Keep strictly to Ward 4B's six-month catheter logs; do not add hospital-wide surveys",
      cues: [
        ["only", "strictly", "no", "exclude", "out of scope"],
        ["survey", "other wards", "hospital-wide", "scent"],
      ],
    },
  },
  deliverables: {
    good: {
      title: "Stratified Ward 4B rate workbook (Excel)",
      summary:
        "Calculates catheter infection rates per 1,000 patient-days in standard Excel and separates general medical beds from October's post-op surgical transfers. Medical beds held steady at 20.0 per 1,000 patient-days while surgical transfers logged 80.0 per 1,000.",
      demo: [
        {
          action: "Sam opens the Sept–Oct rate sheet on the Ward 4B workstation.",
          result: "September shows 12 cases / 600 patient-days (20.0 per 1,000). Pooled October shows 8 / 250 (32.0 per 1,000).",
        },
        {
          action: "Sister Brenda checks the cohort breakdown tab.",
          result: "October general medical beds logged 4 cases / 200 patient-days (20.0 per 1,000); surgical transfers logged 4 / 50 (80.0 per 1,000).",
        },
        {
          action: "Sam verifies formulas on the locked ward PC.",
          result: "Every sheet uses native Excel formulas and reconciles cohort totals to 250 patient-days.",
        },
      ],
    },
    missesProblem: {
      title: "Monthly case-count summary workbook (Excel)",
      summary:
        "Tabulates monthly catheter infection totals before and after 1 October and stratifies surgical vs medical counts. Headlines a 33% drop in total ward cases from September (12) to October (8).",
      demo: [
        {
          action: "Sam opens the headline summary table in Excel.",
          result: "September lists 12 cases and October lists 8 cases, badged '-33% monthly cases' with patient-day cells left blank.",
        },
        {
          action: "Sam checks the October cohort breakdown.",
          result: "4 medical cases and 4 surgical cases are listed as headcounts with no bed-day exposure column.",
        },
        {
          action: "Sister Brenda prints the sheet for her pre-meeting folder.",
          result: "The banner concludes infection risk fell by a third across Ward 4B in October.",
        },
      ],
    },
    missesRule: {
      title: "Pooled Ward 4B patient-day rate workbook (Excel)",
      summary:
        "Computes infections per 1,000 patient-days across Ward 4B using exact bed-occupancy logs. Combines every October admission into a single ward line showing a rise from 20.0 to 32.0 per 1,000 patient-days.",
      demo: [
        {
          action: "Sam checks the exposure calculation in Excel.",
          result: "September shows 20.0 per 1,000 patient-days (12 / 600) and October shows 32.0 per 1,000 (8 / 250).",
        },
        {
          action: "Sister Brenda looks for separate rows for October's Ward 2 surgical transfers.",
          result: "All 250 October patient-days sit in one unstratified Ward 4B row; high-risk central-line transfers are blended with medical beds.",
        },
        {
          action: "Sam reads the executive takeaway cell.",
          result: "The sheet warns that Ward 4B's general nursing care worsened by 60% after 1 October.",
        },
      ],
    },
    scopeCreep: {
      title: "Ward 4B rate audit & 12-ward staff gel survey pack",
      summary:
        "Computes stratified per-1,000 patient-day rates for Ward 4B and appends a 12-ward staff questionnaire analysing fragrance ratings, skin dryness scores, and dispenser colour preferences.",
      demo: [
        {
          action: "Sam checks the Ward 4B rate tab.",
          result: "Medical (20.0 per 1,000) and surgical transfer (80.0 per 1,000) rates reconcile cleanly.",
        },
        {
          action: "Sister Brenda scrolls through the workbook tabs.",
          result: "Eight extra tabs chart unverified fragrance opinion polls across 11 other wards.",
        },
        {
          action: "Dr Lin checks submission readiness.",
          result: "Half the survey tabs show 'awaiting ward replies', pushing the pack past the committee page limit.",
        },
      ],
    },
  },
  reviewReasons: {
    problem: "It compares raw monthly case totals instead of rates per 1,000 patient-days",
    rule: "It pools all October admissions together instead of stratifying surgical cohorts",
    scope: "It adds an unrequested 12-ward staff fragrance survey outside Ward 4B",
    distractor: "The Excel header uses teal shading instead of St Jude's navy blue",
  },
  release: {
    measured: {
      label: "Submit the workbook to the committee and log any revision requests against the zero-revision target",
      feedback: "You submit the stratified rate workbook and track formal methodological queries from the committee chair.",
    },
    pilot: {
      label: "Walk the Lead Infection Control Nurse through the Excel tabs three days before submission",
      feedback: "You spend three days pre-checking the denominators and cohort splits with the lead nurse before committee filing.",
    },
    now: {
      label: "Circulate the headline chart straight to the Hospital Executive Board today",
      feedback: "You send the summary straight to hospital executives ahead of infection-control sign-off.",
    },
  },
  endings: {
    success:
      "The Infection Control Committee accepts the Ward 4B audit with zero methodological revisions, noting that medical-bed rates stayed steady at 20 per 1,000 while surgical transfers drove the October spike.",
    failureProblem:
      "At the meeting, the hospital epidemiologist divides 8 October cases by 250 patient-days on the whiteboard—showing the raw rate rose from 20 to 32 per 1,000. The report is rejected on the spot.",
    failureRule:
      "Executives read the unstratified 32 per 1,000 figure and blame Ward 4B nurses for rising infections, until Ward 2 transfer logs reveal four cases came from high-risk central-line surgical patients.",
    partialProblem:
      "During pre-review, the lead nurse spots missing patient-day denominators. You rebuild the rate columns in time to avoid embarrassment, though the filing misses this month's agenda.",
    partialRule:
      "During pre-review, the lead nurse asks how many October cases were Ward 2 surgical transfers. Splitting the cohorts rescues the conclusion but uses up the remaining placement days.",
    partialOther:
      "The Ward 4B numbers hold up, though extra survey tabs or untracked committee follow-up leave Sister Brenda tidying the pack herself.",
  },
  debrief: {
    missedFact: {
      problem: "You never asked about bed occupancy, missing that October had only 250 patient-days against September's 600.",
      rule: "You never asked whether Ward 4B's patient mix changed, missing the seven post-op surgical transfers from Ward 2.",
      scope: "You didn't confirm boundaries, leaving the door open to multi-ward staff opinion surveys.",
      success: "You didn't agree how the committee sign-off would be measured.",
    },
    missedRequirement: {
      problem: "Your requirements omitted patient-day denominators (infections per 1,000 patient-days).",
      rule: "Your requirements didn't separate post-op surgical transfers from general medical admissions.",
      scope: "Your requirements didn't restrict the workbook to Ward 4B's six-month catheter logs.",
      success: "Your requirements stated no measurable committee acceptance target.",
      environment: "Your requirements didn't specify native hospital Excel on locked-down ward PCs.",
    },
    missedConstraint: {
      problem: "Your brief didn't require rates per 1,000 patient-days, so Iris compared raw case counts (12 vs 8).",
      rule: "Your brief didn't ask Iris to stratify surgical transfers vs medical beds, so she pooled heterogeneous risk groups.",
      scope: "Your brief didn't rule out hospital-wide surveys, so Iris appended 12-ward fragrance tabs.",
    },
  },
  trust: {
    call: "You checked how Ward 4B recorded beds and admissions before touching the spreadsheet.",
    quote: "You promised Sister Brenda proof the gel worked before checking occupancy.",
    thorough: "Your questions uncovered both the closed bays and the Ward 2 surgical transfers.",
    metric: "You agreed a clear benchmark: committee sign-off with zero methodological revisions.",
    wrongReview: "You sent Iris's workbook back over styling while leaving the calculation untouched.",
    measured: "You submitted through the committee and tracked methodological queries formally.",
    releaseNow: "You circulated headline claims to executives before clinical peer check.",
    success: "The committee praised the stratified patient-day table and signed off first time.",
    failure: "The statistical flaw unravelled in front of the hospital committee.",
  },
  reportNotes: {
    scopeKept: "Your brief kept Iris strictly on Ward 4B's six-month catheter data.",
    pilot: "Pre-checking with the Lead Infection Control Nurse caught calculation risks before board circulation.",
  },
  concepts: {
    problem: {
      name: "Incidence rates",
      explanation:
        "Raw event counts show how many cases occurred, never how much exposure time produced them. An incidence rate divides cases by person-time at risk (such as 1,000 patient-days). When population size or occupancy drops sharply, raw counts can fall even while actual risk rises.",
      bridge:
        "Eight Late-Night crashes across 200 cars on an icy bridge represent far higher danger than twelve crashes across 10,000 cars during dry rush hour.",
      misconception: "Fewer total cases this month proves individual risk went down.",
      inTheJob:
        "Two bays were closed in October, shrinking total bed-days from 600 to 250. Check whether each version divides cases by patient-day occupancy.",
      cues: ["patient-day", "bed-day", "occupancy", "denominator", "raw"],
    },
    rule: {
      name: "Confounding variables",
      explanation:
        "A confounding factor is a background difference—such as baseline illness severity—that shifts at the same time as an intervention and distorts the outcome. Stratifying data into homogeneous risk groups separates the intervention's effect from the shift in case mix.",
      bridge:
        "Comparing two schools' exam averages without separating advanced-track transfers from standard classes blames the teacher for who walked through the door.",
      misconception: "A single overall before-and-after rate fairly measures an intervention even when who enters the group changes.",
      inTheJob:
        "Ward 4B took post-op surgical transfers with central lines in October. Check whether surgical transfers are stratified separately from general medical beds.",
      cues: ["surgical", "case mix", "central line", "stratify", "transfer"],
    },
  },
  artifact: {
    kind: "table",
    fileName: "ward-4b-audit.xlsx",
    columns: ["Cohort & Period", "Cases", "Patient-Days", "Rate / 1,000 Days"],
    check: {
      label: "Include a row-sum reconciliation check matching cohort patient-days to ward census totals",
      cues: [["reconcil", "check", "verify", "census", "sum", "total"]],
      passedDetail: "Census check: Sept 600 days + Oct cohorts (200 + 50 = 250 days) reconciled",
      failedDetail: "Census check skipped: patient-day exposure columns omitted from summary",
    },
    good: [
      "Sept — General Medical (baseline) | 12 | 600 | 20.0",
      "Oct — General Medical (new gel) | 4 | 200 | 20.0",
      "Oct — Ward 2 Surgical Transfers | 4 | 50 | 80.0",
      "Oct — Pooled Ward Total (reference) | 8 | 250 | 32.0",
    ],
    missesProblem: {
      lines: [
        "Sept — General Medical (baseline) | 12 | n/a (headcount) | - baseline -",
        "Oct — General Medical (new gel) | 4 | n/a (headcount) | -67% raw cases",
        "Oct — Ward 2 Surgical Transfers | 4 | n/a (headcount) | new cohort",
        "Oct — Headline Ward Summary | 8 | n/a (unweighted) | -33% total cases",
      ],
      flawedLine: 4,
    },
    missesRule: {
      lines: [
        "Sept — All Ward 4B Admissions | 12 | 600 | 20.0",
        "Oct — All Ward 4B Admissions (medical + surgical pooled) | 8 | 250 | 32.0",
        "Net Change (Oct vs Sept unstratified) | -4 | -350 | +12.0 (+60% spike)",
        "Audit Conclusion Row | Gel linked to higher ward rate | 850 | Review nursing routine",
      ],
      flawedLine: 2,
    },
    scopeCreep: {
      lines: [
        "Sept — General Medical (baseline) | 12 | 600 | 20.0",
        "Oct — General Medical (new gel) | 4 | 200 | 20.0",
        "Oct — Ward 2 Surgical Transfers | 4 | 50 | 80.0",
        "12-Ward Staff Fragrance & Moisture Poll | 214 replies | All wards | 4.1 / 5 floral scent",
      ],
      flawedLine: 4,
    },
  },
  viva: {
    question:
      "Before I sign this for the committee: raw cases dropped from 12 to 8, yet your sheet doesn't just celebrate a 33% win—how will you explain why to the committee chair in two sentences?",
  },
  samples: {
    requirements:
      "Report catheter infections as a rate per 1,000 patient-days using monthly bed occupancy as the denominator. Stratify post-op surgical transfers separately from general medical admissions. Restrict scope to Ward 4B over six months only, with no survey across other wards. Deliver as a standard hospital Excel workbook for ward PC workstations. Target: committee sign-off with zero methodological revisions.",
    brief:
      "Compute incidence rates per 1,000 patient-days using bed occupancy as the denominator rather than raw totals, and include a census reconciliation check. Stratify October admissions into general medical beds versus post-op surgical transfers to control case mix. Keep strictly to Ward 4B catheter logs only and exclude any hospital-wide survey.",
  },
};

export const wardGelAudit = buildScenario(wardGelAuditDraft, { id: "ward-gel-audit" });
