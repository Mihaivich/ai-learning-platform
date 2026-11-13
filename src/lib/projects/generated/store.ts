import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { HttpError, recordDb } from "@/lib/supabase/server";
import type { ProjectScenario } from "../types";
import { buildScenario, TEMPLATE_VERSION } from "./build";
import { projectDraftSchema, type ProjectDraft } from "./draft";
import type { GeneratedProject, ProjectRequest } from "./generate";

/*
 * Generated projects live in public.generated_projects, private to their owner
 * by default, except when:
 *   1. an instructor assigns one to a class the student belongs to, or
 *   2. the owner shares it to the public Community Gallery (`is_public = true`).
 *
 * The `draft` column (hidden facts, checklists, flawed deliverables) is NEVER
 * readable by browser clients: it is read only here with the service role.
 */

const PREFIX = "gen-";

export type GeneratedListing = {
  id: string;
  title: string;
  tagline: string;
  summary: string;
  domain: string;
  subject?: string | null;
  topic: string;
  is_public?: boolean;
  created_at: string;
};

export function isGeneratedId(id: string) {
  return id.startsWith(PREFIX);
}

export function newGeneratedId() {
  // 12 base-36 characters from 9 random bytes.
  return PREFIX + BigInt(`0x${randomBytes(9).toString("hex")}`).toString(36).padStart(12, "0").slice(-12);
}

/** True when the project is assigned to a class the user is in. */
async function assignedToUser(id: string, userId: string) {
  if (!userId) return false;
  const service = recordDb();
  const { data: memberships } = await service.from("class_members").select("class_id").eq("student_id", userId);
  const classIds = (memberships ?? []).map((row) => row.class_id as string);
  if (!classIds.length) return false;
  const { data } = await service.from("class_projects").select("class_id").eq("project_id", id).in("class_id", classIds).limit(1);
  return Boolean(data?.length);
}

/** The project's row for its owner, a class member, or anyone when shared publicly. */
async function playableRow<T extends string>(id: string, userId: string, columns: T) {
  if (!isGeneratedId(id)) return null;
  const db = recordDb();
  let res = await db.from("generated_projects").select(`owner_id,is_public,${columns}`).eq("id", id).maybeSingle();
  // Graceful fallback if the remote DB hasn't run 20261112090000_public_gallery.sql yet.
  if (res.error?.code === "42703") {
    res = await db.from("generated_projects").select(`owner_id,${columns}`).eq("id", id).maybeSingle();
  }
  if (res.error) throw new HttpError(503, "Could not load this project. Please retry.");
  if (!res.data) return null;
  const row = res.data as unknown as Record<string, unknown> & { owner_id: string; is_public?: boolean };
  const allowed =
    (Boolean(userId) && row.owner_id === userId) ||
    row.is_public === true ||
    (Boolean(userId) && (await assignedToUser(id, userId)));
  return allowed ? row : null;
}

/** What the desktop shows before the run loads. */
export async function loadPlayableListing(id: string, userId: string) {
  const row = await playableRow(id, userId, "title,summary,path_id");
  return row
    ? {
        title: row.title as string,
        summary: row.summary as string,
        pathId: (row.path_id as string | null) ?? null,
        own: Boolean(userId) && row.owner_id === userId,
        isPublic: row.is_public === true,
      }
    : null;
}

/** The owner's draft, to edit or to build on. */
export async function loadOwnDraft(id: string, ownerId: string): Promise<ProjectDraft | null> {
  if (!isGeneratedId(id)) return null;
  const { data, error } = await recordDb().from("generated_projects").select("owner_id,draft").eq("id", id).maybeSingle();
  if (error) throw new HttpError(503, "Could not load this project. Please retry.");
  if (!data || data.owner_id !== ownerId) return null;
  const draft = projectDraftSchema.safeParse(data.draft);
  return draft.success ? draft.data : null;
}

/** Loads a generated draft for One-Click Remix if the user owns it or it is public. */
export async function loadRemixableGeneratedDraft(id: string, userId: string): Promise<ProjectDraft | null> {
  const row = await playableRow(id, userId, "draft");
  if (!row) return null;
  const draft = projectDraftSchema.safeParse(row.draft);
  return draft.success ? draft.data : null;
}

/** Public summary for the Remix banner (never exposes hidden draft fields to the browser). */
export async function loadPublicOrOwnSummary(id: string, userId: string): Promise<{ id: string; title: string; domain: string; summary: string } | null> {
  const row = await playableRow(id, userId, "title,domain,summary");
  if (!row) return null;
  return {
    id,
    title: row.title as string,
    domain: row.domain as string,
    summary: row.summary as string,
  };
}

