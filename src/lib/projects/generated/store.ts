import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { HttpError, recordDb } from "@/lib/supabase/server";
import type { ProjectScenario } from "../types";
import { buildScenario, TEMPLATE_VERSION } from "./build";
import { projectDraftSchema } from "./draft";
import type { GeneratedProject, ProjectRequest } from "./generate";

/*
 * Generated projects live in public.generated_projects, private to their owner.
 * The draft (hidden facts, flawed versions) is read only here, with the service
 * role, after the owner check. Browsers can read the listing columns only.
 */

const PREFIX = "gen-";

export type GeneratedListing = {
  id: string;
  title: string;
  tagline: string;
  summary: string;
  domain: string;
  topic: string;
  created_at: string;
};

export function isGeneratedId(id: string) {
  return id.startsWith(PREFIX);
}

export function newGeneratedId() {
  // 12 base-36 characters from 9 random bytes.
  return PREFIX + BigInt(`0x${randomBytes(9).toString("hex")}`).toString(36).padStart(12, "0").slice(-12);
}

/** The playable scenario, or null when it doesn't exist or belongs to someone else. */
export async function loadGeneratedScenario(id: string, ownerId: string): Promise<ProjectScenario | null> {
  if (!isGeneratedId(id)) return null;
  const { data, error } = await recordDb()
    .from("generated_projects")
    .select("id,owner_id,draft")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new HttpError(503, "Could not load this project. Please retry.");
  if (!data || data.owner_id !== ownerId) return null;
  const draft = projectDraftSchema.safeParse(data.draft);
  if (!draft.success) throw new HttpError(500, "This project can't be opened any more.");
  return buildScenario(draft.data, { id: data.id, version: TEMPLATE_VERSION });
}

export async function saveGeneratedProject(
  ownerId: string,
  request: ProjectRequest,
  project: GeneratedProject,
  path?: { id: string; step: number },
) {
  const { error } = await recordDb().from("generated_projects").insert({
    id: project.scenario.id,
    owner_id: ownerId,
    domain: request.domain.trim().slice(0, 80),
    topic: request.topic.trim().slice(0, 200),
    title: project.draft.title,
    tagline: project.draft.tagline,
    summary: project.draft.summary,
    draft: project.draft,
    template_version: TEMPLATE_VERSION,
    model: project.model,
    ...(path ? { path_id: path.id, path_step: path.step } : {}),
  });
  // 23505: another request already made this step's project.
  if (error?.code === "23505" && path) throw new HttpError(409, "This step already has a project. Reload the page.");
  if (error) throw new HttpError(503, "The project was written but could not be saved. Please retry.");
}

/** The signed-in user's own projects, newest first, through their row-level-secured client. */
export async function listOwnGeneratedProjects(db: SupabaseClient): Promise<GeneratedListing[]> {
  const { data, error } = await db
    .from("generated_projects")
    .select("id,title,tagline,summary,domain,topic,created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return [];
  return data as GeneratedListing[];
}
