import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

/*
 * Who the learner is and how much of a subject they know. Kept in
 * public.profiles (display_name, background, experience), the learner's own
 * row, and used across Account & Profile (/profile) and Create (/projects/new).
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

export const BACKGROUND_PRESETS = [
  "Nursing student",
  "Business & finance major",
  "Law & policy student",
  "Chemistry / lab science",
  "Journalism & media",
  "Hospitality & design",
  "CS undergraduate",
] as const;

export type LearnerProfile = { background: string; level: Level | null };

export type AccountProfile = {
  displayName: string;
  background: string;
  level: Level | null;
};

export const profileSchema = z.object({
  background: z.string().trim().max(160),
  level: z.enum(LEVELS).nullable(),
});

export const accountProfileSchema = z.object({
  displayName: z.string().trim().max(80),
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

export function readAccountProfile(
  row: { display_name?: string | null; background?: string | null; experience?: string | null } | null,
): AccountProfile {
  const learner = readProfile(row);
  return {
    displayName: (row?.display_name ?? "").trim().slice(0, 80),
    background: learner.background,
    level: learner.level,
  };
}

/** Saves the profile to the learner's own row, through their row-level-secured client. */
export async function saveProfile(db: SupabaseClient, userId: string, profile: LearnerProfile) {
  const { error } = await db
    .from("profiles")
    .update({ background: profile.background || null, experience: profile.level, updated_at: new Date().toISOString() })
    .eq("id", userId);
  return !error;
}

/** Saves merged account identity + learner background/level on the user's own row. */
export async function saveAccountProfile(db: SupabaseClient, userId: string, profile: AccountProfile) {
  const { error } = await db
    .from("profiles")
    .update({
      display_name: profile.displayName.trim() || null,
      background: profile.background.trim() || null,
      experience: profile.level,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
  return !error;
}
