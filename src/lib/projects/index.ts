import { beanAndBread, beanAndBreadDraft } from "./bean-and-bread";
import { harbourClinic } from "./harbour-clinic";
import { harbourClinicDraft } from "./generated/draft-example";
import type { ProjectDraft } from "./generated/draft";
import { parcelPal, parcelPalDraft } from "./parcelpal";
import { riverNitrateLab, riverNitrateLabDraft } from "./river-nitrate-lab";
import { sunsetDaycare, sunsetDaycareDraft } from "./sunset-daycare";
import { tidewaterSwim, tidewaterSwimDraft } from "./tidewater-swim";
import { wardGelAudit, wardGelAuditDraft } from "./ward-gel-audit";
import { isGeneratedId, loadGeneratedScenario } from "./generated/store";
import type { ProjectScenario } from "./types";

export const projectScenarios: ProjectScenario[] = [
  harbourClinic,
  wardGelAudit,
  sunsetDaycare,
  beanAndBread,
  riverNitrateLab,
  tidewaterSwim,
  parcelPal,
];

/** The built-in projects as drafts, for instructors and learners to remix or customise with the AI. */
export const BUILT_IN_DRAFTS: Record<string, ProjectDraft> = {
  "harbour-clinic": harbourClinicDraft,
  "ward-gel-audit": wardGelAuditDraft,
  "sunset-daycare": sunsetDaycareDraft,
  "bean-and-bread": beanAndBreadDraft,
  "river-nitrate-lab": riverNitrateLabDraft,
  "tidewater-swim": tidewaterSwimDraft,
  parcelpal: parcelPalDraft,
};

/** A built-in project, written in code. */
export function getProjectScenario(id: string): ProjectScenario | undefined {
  return projectScenarios.find((scenario) => scenario.id === id);
}

/**
 * Any project the user may play: a built-in one, or a generated one they own,
 * were assigned in a class, or found in the public community gallery.
 * Returns null otherwise, so private projects look like missing ones.
 */
export async function loadProjectScenario(id: string, userId: string): Promise<ProjectScenario | null> {
  const builtIn = getProjectScenario(id);
  if (builtIn) return builtIn;
  return isGeneratedId(id) ? loadGeneratedScenario(id, userId) : null;
}
