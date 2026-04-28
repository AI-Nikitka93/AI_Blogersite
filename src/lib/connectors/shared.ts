const CURRENT_CHROME_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36";

const DEFAULT_HEADERS: Record<string, string> = {
  Accept: "application/json, text/plain;q=0.9, */*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9,ru;q=0.8",
  "User-Agent": CURRENT_CHROME_USER_AGENT,
  Referer: "https://miro.local/",
};

const DEFAULT_FETCH_TIMEOUT_MS = 3_000;
const DEFAULT_FETCH_BUDGET_MS = 3_400;
const MIN_FETCH_BUDGET_MS = 350;
const DEFAULT_RETRY_BACKOFF_MS = 140;
const DEFAULT_RETRY_MAX_DELAY_MS = 260;
const DEFAULT_RETRY_JITTER_MS = 120;
const DEFAULT_CIRCUIT_FAILURE_THRESHOLD = 2;
const DEFAULT_CIRCUIT_RESET_MS = 30_000;

type RetryClassifier =
  | "timeout"
  | "network"
  | "status:408"
  | "status:429"
  | "status:500"
  | "status:502"
  | "status:503"
  | "status:504";

interface CircuitBreakerConfig {
  failureThreshold?: number;
  resetAfterMs?: number;
}

interface FetchRetryOptions {
  maxRetries?: number;
  retryOn?: RetryClassifier[];
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitterMs?: number;
}

export interface FetchRuntimeOptions {
  timeoutMs?: number;
  budgetMs?: number;
  label?: string;
  circuitKey?: string;
  circuitBreaker?: CircuitBreakerConfig;
  retry?: false | FetchRetryOptions;
}

interface NormalizedFetchRuntimeOptions {
  timeoutMs: number;
  budgetMs: number;
  label?: string;
  circuitKey: string;
  circuitBreaker: Required<CircuitBreakerConfig>;
  retry: false | Required<FetchRetryOptions>;
}

interface CircuitBreakerState {
  failures: number;
  openUntil: number;
}

interface RawFetchResponse {
  body: string;
  contentType: string;
}

const circuitBreakers = new Map<string, CircuitBreakerState>();

function createTimeoutController(timeoutMs: number): {
  signal: AbortSignal;
  cancel: () => void;
} {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const cancel = () => clearTimeout(timeout);
  controller.signal.addEventListener("abort", cancel, {
    once: true,
  });

  return {
    signal: controller.signal,
    cancel,
  };
}

function createRequestSignal(
  inputSignal: AbortSignal | null | undefined,
  timeoutMs: number,
): {
  signal: AbortSignal;
  cancel: () => void;
  didTimeout: () => boolean;
} {
  const timeoutController = createTimeoutController(timeoutMs);

  if (!inputSignal) {
    return {
      signal: timeoutController.signal,
      cancel: timeoutController.cancel,
      didTimeout: () => timeoutController.signal.aborted,
    };
  }

  if (typeof AbortSignal.any === "function") {
    return {
      signal: AbortSignal.any([inputSignal, timeoutController.signal]),
      cancel: timeoutController.cancel,
      didTimeout: () =>
        timeoutController.signal.aborted && !inputSignal.aborted,
    };
  }

  const controller = new AbortController();
  const abortMergedSignal = () => controller.abort();

  if (inputSignal.aborted || timeoutController.signal.aborted) {
    controller.abort();
  } else {
    inputSignal.addEventListener("abort", abortMergedSignal, {
      once: true,
    });
    timeoutController.signal.addEventListener("abort", abortMergedSignal, {
      once: true,
    });
  }

  return {
    signal: controller.signal,
    cancel: () => {
      timeoutController.cancel();
      inputSignal.removeEventListener("abort", abortMergedSignal);
      timeoutController.signal.removeEventListener("abort", abortMergedSignal);
    },
    didTimeout: () =>
      timeoutController.signal.aborted && !inputSignal.aborted,
  };
}

