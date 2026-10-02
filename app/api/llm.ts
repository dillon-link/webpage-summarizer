import OpenAI from "openai";
import type { ChatCompletion } from "openai/resources/chat/completions";

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/";

export function getLLMClient(): OpenAI {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY is not set. Add it to your .env.local file.");
  }
  return new OpenAI({ baseURL: GEMINI_BASE_URL, apiKey });
}

/**
 * Sleep for a random number of milliseconds around `base` (±25%).
 */
function jitter(base: number): Promise<void> {
  const min = base * 0.75;
  const max = base * 1.25;
  return new Promise((r) => setTimeout(r, Math.floor(min + Math.random() * (max - min))));
}

/**
 * Read the upstream's Retry-After header. OpenAI SDK surfaces it on the error.
 * Returns milliseconds, or null if not present / not numeric.
 */
function retryAfterMs(err: unknown): number | null {
  const e = err as { headers?: Headers; error?: { error?: { details?: unknown[] } } };
  const header =
    e.headers?.get?.("retry-after") ??
    e.headers?.get?.("Retry-After") ??
    null;
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds) && seconds > 0) {
      return Math.max(250, seconds * 1000);
    }
    // RFC 7231 HTTP-date form
    const date = Date.parse(header);
    if (!Number.isNaN(date)) {
      return Math.max(250, date - Date.now());
    }
  }
  return null;
}

export type RetryOptions = {
  /** Total attempts. Default 3. */
  attempts?: number;
  /** Base backoff in ms for the first retry. Default 750. */
  baseMs?: number;
  /** Cap on a single backoff. Default 10000. */
  maxBackoffMs?: number;
  /** Cap on total wall-clock wait time across retries, in ms. Default 8000. */
  totalBudgetMs?: number;
};

export async function callWithRetry(
  client: OpenAI,
  params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
  opts: RetryOptions = {},
): Promise<ChatCompletion> {
  const attempts = opts.attempts ?? 3;
  const baseMs = opts.baseMs ?? 750;
  const maxBackoffMs = opts.maxBackoffMs ?? 10_000;
  const totalBudgetMs = opts.totalBudgetMs ?? 8000;

  const started = Date.now();
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await client.chat.completions.create(params);
    } catch (e) {
      lastErr = e;
      const status = (e as { status?: number })?.status;

      // 429 means the project is at the rate-limit window. Retrying
      // immediately (even with the server's Retry-After) is rarely useful for
      // user-initiated requests — the user will be staring at a spinner. Fail
      // fast so the caller can surface a clear "try again shortly" message.
      if (status === 429) throw e;

      const retriable = status === 503 || (status ?? 0) >= 500;
      if (!retriable || i === attempts - 1) throw e;

      const hint = retryAfterMs(e);
      const backoff = hint ?? Math.min(maxBackoffMs, baseMs * 2 ** i);
      const remaining = totalBudgetMs - (Date.now() - started);
      if (remaining <= 0) throw e;
      await jitter(Math.min(backoff, remaining));
    }
  }
  throw lastErr;
}