/** Saves an edited draft over the owner's project. The caller has checked it. */
export async function updateOwnDraft(id: string, ownerId: string, draft: ProjectDraft) {
  const { data, error } = await recordDb()
    .from("generated_projects")
    .update({ draft, title: draft.title, tagline: draft.tagline, summary: draft.summary })
    .eq("id", id)
    .eq("owner_id", ownerId)
    .select("id");
  if (error || !data?.length) throw new HttpError(503, "Could not save the project. Please retry.");
}

/** Toggles whether an owner's generated course appears in the public Community Gallery. */
export async function setGeneratedProjectPublic(id: string, ownerId: string, isPublic: boolean) {
  if (!isGeneratedId(id)) throw new HttpError(404, "Project not found.");
  const { data, error } = await recordDb()
    .from("generated_projects")
    .update({ is_public: isPublic })
    .eq("id", id)
    .eq("owner_id", ownerId)
    .select("id,is_public");
  if (error?.code === "42703") {
    throw new HttpError(503, "Gallery sharing requires the latest database migration.");
  }
  if (error || !data?.length) throw new HttpError(404, "Project not found or not owned by you.");
  return { id, isPublic: Boolean(data[0].is_public) };
}

/** The playable scenario, or null when it doesn't exist or this user may not play it. */
export async function loadGeneratedScenario(id: string, userId: string): Promise<ProjectScenario | null> {
  const data = await playableRow(id, userId, "draft");
  if (!data) return null;
  const draft = projectDraftSchema.safeParse(data.draft);
  if (!draft.success) throw new HttpError(500, "This project can't be opened any more.");
  return buildScenario(draft.data, { id, version: TEMPLATE_VERSION });
}

export async function saveGeneratedProject(
  ownerId: string,
  request: ProjectRequest,
  project: GeneratedProject,
  path?: { id: string; step: number },
) {
  const db = recordDb();
  const baseRow = {
    id: project.scenario.id,
    owner_id: ownerId,
    domain: (request.domain.trim() || project.draft.domain).slice(0, 80),
    topic: request.topic.trim().slice(0, 200),
    title: project.draft.title,
    tagline: project.draft.tagline,
    summary: project.draft.summary,
    draft: project.draft,
    template_version: TEMPLATE_VERSION,
    model: project.model,
    ...(path ? { path_id: path.id, path_step: path.step } : {}),
  };
  let { error } = await db.from("generated_projects").insert({
    ...baseRow,
    ...(request.subject?.trim() ? { subject: request.subject.trim().slice(0, 80) } : {}),
  });
  if (error?.code === "42703") {
    ({ error } = await db.from("generated_projects").insert(baseRow));
  }
  // 23505: another request already made this step's project.
  if (error?.code === "23505" && path) throw new HttpError(409, "This step already has a project. Reload the page.");
  if (error) throw new HttpError(503, "The project was written but could not be saved. Please retry.");
}

/** The signed-in user's own projects, newest first, scoped strictly to owner_id. */
export async function listOwnGeneratedProjects(db: SupabaseClient, ownerId?: string): Promise<GeneratedListing[]> {
  const uid = ownerId ?? (await db.auth.getUser()).data.user?.id;
  if (!uid) return [];
  const primary = await db
    .from("generated_projects")
    .select("id,title,tagline,summary,domain,subject,topic,is_public,created_at")
    .eq("owner_id", uid)
    .order("created_at", { ascending: false })
    .limit(50);
  if (primary.error?.code === "42703") {
    const fallback = await db
      .from("generated_projects")
      .select("id,title,tagline,summary,domain,topic,created_at")
      .eq("owner_id", uid)
      .order("created_at", { ascending: false })
      .limit(50);
    if (fallback.error) return [];
    return (fallback.data ?? []) as GeneratedListing[];
  }
  if (primary.error) return [];
  return (primary.data ?? []) as GeneratedListing[];
}

/** Courses shared by learners and instructors to the public Community Gallery. */
export async function listPublicGeneratedProjects(db: SupabaseClient): Promise<GeneratedListing[]> {
  const { data, error } = await db
    .from("generated_projects")
    .select("id,title,tagline,summary,domain,subject,topic,is_public,created_at")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(24);
  if (error) return [];
  return (data ?? []) as GeneratedListing[];
}
