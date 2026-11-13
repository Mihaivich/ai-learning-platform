import type { ArtifactKind } from "./types";

/**
 * Broad faculty / discipline categories used for cross-disciplinary filtering.
 * Generated projects map into these automatically from their subject/domain, or
 * appear under "Community" as well.
 */
export type DisciplineCategory =
  | "Software & AI"
  | "Data & Healthcare"
  | "Business & Economics"
  | "Law & Media"
  | "Natural Sciences";

/**
 * Public, browser-safe facts about each project. The full scenarios (variants,
 * checklists, hidden facts) live in server-only modules and must not be imported
 * from client components.
 */
export interface ProjectListing {
  id: string;
  title: string;
  tagline: string;
  summary: string;
  minutes: number;
  discipline: DisciplineCategory;
  subject: string;
  artifactKind: ArtifactKind;
  /** What the learner does with the AI teammates, shown as tags. */
  skills: string[];
}

export function inferDiscipline(domainOrSubject?: string | null): DisciplineCategory {
  const s = (domainOrSubject ?? "").toLowerCase();
  if (/(health|nurs|medic|clinic|epidemi|stat|data|biostat|psych)/.test(s)) {
    // Keep Harbour Clinic itself in Software & AI via explicit listing; infer healthcare/stats for generated ones.
    return "Data & Healthcare";
  }
  if (/(chem|bio|phys|ecolog|environ|lab|geol|science|nitrate)/.test(s)) return "Natural Sciences";
  if (/(law|legal|privac|gdpr|media|journal|policy|ethic|copy|market|communicat|design|humanit|histor)/.test(s)) return "Law & Media";
  if (/(econ|financ|account|business|operat|supply|manage|retail|hospitality|daycare)/.test(s)) return "Business & Economics";
  if (/(code|coding|software|program|comput|web|app|api|system|database|engineer)/.test(s)) return "Software & AI";
  return "Business & Economics";
}

export const harbourClinicListing = {
  id: "harbour-clinic",
  title: "Harbour Clinic booking board",
  tagline: "Lead a two-week job with an AI client, an AI coding agent and a real deadline.",
  summary:
    "A small clinic keeps double-booking its morning appointments. You lead the job: find out what is really wrong, tell the coding agent what to build, review what it delivers and decide how to release it. Every decision changes what happens next.",
  minutes: 20,
  discipline: "Software & AI",
  subject: "Software Engineering · Concurrency & Access Control",
  artifactKind: "code",
  skills: ["Interview an AI client", "Brief an AI coding agent", "Audit PR diff", "Live sign-off viva"],
} as const satisfies ProjectListing;

// Built from drafts: kept in step with each draft's title by tests/builtin.test.ts.
export const wardGelAuditListing = {
  id: "ward-gel-audit",
  title: "Ward 4B hand-gel audit",
  tagline: "Audit clinical infection data with an AI statistical analyst before the hospital committee meets.",
  summary:
    "Ward 4B switched to a new sanitising hand gel and raw infection cases dropped from 12 to 8. Investigate what really changed on the ward, brief your AI statistical analyst, audit its Excel rate table and defend your findings.",
  minutes: 20,
  discipline: "Data & Healthcare",
  subject: "Clinical Statistics · Incidence Rates & Confounding",
  artifactKind: "table",
  skills: ["Question raw counts", "Brief an AI statistical analyst", "Audit spreadsheet rows", "Live sign-off viva"],
} as const satisfies ProjectListing;

export const sunsetDaycareListing = {
  id: "sunset-daycare",
  title: "Sunset Daycare pickup policy",
  tagline: "Design a behavioural intervention with an AI policy analyst without backfiring on late pickups.",
  summary:
    "Parents keep arriving after 5:30 PM at Sunset Daycare, leaving exhausted teachers on overtime. Investigate why a small £6 fee backfired in one room, guide your AI policy analyst, audit its trial workbook and defend the rollout plan.",
  minutes: 20,
  discipline: "Business & Economics",
  subject: "Behavioural Economics · Crowding Out & Selection Bias",
  artifactKind: "table",
  skills: ["Uncover perverse incentives", "Brief an AI policy analyst", "Audit cohort table", "Live sign-off viva"],
} as const satisfies ProjectListing;

export const beanAndBreadListing = {
  id: "bean-and-bread",
  title: "Bean & Bread loyalty pass",
  tagline: "Launch a compliant café loyalty scheme with an AI marketing & legal-copy agent.",
  summary:
    "Bean & Bread loses morning commuters when counter queues stall, yet its owner asks for a full chain-style mobile app. Uncover the rush-hour bottleneck and SMS privacy law, brief your AI agent, redline its clauses and defend launch.",
  minutes: 20,
  discipline: "Law & Media",
  subject: "Service Operations & Privacy Law · Cycle Time & Opt-In",
  artifactKind: "document",
  skills: ["Diagnose queue bottlenecks", "Brief an AI policy agent", "Redline § clauses", "Live sign-off viva"],
} as const satisfies ProjectListing;

export const riverNitrateLabListing = {
  id: "river-nitrate-lab",
  title: "River Meadow nitrate SOP",
  tagline: "Validate an environmental water-testing protocol with an AI lab-methods agent.",
  summary:
    "Volunteer river-watchers keep getting wildly inconsistent nitrate readings downstream of Meadow Farm. Investigate how blanks are zeroed and how bottles travel back to the bench, brief your AI lab agent, review its SOP steps and defend sign-off.",
  minutes: 20,
  discipline: "Natural Sciences",
  subject: "Analytical Chemistry · Matrix Blanks & Cold Chain",
  artifactKind: "steps",
  skills: ["Trace field-to-bench errors", "Brief an AI lab agent", "Inspect SOP steps", "Live sign-off viva"],
} as const satisfies ProjectListing;

export const tidewaterSwimListing = {
  id: "tidewater-swim",
  title: "Tidewater Swim School sign-up",
  tagline: "Hand an AI coding agent someone else's code, then check what else it changed.",
  summary:
    "A swim school's online sign-up charges some families the wrong amount, and the freelancer who wrote it has gone. Brief the coding agent on code you didn't write, and check that its fix doesn't break what already worked.",
  minutes: 20,
  discipline: "Software & AI",
  subject: "Software Maintenance · Regression Testing & Secrets",
  artifactKind: "code",
  skills: ["Work on legacy code", "Brief an AI coding agent", "Check regressions", "Live sign-off viva"],
} as const satisfies ProjectListing;

export const parcelPalListing = {
  id: "parcelpal",
  title: "ParcelPal delivery charges",
  tagline: "Fix a bug that only happens on bad networks, without breaking the apps already out there.",
  summary:
    "A same-day delivery company keeps charging shops two or three times for one delivery, and the client is sure the server is just slow. Find out when it really happens, then brief the coding agent on a server that phone apps nobody can force to update depend on.",
  minutes: 20,
  discipline: "Software & AI",
  subject: "Distributed Systems · Idempotency & Backwards Compatibility",
  artifactKind: "code",
  skills: ["Question the client's theory", "Brief an AI coding agent", "Audit API diff", "Live sign-off viva"],
} as const satisfies ProjectListing;

export const projectListings: readonly ProjectListing[] = [
  harbourClinicListing,
  wardGelAuditListing,
  sunsetDaycareListing,
  beanAndBreadListing,
  riverNitrateLabListing,
  tidewaterSwimListing,
  parcelPalListing,
];
