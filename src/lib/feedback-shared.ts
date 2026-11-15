import { z } from "zod";

export const FEEDBACK_KINDS = ["content_error", "grading_issue", "unclear", "diagram_broken"] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

export const FEEDBACK_SURFACES = ["primer", "learn", "game", "desktop", "report"] as const;
export type FeedbackSurface = (typeof FEEDBACK_SURFACES)[number];

export const FEEDBACK_STATUSES = ["open", "resolved", "dismissed"] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

export const FEEDBACK_KIND_LABELS: Record<FeedbackKind, string> = {
  content_error: "Content / domain error",
  grading_issue: "Unfair grading / check",
  unclear: "Unclear wording",
  diagram_broken: "Diagram display issue",
};

const feedbackContextValue = z.union([
  z.string().max(300),
  z.number().finite(),
  z.boolean(),
  z.null(),
]);

export type FeedbackContext = Record<string, string | number | boolean | null>;

/** Flat primitive-only diagnostic dictionary, bounded to prevent oversized JSONB payloads. */
export const feedbackContextSchema = z
  .record(z.string().trim().min(1).max(40), feedbackContextValue)
  .refine((obj) => Object.keys(obj).length <= 12, {
    message: "Too many diagnostic fields (max 12).",
  })
  .refine((obj) => JSON.stringify(obj).length <= 1800, {
    message: "Diagnostic context is too large (max 1800 characters).",
  });

export const submitFeedbackSchema = z.object({
  projectId: z.string().trim().regex(/^[a-z0-9-]{1,64}$/, "Invalid project id."),
  kind: z.enum(FEEDBACK_KINDS),
  surface: z.enum(FEEDBACK_SURFACES),
  targetId: z.string().trim().max(80).optional(),
  targetLabel: z.string().trim().max(160).optional(),
  message: z.string().trim().min(3, "Please add a short note (at least 3 characters).").max(1000),
  context: feedbackContextSchema.optional(),
});

export const resolveFeedbackSchema = z.object({
  status: z.enum(FEEDBACK_STATUSES),
  resolutionNote: z.string().trim().max(500).optional(),
});

export interface FeedbackItem {
  id: string;
  reporterId: string;
  projectId: string;
  projectTitle: string;
  kind: FeedbackKind;
  surface: FeedbackSurface;
  targetId: string | null;
  targetLabel: string | null;
  message: string;
  context: FeedbackContext;
  status: FeedbackStatus;
  resolutionNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
}
