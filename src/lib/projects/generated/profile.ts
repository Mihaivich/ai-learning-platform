import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

/*
 * Who the learner is and how much of a subject they know. Kept in
 * public.profiles (background, experience), the learner's own row, and used to
 * set generated projects in their world, at their level.
 */

export const LEVELS = ["none", "some", "comfortable"] as const;
export type Level = (typeof LEVELS)[number];

export const LEVEL_LABELS: Record<Level, string> = {
  none: "New to it",
  some: "Know the basics",
  comfortable: "Comfortable",
};

/** How the prompt describes each level. */
export const LEVEL_PROMPTS: Record<Level, string> = {
  none: "new to the subject",
  some: "knows the basics of the subject",
  comfortable: "comfortable with the subject and wants a challenge",
};

export type LearnerProfile = { background: string; level: Level | null };

export const profileSchema = z.object({
  background: z.string().trim().max(160),
  level: z.enum(LEVELS).nullable(),
});

// The retired course system stored a code here; read those as a description.
const LEGACY_BACKGROUNDS: Record<string, string> = {
  non_cs: "someone without a computing background",
  cs_student: "a computer science student",
  cs_graduate: "a computer science graduate",
  career_switcher: "someone switching careers",
};

export function readProfile(row: { background?: string | null; experience?: string | null } | null): LearnerProfile {
  const background = row?.background?.trim() ?? "";
  const level = LEVELS.find((item) => item === row?.experience) ?? null;
  return { background: LEGACY_BACKGROUNDS[background] ?? background.slice(0, 160), level };
}

/** Saves the profile to the learner's own row, through their row-level-secured client. */
export async function saveProfile(db: SupabaseClient, userId: string, profile: LearnerProfile) {
  const { error } = await db
    .from("profiles")
    .update({ background: profile.background || null, experience: profile.level, updated_at: new Date().toISOString() })
    .eq("id", userId);
  return !error;
}