export function createTimeoutSignal(timeoutMs: number): AbortSignal {
  return createTimeoutController(timeoutMs).signal;
}

function mergeHeaders(headers?: HeadersInit): Headers {
  const merged = new Headers(DEFAULT_HEADERS);
  new Headers(headers).forEach((value, key) => {
    merged.set(key, value);
  });
  return merged;
}

function inferCircuitKey(url: string, explicitKey?: string): string {
  if (explicitKey) {
    return explicitKey;
  }

  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return url;
  }
}

function normalizeRetryOptions(
  retry: FetchRuntimeOptions["retry"],
): NormalizedFetchRuntimeOptions["retry"] {
  if (retry === false) {
    return false;
  }

  return {
    maxRetries: retry?.maxRetries ?? 1,
    retryOn:
      retry?.retryOn ?? [
        "timeout",
        "network",
        "status:408",
        "status:429",
        "status:500",
        "status:502",
        "status:503",
        "status:504",
      ],
    baseDelayMs: retry?.baseDelayMs ?? DEFAULT_RETRY_BACKOFF_MS,
    maxDelayMs: retry?.maxDelayMs ?? DEFAULT_RETRY_MAX_DELAY_MS,
    jitterMs: retry?.jitterMs ?? DEFAULT_RETRY_JITTER_MS,
  };
}

function normalizeRuntimeOptions(
  url: string,
  runtime: number | FetchRuntimeOptions | undefined,
): NormalizedFetchRuntimeOptions {
  const input =
    typeof runtime === "number" ? { timeoutMs: runtime } : runtime ?? {};

  const timeoutMs = Math.max(
    MIN_FETCH_BUDGET_MS,
    input.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS,
  );
  const budgetMs = Math.max(
    timeoutMs,
    input.budgetMs ?? Math.max(timeoutMs, DEFAULT_FETCH_BUDGET_MS),
  );

  return {
    timeoutMs,
    budgetMs,
    label: input.label,
    circuitKey: inferCircuitKey(url, input.circuitKey),
    circuitBreaker: {
      failureThreshold:
        input.circuitBreaker?.failureThreshold ??
        DEFAULT_CIRCUIT_FAILURE_THRESHOLD,
      resetAfterMs:
        input.circuitBreaker?.resetAfterMs ?? DEFAULT_CIRCUIT_RESET_MS,
    },
    retry: normalizeRetryOptions(input.retry),
  };
}

function getCircuitBreakerState(key: string): CircuitBreakerState {
  const existing = circuitBreakers.get(key);
  if (existing) {
    return existing;
  }

  const initial: CircuitBreakerState = {
    failures: 0,
    openUntil: 0,
  };
  circuitBreakers.set(key, initial);
  return initial;
}

function assertCircuitClosed(
  key: string,
  cfg: Required<CircuitBreakerConfig>,
  label?: string,
): void {
  const state = getCircuitBreakerState(key);
  const now = Date.now();

  if (state.openUntil <= now) {
    state.openUntil = 0;
    if (state.failures >= cfg.failureThreshold) {
      state.failures = cfg.failureThreshold - 1;
    }
    return;
  }

  throw new Error(
    `${label ?? key} circuit is open for another ${state.openUntil - now}ms.`,
  );
}

function markCircuitSuccess(key: string): void {
  const state = getCircuitBreakerState(key);
  state.failures = 0;
  state.openUntil = 0;
}

function markCircuitFailure(
  key: string,
  cfg: Required<CircuitBreakerConfig>,
): void {
  const state = getCircuitBreakerState(key);
  state.failures += 1;

  if (state.failures >= cfg.failureThreshold) {
    state.openUntil = Date.now() + cfg.resetAfterMs;
  }
}

function classifyStatus(status: number): RetryClassifier | null {
  if (
    status === 408 ||
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  ) {
    return `status:${status}` as RetryClassifier;
  }

  return null;
}

