import { GoogleGenAI, type Content } from "@google/genai";
import { z } from "zod";
import { redactSecrets } from "@/lib/supabase/server";

import {
  GOAL_LABELS,
  LANGUAGE_NAMES,
  LEARNING_STYLE_LABELS,
  type CoursePreference,
  type Goal,
  type LearnerProfile,
  type LearningStyle,
} from "@/lib/types";


/*
 * Free-tier Gemini limits are per project and per model, so a second model adds
 * its own allowance. Requests go to the first model that is not cooling down
 * after a rate limit; when every model fails the caller falls back to its
 * offline logic, so the learner is never blocked by the AI.
 */

/** Models in the order they are tried. */
export function modelChain(): string[] {
  const models = [
    process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
    process.env.GEMINI_FALLBACK_MODEL || "gemini-3.1-flash-lite",
  ];
  return [...new Set(models.map((model) => model.trim()).filter(Boolean))];
}

export function hasGeminiKey() {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

let client: GoogleGenAI | null = null;

function getClient() {
  if (!client) client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY?.trim() });
  return client;
}

export type JsonRequest = { system: string; prompt: string; maxTokens?: number };

/** Sends one request and returns the raw text. Swappable in tests. */
export type ModelCall = (
  model: string,
  request: JsonRequest & { jsonSchema: Record<string, unknown> },
  signal: AbortSignal,
) => Promise<string | undefined>;

const callGemini: ModelCall = async (model, request, signal) => {
  const response = await getClient().models.generateContent({
    model,
    contents: [{ role: "user", parts: [{ text: request.prompt }] }],
    config: {
      systemInstruction: request.system,
      maxOutputTokens: request.maxTokens ?? 1024,
      temperature: 0,
      responseMimeType: "application/json",
      responseJsonSchema: request.jsonSchema,
      abortSignal: signal,
    },
  });
  return response.text;
};

// A slow first answer can take several seconds; past this the next model is tried.
const DEFAULT_TIMEOUT_MS = 12_000;

// Per server instance: when a model was rate limited, skip it until this time.
const cooldownUntil = new Map<string, number>();

export function resetModelCooldowns() {
  cooldownUntil.clear();
}

/** Milliseconds until midnight Pacific time, when the daily free-tier quota resets. */
export function msUntilPacificMidnight(now: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23",
  }).formatToParts(new Date(now));
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const elapsed = get("hour") * 3600 + get("minute") * 60 + get("second");
  return Math.max(60, 24 * 3600 - elapsed) * 1000;
}

/**
 * How long to rest a model after this error, or null when it is not a rate
 * limit. A spent daily quota rests until it resets; a per-minute limit rests
 * for the delay Google suggests, or a minute.
 */
export function rateLimitCooldown(error: unknown, now: number): number | null {
  const status = (error as { status?: unknown } | null)?.status;
  const message = error instanceof Error ? error.message : String(error);
  if (status !== 429 && !/RESOURCE_EXHAUSTED|\b429\b/.test(message)) return null;
  if (/PerDay/i.test(message)) return msUntilPacificMidnight(now);
  const delay = message.match(/retryDelay"?\s*:\s*"?(\d+(?:\.\d+)?)s/i) ?? message.match(/retry in (\d+(?:\.\d+)?)s/i);
  return delay ? Math.ceil(Number(delay[1]) * 1000) + 1000 : 60_000;
}

/**
 * Asks each model in turn for JSON matching the schema. Returns the parsed data
 * and the model that produced it, or null when no model gave a valid answer.
 */
export async function generateJsonFromChain<T extends z.ZodType>(
  request: JsonRequest & { schema: T; timeoutMs?: number },
  options: { models?: string[]; call?: ModelCall; now?: () => number } = {},
): Promise<{ data: z.infer<T>; model: string } | null> {
  const models = options.models ?? modelChain();
  const call = options.call ?? callGemini;
  const now = options.now ?? Date.now;
  // Gemini supports a subset of JSON Schema; the meta-schema URL isn't part of it.
  const jsonSchema: Record<string, unknown> = { ...z.toJSONSchema(request.schema) };
  delete jsonSchema.$schema;

  for (const model of models) {
    if ((cooldownUntil.get(model) ?? 0) > now()) continue;
    try {
      const text = await call(model, { ...request, jsonSchema }, AbortSignal.timeout(request.timeoutMs ?? DEFAULT_TIMEOUT_MS));
      const parsed = request.schema.safeParse(JSON.parse(text ?? ""));
      if (parsed.success) return { data: parsed.data, model };
      console.warn(`Gemini ${model} returned JSON that does not match the schema.`);
    } catch (error) {
      const rest = rateLimitCooldown(error, now());
      if (rest !== null) cooldownUntil.set(model, now() + rest);
      const reason = error instanceof Error ? error.message : String(error);
      console.warn(`Gemini ${model} ${rest !== null ? "is rate limited" : "failed"}: ${redactSecrets(reason).slice(0, 300)}`);
    }
  }
  return null;
}

