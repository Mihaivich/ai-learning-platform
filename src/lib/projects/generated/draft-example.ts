import type { ProjectDraft } from "./draft";

/*
 * Harbour Clinic written as a generated-project draft (product track only).
 * It is the worked example in the generation prompt, showing the specificity
 * and tone a draft needs, and a fixture for the builder and checks.
 */
export const harbourClinicDraft: ProjectDraft = {
  title: "Harbour Clinic booking board",
  tagline: "Lead a two-week job with an AI client, an AI coding agent and a real deadline.",
  summary:
    "A small clinic keeps double-booking its morning appointments. You lead the job: find out what is really wrong, tell the coding agent what to build, review what it delivers and decide how to release it.",
  domain: "software",
  deliverable: "the booking board",
  learnerRole: "You lead the job for a small software studio.",
  client: {
    name: "Grace Wong",
    role: "Practice manager",
    organisation: "Harbour Family Clinic",
    persona:
      "Grace Wong, practice manager at a small family clinic. Friendly, busy and not technical. Speaks in short, natural sentences, sometimes mentions patients or staff by name. Cares about the budget and about not upsetting patients. Describes solutions ('an app like the big clinics') rather than problems unless asked good questions.",
  },
  assistant: { name: "Cody", kind: "AI coding agent" },
  manager: { name: "Leo", note: "We can give Harbour two weeks, no more. Cody is free if you want to use it. Keep me posted." },
  user: {
    from: "Kit (reception)",
    subject: "Dr Lee 9:00 double booked again",
    body: "Mandy and I both booked the 9:00 with Dr Lee this morning. Had to send one patient home. Third time this week.",
  },
  clientEmail: {
    subject: "Can you build us an app?",
    body: "Hi,\n\nPatients keep complaining that we booked them at the same time as someone else. It's embarrassing. Could you build us an app like the big clinics have? Can you start this week?\n\nThanks,\nGrace",
  },
  firstMoves: {
    call: "Book a call with Grace before committing to anything",
    delegate: {
      label: "Ask Cody to start building a booking app straight away",
      feedback: "You delegated before anyone knew what to build. Cody spent two days on an app that has to be thrown away once you talk to Grace.",
    },
    quote: {
      label: "Reply with a quote for a patient booking app",
      feedback: "You answered the request, not the problem. Grace is unsure what she's paying for and asks for a call anyway.",
    },
  },
  interview: {
    opening: "Hello! Thanks for making time. So, can you build us an app? Something like the big clinics have. What do you need from me?",
    vagueReplies: [
      "Hmm, I'm not sure what you mean. We just want the bookings to work.",
      "That's a bit technical for me. What would you like to know about how we work?",
      "I suppose so? I really just want patients to stop turning up at the same time.",
    ],
  },
  facts: {
    problem: {
      text: "Double bookings happen when Mandy and Kit edit the shared spreadsheet at the same time, mostly between 8:30 and 9:30.",
      reply: "It's always the morning rush, about half eight to half nine. Mandy and Kit both have the spreadsheet open and both type into the same row. Neither of them notices until two patients turn up.",
      cues: ["happen", "wrong", "double", "same time", "spreadsheet", "morning", "rush", "busy", "cause", "why", "mandy", "kit"],
      sampleQuestion: "Why do the double bookings happen, and when in the morning?",
    },
    rule: {
      text: "Cancelled appointments must stay on record. The clinic keeps appointment history for seven years.",
      reply: "Oh, cancellations must stay on file. We keep the appointment history for seven years, the auditors check it. Right now we just colour the row grey.",
      cues: ["cancel", "record", "history", "delete", "rule", "regulation", "audit", "keep"],
      sampleQuestion: "What do you do with the records when a booking is cancelled?",
    },
    scope: {
      text: "Patients book by phone. No patient app has been approved, and the budget is about two weeks of work.",
      reply: "Honestly, most of our patients just ring us. The board hasn't approved any patient app. Leo said you can give us about two weeks, and that's what we can pay for.",
      cues: ["who will use", "user", "budget", "cost", "money", "online", "phone", "scope"],
      sampleQuestion: "Who is the user, and what's the budget?",
    },
    detail: {
      text: "Each slot is 15 minutes. Dr Chan only works Tuesday and Thursday mornings.",
      reply: "Every appointment is fifteen minutes. Dr Lee is in every day, Dr Chan only Tuesday and Thursday mornings.",
      cues: ["slot", "length", "minutes", "doctor", "schedule", "hours", "shift", "long is"],
      sampleQuestion: "How long is each slot, and which doctor works which hours?",
    },
    environment: {
      text: "Reception uses one old shared PC with Chrome. Nothing can be installed on it.",
      reply: "We've got one old PC at the front desk, the clinic's IT won't let us install anything. Chrome works, that's about it.",
      cues: ["computer", "pc", "device", "laptop", "browser", "install", "equipment", "tablet"],
      sampleQuestion: "What computer and browser does the front desk have, and can we install anything?",
    },
    success: {
      text: "For Grace, success means fewer than one double booking per week.",
      reply: "If we got it down to less than one double booking a week, I'd be thrilled. Right now it's three or four.",
      cues: ["success", "measure", "fixed", "goal", "better", "how will you know", "target", "result"],
      sampleQuestion: "How will you know it's fixed? What would success look like?",
    },
  },
  requirements: {
    problem: {
      label: "The same doctor and slot can't be booked twice, even if both receptionists save at once",
      cues: [["double", "twice", "same slot", "same time", "conflict", "overlap", "already booked", "taken", "two bookings", "clash"]],
    },
    rule: {
      label: "Cancelling keeps the appointment on record, marked as cancelled",
      cues: [["cancel"], ["keep", "kept", "record", "history", "mark", "status", "not delete", "never delete", "retain", "7 years"]],
    },
    scope: {
      label: "Staff-only tool; no patient app in this release",
      cues: [["staff", "reception", "internal", "no patient", "not a patient", "no app", "not an app", "only"]],
    },
    success: {
      label: "Success measure: fewer than one double booking per week",
      cues: [["per week", "a week", "each week", "weekly", "measure", "metric", "success", "target", "fewer than", "less than"]],
    },
    environment: {
      label: "Works in Chrome on the existing reception PC",
      cues: [["chrome", "browser", "web", "existing pc", "current pc", "no install", "without install"]],
    },
  },
  constraints: {
    problem: {
      label: "Reject a booking for a taken doctor and slot when it is saved, not only in the screen",
      cues: [
        ["taken", "already booked", "double", "same slot", "same time", "conflict", "unique", "twice", "overlap", "clash"],
        ["save", "saving", "server", "database", "reject", "simultaneous", "concurrent", "race", "lock", "constraint"],
      ],
    },
    rule: {
      label: "Cancelling marks the appointment as cancelled; nothing is deleted",
      cues: [["cancel"], ["keep", "kept", "mark", "status", "never delete", "not delete", "history", "record", "retain", "soft"]],
    },
    scope: {
      label: "Only the staff booking board; no patient accounts, reminders or payments",
      cues: [
        ["only", "just", "no", "not", "don't", "do not", "without", "out of scope", "nothing else"],
        ["patient app", "patient account", "patient login", "patient portal", "login", "account", "payment", "reminder", "portal", "scope"],
      ],
    },
  },
  deliverables: {
    good: {
      title: "Add shared booking board",
      summary: "Adds a booking board for reception. A unique index stops two active bookings for the same doctor and slot. Cancelling marks the appointment as cancelled and keeps it in the history.",
      demo: [
        { action: "Mandy and Kit both book Dr Lee at 9:00 at the same moment.", result: "Mandy's booking is saved. Kit sees “That slot is already booked.”" },
        { action: "Mandy cancels Mr Ho's 9:15 appointment.", result: "The slot opens up. The appointment stays in the history, marked Cancelled." },
        { action: "Kit opens the board on the front-desk PC.", result: "It loads in Chrome. Nothing to install." },
      ],
    },
    missesProblem: {
      title: "Add shared booking board",
      summary: "Adds a booking board for reception. Before saving, it checks whether the slot is free and shows an error if it is taken. Cancelling keeps the appointment in the history.",
      demo: [
        { action: "Kit books Dr Lee at 9:00, then Mandy tries the same slot a minute later.", result: "Mandy sees “That slot is already booked.”" },
        { action: "Mandy and Kit both press Book for Dr Lee at 9:00 at the same moment.", result: "Both see “Booked”. The 9:00 now has two patients." },
        { action: "Mandy cancels Mr Ho's 9:15 appointment.", result: "The slot opens up. The appointment stays in the history, marked Cancelled." },
      ],
    },
    missesRule: {
      title: "Add shared booking board",
      summary: "Adds a booking board for reception. A unique index stops two bookings for the same doctor and slot. Cancelling removes the appointment so the slot is free again.",
      demo: [
        { action: "Mandy and Kit both book Dr Lee at 9:00 at the same moment.", result: "Mandy's booking is saved. Kit sees “That slot is already booked.”" },
        { action: "Mandy cancels Mr Ho's 9:15 appointment.", result: "The slot opens up. Mr Ho's appointment disappears from the day list and from the history." },
        { action: "Grace searches last week's history for cancellations.", result: "No cancelled appointments are found." },
      ],
    },
    scopeCreep: {
      title: "Add shared booking board and patient portal",
      summary: "Adds a booking board for reception, plus a patient portal so patients can sign up, log in and book online. A unique index stops double bookings. Cancelling keeps the appointment in the history.",
      demo: [
        { action: "Mandy and Kit both book Dr Lee at 9:00 at the same moment.", result: "Mandy's booking is saved. Kit sees “That slot is already booked.”" },
        { action: "Mandy cancels Mr Ho's 9:15 appointment.", result: "The slot opens up. The appointment stays in the history, marked Cancelled." },
        { action: "Grace opens the new “Patient portal” page.", result: "Patients can sign up and book online. Reminders show “coming soon”." },
      ],
    },
  },
  reviewReasons: {
    problem: "Two people can still book the same slot",
    rule: "Cancelled appointments disappear from the history",
    scope: "It adds things the clinic didn't ask for",
    distractor: "The colours don't match the clinic's brand",
  },
  release: {
    measured: {
      label: "Release to both receptionists and track double bookings for two weeks",
      feedback: "You release it and agree to count double bookings every week against Grace's target.",
    },
    pilot: {
      label: "Run a one-week pilot with Mandy first",
      feedback: "You trade two days for a safer start: Mandy uses the board alongside the spreadsheet for a week.",
    },
    now: { label: "Switch both receptionists over on Monday", feedback: "You switch the clinic over on Monday." },
  },
  endings: {
    success: "Two weeks later the weekly count shows zero double bookings, against a target of fewer than one. Grace extends the contract.",
    failureProblem: "On Tuesday at 9:00 Mandy and Kit book Dr Lee at the same moment, and both bookings go through. Two patients turn up. It's exactly the problem the clinic hired you to fix.",
    failureRule: "In the first week an auditor asks for last month's cancellations. They're gone: every cancelled appointment was deleted. Grace has to explain the missing records.",
    partialProblem: "During the pilot week Mandy and Kit still manage to double-book the 9:00 once. The pilot caught it before the full switch, but the job overruns while Cody fixes it.",
    partialRule: "During the pilot Mandy notices that cancelled appointments vanish from the history. You stop before the clinic loses real records, but the fix pushes the release past the two weeks.",
    partialOther: "The booking board works and reception likes it, but nobody can show the clinic that the problem is solved, or the extra work ate into the budget.",
  },
  debrief: {
    missedFact: {
      problem: "You never found out when the double bookings happen. They come from two people saving at the same moment, which is exactly what the agent needed to guard against.",
      rule: "Grace never told you what happens to cancelled appointments, because you didn't ask. The clinic must keep seven years of history.",
      scope: "You didn't ask who would use the system or what the budget was. No patient app is approved.",
      success: "You didn't ask how Grace would judge success, so you had no target to measure against.",
    },
    missedRequirement: {
      problem: "Your requirements didn't say that the same slot must not be bookable twice when two people save together.",
      rule: "Your requirements didn't say that cancelled appointments must stay on record.",
      scope: "Your requirements didn't limit the scope to a staff tool.",
      success: "Your requirements had no success measure, so nobody could tell whether the release worked.",
      environment: "Your requirements didn't mention the reception PC.",
    },
    missedConstraint: {
      problem: "Your brief didn't tell Cody to reject a taken slot at the moment it is saved. Checking first and saving afterwards still lets two simultaneous bookings through.",
      rule: "Your brief didn't tell Cody that cancelling must keep the record. Cody chose the simplest option: delete it.",
      scope: "Your brief didn't limit the scope, so Cody added a patient portal nobody asked for.",
    },
  },
  trust: {
    call: "You called Grace before committing to anything.",
    quote: "You sent a quote before you understood the problem.",
    thorough: "Your questions got to what really goes wrong at the front desk.",
    metric: "You agreed a success measure with Grace: fewer than one double booking a week.",
    wrongReview: "You sent Cody's work back for the wrong reason, and Grace asked why it was taking longer.",
    measured: "You released with a weekly count against Grace's target.",
    releaseNow: "You switched the whole clinic over at once, with no way to catch a problem early.",
    success: "The weekly count showed the problem is solved.",
    failure: "The release went wrong in front of the clinic.",
  },
  reportNotes: {
    scopeKept: "Your brief kept Cody to the staff booking board.",
    pilot: "You piloted with one receptionist first, which limits the damage of anything you missed.",
  },
  samples: {
    requirements:
      "The same doctor and slot must never be booked twice, even if Mandy and Kit save at the same time. Cancelling must keep the appointment on record with a cancelled status (7 years of history). Staff-only tool for reception, no patient app. Works in Chrome on the existing PC. Success: fewer than one double booking per week.",
    brief:
      "Build a staff-only booking board. Reject a booking when the slot is already taken at the moment it is saved, so two receptionists saving at the same time can't both succeed (use a unique constraint). Cancelling must mark the appointment as cancelled; do not delete anything. Only the booking board: no patient accounts, reminders or payments.",
  },
};