function jitterDelay(baseMs: number, maxDelayMs: number, jitterMs: number): number {
  const noisy = baseMs + Math.floor(Math.random() * Math.max(jitterMs, 1));
  return Math.min(noisy, maxDelayMs);
}

function canRetryAfterDelay(
  startedAt: number,
  budgetMs: number,
  delayMs: number,
  nextTimeoutMs: number,
): boolean {
  const elapsed = Date.now() - startedAt;
  const remaining = budgetMs - elapsed;
  return remaining - delayMs - nextTimeoutMs >= MIN_FETCH_BUDGET_MS;
}

function shouldRetryAttempt(input: {
  attempt: number;
  retry: NormalizedFetchRuntimeOptions["retry"];
  reason: RetryClassifier | null;
}): boolean {
  if (!input.retry || !input.reason) {
    return false;
  }

  if (input.attempt >= input.retry.maxRetries) {
    return false;
  }

  return input.retry.retryOn.includes(input.reason);
}

async function runTextRequest(
  url: string,
  init: RequestInit = {},
  runtime?: number | FetchRuntimeOptions,
): Promise<RawFetchResponse> {
  const cfg = normalizeRuntimeOptions(url, runtime);
  const startedAt = Date.now();
  let attempt = 0;
  let lastError: Error | null = null;

  while (true) {
    assertCircuitClosed(cfg.circuitKey, cfg.circuitBreaker, cfg.label);

    const elapsed = Date.now() - startedAt;
    const remainingBudget = cfg.budgetMs - elapsed;
    if (remainingBudget < MIN_FETCH_BUDGET_MS) {
      throw lastError ?? new Error(`${cfg.label ?? url} fetch budget exhausted.`);
    }

    const attemptTimeoutMs = Math.max(
      MIN_FETCH_BUDGET_MS,
      Math.min(cfg.timeoutMs, remainingBudget),
    );
    const requestSignal = createRequestSignal(init.signal, attemptTimeoutMs);

    try {
      const response = await fetch(url, {
        ...init,
        headers: mergeHeaders(init.headers),
        signal: requestSignal.signal,
        cache: "no-store",
      });

      const body = await response.text();
      const contentType = response.headers.get("content-type") ?? "";

      if (!response.ok) {
        const reason = classifyStatus(response.status);
        const error = new Error(
          `HTTP ${response.status} from ${url}: ${body.slice(0, 240)}`,
        );
        lastError = error;
        markCircuitFailure(cfg.circuitKey, cfg.circuitBreaker);

        if (
          shouldRetryAttempt({
            attempt,
            retry: cfg.retry,
            reason,
          })
        ) {
          const retryPolicy = cfg.retry;
          if (!retryPolicy) {
            throw error;
          }

          const delayMs = jitterDelay(
            retryPolicy.baseDelayMs,
            retryPolicy.maxDelayMs,
            retryPolicy.jitterMs,
          );
          if (
            canRetryAfterDelay(
              startedAt,
              cfg.budgetMs,
              delayMs,
              attemptTimeoutMs,
            )
          ) {
            attempt += 1;
            await sleep(delayMs);
            continue;
          }
        }

        throw error;
      }

      markCircuitSuccess(cfg.circuitKey);
      return { body, contentType };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const timedOut =
        requestSignal.didTimeout() || message.includes("timed out");
      const retryReason: RetryClassifier | null = timedOut ? "timeout" : "network";
      const normalizedError =
        error instanceof Error
          ? error
          : new Error(message);

      requestSignal.cancel();

      if (message.includes("HTTP ")) {
        throw normalizedError;
      }

      lastError = timedOut
        ? new Error(
            `${cfg.label ?? url} timed out after ${attemptTimeoutMs}ms.`,
          )
        : normalizedError;
      markCircuitFailure(cfg.circuitKey, cfg.circuitBreaker);

      if (
        shouldRetryAttempt({
          attempt,
          retry: cfg.retry,
          reason: retryReason,
        })
      ) {
        const retryPolicy = cfg.retry;
        if (!retryPolicy) {
          throw lastError;
        }

        const delayMs = jitterDelay(
          retryPolicy.baseDelayMs,
          retryPolicy.maxDelayMs,
          retryPolicy.jitterMs,
        );
        if (
          canRetryAfterDelay(
            startedAt,
            cfg.budgetMs,
            delayMs,
            attemptTimeoutMs,
          )
        ) {
          attempt += 1;
          await sleep(delayMs);
          continue;
        }
      }

      throw lastError;
    } finally {
      requestSignal.cancel();
    }
  }
}