export const MODEL = modelChain()[0];

export const MAX_TURNS = 30;
export const MAX_CHARS = 4000;

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

/** Validates chat history from the browser and converts it to Gemini contents. */
export function toContents(turns: unknown, { requireUserLast = true } = {}): Content[] | null {
  if (!Array.isArray(turns) || turns.length === 0 || turns.length > MAX_TURNS) return null;
  const out: Content[] = [];
  for (const t of turns) {
    if (
      !t ||
      (t.role !== "user" && t.role !== "assistant") ||
      typeof t.content !== "string" ||
      t.content.length === 0 ||
      t.content.length > MAX_CHARS
    ) {
      return null;
    }
    out.push({ role: t.role === "assistant" ? "model" : "user", parts: [{ text: t.content }] });
  }
  if (requireUserLast && out[out.length - 1].role !== "user") return null;
  return out;
}

const GOAL_GUIDANCE: Record<Goal, string> = {
  understand:
    "Prioritise concepts, analogies and why something works before asking for practice.",
  build:
    "Connect explanations to doing: examples, worked steps and short practice suggestions.",
  career:
    "Use professional context, realistic standards and examples from the workplace.",
};

const STYLE_GUIDANCE: Record<LearningStyle, string> = {
  balanced: "Mix explanation with a small check for understanding.",
  step_by_step:
    "Break the answer into a short sequence of steps and check understanding after each one.",
  interactive:
    "Invite the learner to try, predict or answer before giving the full explanation.",
};

export function describeLearner(
  profile: LearnerProfile | null | undefined,
  coursePreference?: CoursePreference | null,
): string {
  const lines: string[] = [];
  if (!profile) {
    lines.push(
      "No global learner preferences saved. Assume a curious beginner in the current subject.",
      "Use clear English unless the lesson itself is in another language.",
      "Use a balanced style: explain briefly, then check understanding.",
    );
  } else {
    const goal = coursePreference?.goal ?? profile.goal;
    lines.push(
      `Name: ${profile.displayName || "(not given)"}`,
      `Preferred language: ${LANGUAGE_NAMES[profile.language]}`,
      `Main goal: ${GOAL_LABELS[profile.goal]}. ${GOAL_GUIDANCE[profile.goal]}`,
      `Learning style: ${LEARNING_STYLE_LABELS[profile.learningStyle]}. ${STYLE_GUIDANCE[profile.learningStyle]}`,
    );
    if (coursePreference) {
      lines.push(
        `Goal for this course: ${GOAL_LABELS[goal]}. ${GOAL_GUIDANCE[goal]}`,
      );
    }
  }
  if (coursePreference) {
    lines.push(
      `Experience in this course's subject: ${coursePreference.experience === "none" ? "new to it" : coursePreference.experience === "some" ? "some experience" : "confident"}.`,
      "The course-level experience and goal override the general preference where they differ.",
    );
  } else {
    lines.push(
      "No course-level experience has been set. Do not infer subject knowledge from a computer-science or other academic background.",
    );
  }
  return lines.join("\n");
}

/** Streams the model's text to the browser as a plain-text response. */
export function streamText(params: { system: string; contents: Content[]; maxTokens?: number }): Response {
  const encoder = new TextEncoder();
  const abort = new AbortController();

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const stream = await getClient().models.generateContentStream({
          model: MODEL,
          contents: params.contents,
          config: {
            systemInstruction: params.system,
            maxOutputTokens: params.maxTokens ?? 2048,
            abortSignal: abort.signal,
          },
        });
        let sent = false;
        for await (const chunk of stream) {
          const text = chunk.text;
          if (text) {
            controller.enqueue(encoder.encode(text));
            sent = true;
          }
        }
        if (!sent) {
          controller.enqueue(encoder.encode("_(I can't help with that one. Try asking another way.)_"));
        }
      } catch (err) {
        if (!abort.signal.aborted) {
          console.error("Gemini stream failed", redactSecrets(String(err)));
          controller.enqueue(encoder.encode("\n\n_(The AI service is unavailable right now. Please try again.)_"));
        }
      } finally {
        controller.close();
      }
    },
    cancel() {
      abort.abort();
    },
  });

  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
}


export async function generateJson<T extends z.ZodType>(params: { system: string; prompt: string; schema: T; maxTokens?: number }): Promise<z.infer<T> | null> {
  const result = await generateJsonFromChain({ ...params, maxTokens: params.maxTokens ?? 4096, timeoutMs: 55_000 });
  return result?.data ?? null;
}

export function badRequest(message: string) {
  return Response.json({ error: message }, { status: 400 });
}

export function missingKey() {
  return process.env.GEMINI_API_KEY
    ? null
    : Response.json({ error: "GEMINI_API_KEY is not set on the server." }, { status: 500 });
}
