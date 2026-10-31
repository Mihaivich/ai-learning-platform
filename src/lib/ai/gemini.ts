import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { redactSecrets } from "@/lib/supabase/server";

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
 * The schema as Gemini accepts it. Gemini supports a subset of JSON Schema: the
 * meta-schema URL isn't part of it, and array counts (minItems, maxItems) in a
 * large schema make it reject the request. Counts stay enforced, because the
 * answer is still parsed with the full zod schema.
 */
export function toGeminiSchema(schema: z.ZodType): Record<string, unknown> {
  const strip = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(strip);
    if (!value || typeof value !== "object") return value;
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => key !== "$schema" && key !== "minItems" && key !== "maxItems")
        .map(([key, item]) => [key, strip(item)]),
    );
  };
  return strip(z.toJSONSchema(schema)) as Record<string, unknown>;
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
  const jsonSchema = toGeminiSchema(request.schema);

  for (const model of models) {
    if ((cooldownUntil.get(model) ?? 0) > now()) continue;
    try {
      const text = await call(model, { ...request, jsonSchema }, AbortSignal.timeout(request.timeoutMs ?? DEFAULT_TIMEOUT_MS));
      const parsed = request.schema.safeParse(JSON.parse(text ?? ""));
      if (parsed.success) return { data: parsed.data, model };
      const issues = parsed.error.issues.slice(0, 3).map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`);
      console.warn(`Gemini ${model} returned JSON that does not match the schema: ${issues.join("; ")}`);
    } catch (error) {
      const rest = rateLimitCooldown(error, now());
      if (rest !== null) cooldownUntil.set(model, now() + rest);
      const reason = error instanceof Error ? error.message : String(error);
      console.warn(`Gemini ${model} ${rest !== null ? "is rate limited" : "failed"}: ${redactSecrets(reason).slice(0, 300)}`);
    }
  }
  return null;
}