export async function fetchJson<T>(
  url: string,
  init: RequestInit = {},
  runtime?: number | FetchRuntimeOptions,
): Promise<T> {
  const { body: rawText, contentType } = await runTextRequest(url, init, runtime);
  const looksLikeCloudflare =
    rawText.includes("Cloudflare Ray ID") ||
    rawText.includes("Attention Required!") ||
    rawText.includes("Please enable cookies");

  if (looksLikeCloudflare) {
    throw new Error(
      `Cloudflare or bot protection blocked ${url}. Try a different network or a browser-backed fetch.`,
    );
  }

  if (!contentType.includes("json")) {
    throw new Error(
      `Expected JSON from ${url}, received content-type "${contentType}" with body: ${rawText.slice(0, 240)}`,
    );
  }

  try {
    return JSON.parse(rawText) as T;
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "unknown parse error";
    throw new Error(`Failed to parse JSON from ${url}: ${reason}`);
  }
}

export async function fetchText(
  url: string,
  init: RequestInit = {},
  runtime?: number | FetchRuntimeOptions,
): Promise<{ body: string; contentType: string }> {
  return runTextRequest(url, init, runtime);
}

export function round(value: number, digits = 2): number {
  return Number(value.toFixed(digits));
}

export function formatSignedPercent(value: number, digits = 2): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

export function formatSignedDelta(value: number, digits = 4): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}`;
}

export function isNearlyZero(value: number, threshold = 0.005): boolean {
  return Math.abs(value) < threshold;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function uniqueFacts(facts: string[], maxFacts = 4): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const fact of facts) {
    const normalized = fact.trim();
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    deduped.push(normalized);

    if (deduped.length >= maxFacts) {
      break;
    }
  }

  return deduped;
}

export function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (Array.isArray(value)) {
    return value;
  }

  return value === null || value === undefined ? [] : [value];
}

export function readXmlString(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (Array.isArray(value)) {
    return value.map((item) => readXmlString(item)).find(Boolean) ?? "";
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const prioritizedKeys = [
      "#text",
      "__cdata",
      "title",
      "description",
      "summary",
      "content",
      "content:encoded",
      "link",
      "href",
    ];

    for (const key of prioritizedKeys) {
      const nested = readXmlString(record[key]);
      if (nested) {
        return nested;
      }
    }
  }

  return "";
}

export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => {
      const parsed = Number(code);
      return Number.isFinite(parsed) ? String.fromCodePoint(parsed) : "";
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => {
      const parsed = Number.parseInt(code, 16);
      return Number.isFinite(parsed) ? String.fromCodePoint(parsed) : "";
    })
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function truncateText(text: string, maxLength = 220): string {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

export function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => {
      const parsed = Number(code);
      return Number.isFinite(parsed) ? String.fromCodePoint(parsed) : "";
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => {
      const parsed = Number.parseInt(code, 16);
      return Number.isFinite(parsed) ? String.fromCodePoint(parsed) : "";
    })
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeFilterText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

export function includesBlockedKeyword(
  value: string,
  keywords: readonly string[] | undefined,
): boolean {
  if (!keywords || keywords.length === 0) {
    return false;
  }

  const normalized = normalizeFilterText(value);
  return keywords.some((keyword) =>
    normalized.includes(normalizeFilterText(keyword)),
  );
}

export function sanitizeNewsText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
