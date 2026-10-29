import { createHash } from "node:crypto";
import { HttpError, recordDb } from "@/lib/supabase/server";
import { getProjectScenario } from "@/lib/projects";
import { projectView } from "@/lib/projects/runtime";
import type { SimulationHistory, SimulationState } from "./simulation/engine";
import type { LearningActivity } from "./registry";
import type { Evaluation } from "./evaluate";
import type { ProjectCourseContext } from "./project-links";

type ProjectActivity = Extract<LearningActivity, { activityType: "project" }>;
export type ProjectEvidence = {
  run_id: string;
  activity_snapshot: unknown;
  state: unknown;
  history: unknown;
};

/** Called only with an authorized course/activity and a row selected for this user. */
export function evaluateProjectEvidence(activity: ProjectActivity, evidence: ProjectEvidence | null): Evaluation {
  const scenario = getProjectScenario(activity.config.scenarioId);
  if (!scenario) throw new HttpError(404, "Project unavailable.");
  const snapshot = evidence?.activity_snapshot as { project?: unknown; version?: unknown } | null;
  if (!evidence || snapshot?.project !== scenario.id || snapshot.version !== scenario.version) {
    throw new HttpError(409, "Complete the current version of this project first.");
  }
  const state = evidence.state as SimulationState | null;
  if (!state || state.status !== "completed" || !state.outcome || !state.variables || !state.memo) {
    throw new HttpError(409, "Finish the project before recording course completion.");
  }
  const view = projectView(scenario, state, Array.isArray(evidence.history) ? evidence.history as SimulationHistory : []);
  if (!view.completion) throw new HttpError(409, "The project has no completion report.");
  return {
    complete: true,
    // Fluency is qualitative. A completed project need not have a successful outcome.
    score: null,
    feedback: {
      summary: `${scenario.title}: ${view.completion.outcome}. ${view.completion.summary}`,
      criteria: view.completion.cards.map((card) => ({
        criterion: card.title,
        assessment: card.rating === "strong" ? "met" : card.rating === "mixed" ? "developing" : "not-yet",
        evidence: card.evidence.join("\n"),
        suggestion: "Reflect on these decisions and compare another approach in a new run.",
      })),
      nextStep: "Return to the course and reflect on your decisions and the project outcome.",
      characterReply: "",
    },
  };
}

/** One immutable gradebook entry per completed run, course, lesson and activity. */
export function projectAttemptId(context: ProjectCourseContext, userId: string, runId: string, activity: ProjectActivity) {
  const hash = createHash("sha256").update(JSON.stringify([context.courseId, context.lessonId, context.activityId, userId, runId, activity.config.scenarioId])).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

export async function readProjectEvidence(userId: string, activity: ProjectActivity): Promise<ProjectEvidence | null> {
  const scenarioId = activity.config.scenarioId;
  const { data, error } = await recordDb().from("simulation_sessions")
    .select("run_id,activity_snapshot,state,history")
    .eq("user_id", userId)
    .eq("course_id", `project:${scenarioId}`)
    .eq("lesson_id", "run")
    .eq("activity_id", scenarioId)
    .maybeSingle();
  if (error) throw new HttpError(503, "Could not verify your project. Retry recording completion.");
  return data as ProjectEvidence | null;
}
