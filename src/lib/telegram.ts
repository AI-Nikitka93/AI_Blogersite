import type { MiroPost } from "./agent";
import { MARKET_ADVICE_COPY_PATTERNS } from "./public-post-quality";

const TELEGRAM_PRIMARY_TEASER_MAX_LENGTH = 420;
const TELEGRAM_FALLBACK_TEASER_MAX_LENGTH = 520;
const TELEGRAM_PUBLIC_URL_CHECK_TIMEOUT_MS = 5_000;
const TELEGRAM_LINK_LABEL = "Открыть разбор";
const LEGACY_TELEGRAM_LABEL_FRAGMENTS = [
  "что случилось",
  "личное мнение миро",
  "мнение миро",
  "что дальше",
  "источник:",
] as const;
const TELEGRAM_TRAILING_CTA_PATTERNS = [
  /полная\s+(?:мысль|запись|версия|статья)\s*[—-]\s*на\s+сайте\.?$/iu,
  /на\s+сайте\s*[—-]\s*почему[^.?!]*[.?!]?$/iu,
  /читайте?\s+на\s+сайте\.?$/iu,
  /подробности\s+на\s+сайте\.?$/iu,
  /открыть\s+запись\.?$/iu,
] as const;
const TELEGRAM_BAD_COPY_PATTERNS = [
  /полная\s+(?:мысль|запись|версия|статья)/iu,
  /(?:читайте?|подробности)\s+на\s+сайте/iu,
  /на\s+сайте\s*[—-]\s*почему/iu,
  /вышла\s+новая\s+(?:заметка|статья)/iu,
  /сегодня\s+в\s+канале/iu,
  /мы\s+опубликовали/iu,
] as const;
const TELEGRAM_BORING_COPY_PATTERNS = [
  /в\s+фактах\s+появил[ао]?с[ья]\s+проверяем\w*\s+детал/iu,
  /сильнее\s+всего\s+здесь\s+работает\s+детал/iu,
  /такой\s+факт\s+важен/iu,
  /в\s+ленте\s+это\s+держится/iu,
  /в\s+канале\s+это\s+держится/iu,
  /важн[ао]\s+не\s+громкост[ьи]\s+анонса/iu,
  /проверяем\w*\s+детал\w*\s+важнее\s+самого\s+анонса/iu,
] as const;

type TelegramPublishStatus = "sent" | "disabled" | "skipped" | "failed";

export interface TelegramPublishResult {
  status: TelegramPublishStatus;
  messageId?: number;
  channel?: string;
  reason?: string;
  postUrl?: string;
}

interface TelegramPublishOptions {
  post: MiroPost;
  postId: string;
  requestUrl: string;
}

interface TelegramSendResponse {
  ok: boolean;
  result?: {
    message_id: number;
  };
  description?: string;
}

function trimEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function escapeTelegramHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function clampText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  const trimmed = value.slice(0, maxLength).trimEnd();
  const lastSpace = trimmed.lastIndexOf(" ");
  const safeTrim = lastSpace > Math.floor(maxLength * 0.55)
    ? trimmed.slice(0, lastSpace)
    : trimmed;

  return `${safeTrim.trimEnd()}…`;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function firstSentence(value: string): string {
  const match = value.match(/[^.!?]+[.!?]/u)?.[0];
  return normalizeWhitespace(match ?? value);
}

function splitParagraphs(value: string): string[] {
  return value
    .split(/\n\s*\n/u)
    .map((paragraph) => normalizeWhitespace(paragraph))
    .filter(Boolean);
}

function normalizeForComparison(value: string): string {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[.!?,:;()"«»„“”'`-]/g, "")
    .trim();
}

function hasCyrillic(value: string): boolean {
  return /[А-Яа-яЁёІіЎў]/u.test(value);
}

function cleanObservedTelegramHook(value: string): string {
  return normalizeWhitespace(value)
    .replace(/^Источник\s+фиксирует:\s*/iu, "")
    .replace(/^Еще\s+одна\s+деталь\s+источника:\s*/iu, "")
    .replace(/^Факт:\s*/iu, "")
    .trim();
}

function containsBadTelegramCopy(value: string, post: MiroPost): boolean {
  return (
    looksLikeLegacyTelegramTemplate(value) ||
    TELEGRAM_BAD_COPY_PATTERNS.some((pattern) => pattern.test(value)) ||
    TELEGRAM_BORING_COPY_PATTERNS.some((pattern) => pattern.test(value)) ||
    (post.category === "Markets" &&
      MARKET_ADVICE_COPY_PATTERNS.some((pattern) => pattern.test(value)))
  );
}

function isUsableTelegramLine(value: string, post: MiroPost): boolean {
  const normalized = stripTrailingTelegramCta(value);
  if (!normalized || !hasCyrillic(normalized)) {
    return false;
  }

  return !containsBadTelegramCopy(normalized, post);
}

function buildObservedTelegramHook(post: MiroPost): string | null {
  for (const fact of post.observed) {
    const hook = cleanObservedTelegramHook(fact);
    if (!isUsableTelegramLine(hook, post)) {
      continue;
    }

    return clampText(hook, 260);
  }

  return null;
}

function buildTelegramPressureLine(
  post: MiroPost,
  hook: string | null,
): string | null {
  const hookKey = normalizeForComparison(hook ?? "");
  const candidates = [post.opinion, post.cross_signal, post.hypothesis];

  for (const candidate of candidates) {
    const line = stripTrailingTelegramCta(candidate ?? "");
    if (!isUsableTelegramLine(line, post)) {
      continue;
    }

    const lineKey = normalizeForComparison(line);
    if (!lineKey || lineKey === hookKey) {
      continue;
    }

    return clampText(line, 240);
  }

  return null;
}

function buildDistinctTelegramLines(candidates: Array<string | null | undefined>): string[] {
  const lines: string[] = [];
  const seen = new Set<string>();

  for (const candidate of candidates) {
    const normalized = normalizeWhitespace(candidate ?? "");
    if (!normalized) {
      continue;
    }

    const comparisonKey = normalizeForComparison(normalized);
    if (!comparisonKey || seen.has(comparisonKey)) {
      continue;
    }

    seen.add(comparisonKey);
    lines.push(normalized);

    if (lines.length >= 2) {
      break;
    }
  }

  return lines;
}

function stripTrailingTelegramCta(value: string): string {
  let normalized = normalizeWhitespace(value);

  for (const pattern of TELEGRAM_TRAILING_CTA_PATTERNS) {
    normalized = normalized.replace(pattern, "").trim();
  }

  return normalized;
}

function looksLikeLegacyTelegramTemplate(value: string): boolean {
  const normalized = normalizeWhitespace(value).toLowerCase();

  return LEGACY_TELEGRAM_LABEL_FRAGMENTS.some((fragment) =>
    normalized.includes(fragment),
  );
}

function buildTelegramTeaser(post: MiroPost): string | null {
  const candidate = post.telegram_text ?? "";
  const normalized = stripTrailingTelegramCta(candidate);

  if (!candidate || !normalized) {
    return null;
  }

  if (!isUsableTelegramLine(normalized, post)) {
    return null;
  }

  return clampText(normalized, TELEGRAM_PRIMARY_TEASER_MAX_LENGTH);
}

function buildDerivedTelegramTeaser(post: MiroPost): string {
  const paragraphs = splitParagraphs(post.inferred);
  const hook = buildObservedTelegramHook(post);
  const pressure = buildTelegramPressureLine(post, hook);
  const secondaryObserved = post.observed[1]
    ? cleanObservedTelegramHook(post.observed[1])
    : null;
  const inferredOpener = firstSentence(paragraphs[0] ?? post.inferred);
  const lines = buildDistinctTelegramLines([
    hook,
    pressure,
    secondaryObserved && isUsableTelegramLine(secondaryObserved, post)
      ? secondaryObserved
      : null,
    isUsableTelegramLine(inferredOpener, post) ? inferredOpener : null,
    post.hypothesis && isUsableTelegramLine(post.hypothesis, post)
      ? post.hypothesis
      : null,
  ]);

  if (lines.length === 0) {
    const fallback = [post.title, post.source]
      .map((part) => normalizeWhitespace(part))
      .filter(Boolean)
      .join(". ");

    return clampText(fallback, TELEGRAM_FALLBACK_TEASER_MAX_LENGTH);
  }

  return clampText(lines.join("\n\n"), TELEGRAM_FALLBACK_TEASER_MAX_LENGTH);
}

function buildTelegramTrustLine(post: MiroPost): string | null {
  const source = normalizeWhitespace(post.source);
  if (!source) {
    return post.category === "Markets" ? "Не торговый совет." : null;
  }

  const sourceLine = `Опора: ${escapeTelegramHtml(clampText(source, 80))}.`;
  return post.category === "Markets"
    ? `${sourceLine} Не торговый совет.`
    : sourceLine;
}

function getTelegramTarget(): string | undefined {
  const chatId = trimEnv("TELEGRAM_CHAT_ID");
  if (chatId) {
    return chatId;
  }

  const channelId = trimEnv("TELEGRAM_CHANNEL_ID");
  if (channelId) {
    return channelId;
  }

  const username = trimEnv("TELEGRAM_CHANNEL_USERNAME");
  if (!username) {
    return undefined;
  }

  return username.startsWith("@") ? username : `@${username}`;
}

function buildPublicPostUrl(requestUrl: string, postId: string): string {
  const explicitSiteUrl =
    trimEnv("MIRO_SITE_URL") ?? trimEnv("NEXT_PUBLIC_SITE_URL");

  const url = explicitSiteUrl
    ? new URL(`/post/${postId}`, explicitSiteUrl)
    : (() => {
        const request = new URL(requestUrl);
        const hostname = request.hostname.toLowerCase();
        if (
          hostname === "localhost" ||
          hostname === "127.0.0.1" ||
          hostname === "::1"
        ) {
          throw new Error(
            "Telegram publish skipped: set MIRO_SITE_URL when running from localhost.",
          );
        }

        return new URL(`/post/${postId}`, request.origin);
      })();

  url.searchParams.set("utm_source", "telegram");
  url.searchParams.set("utm_medium", "channel");
  url.searchParams.set("utm_campaign", "miro_signals");

  return url.toString();
}

export function buildTelegramPostText(
  post: MiroPost,
  postUrl: string,
): string {
  const teaser = buildTelegramTeaser(post) ?? buildDerivedTelegramTeaser(post);
  const trustLine = buildTelegramTrustLine(post);

  return [
    escapeTelegramHtml(teaser),
    trustLine,
    `<a href="${escapeTelegramHtml(postUrl)}">${TELEGRAM_LINK_LABEL}</a>`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

async function sendTelegramMessage(
  token: string,
  target: string,
  text: string,
): Promise<TelegramSendResponse> {
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      chat_id: target,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });

  const body = (await response.json()) as TelegramSendResponse;
  if (!response.ok) {
    return {
      ...body,
      ok: false,
      description:
        body.description ??
        `Telegram sendMessage failed with status ${response.status}.`,
    };
  }

  return body;
}

async function getPublicPostUrlBlockReason(postUrl: string): Promise<string | null> {
  let response: Response;

  try {
    response = await fetch(postUrl, {
      method: "GET",
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.timeout(TELEGRAM_PUBLIC_URL_CHECK_TIMEOUT_MS),
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown error";
    return `Telegram publish skipped: public post URL could not be verified before send (${reason}).`;
  }

  if (!response.ok) {
    return `Telegram publish skipped: public post URL returned HTTP ${response.status} before send.`;
  }

  return null;
}

export async function publishPostToTelegram(
  options: TelegramPublishOptions,
): Promise<TelegramPublishResult> {
  const token = trimEnv("TELEGRAM_BOT_TOKEN");
  const target = getTelegramTarget();

  if (!token || !target) {
    return {
      status: "disabled",
      reason:
        "Telegram publishing is not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID, or TELEGRAM_CHANNEL_ID, or TELEGRAM_CHANNEL_USERNAME.",
    };
  }

  let postUrl: string;

  try {
    postUrl = buildPublicPostUrl(options.requestUrl, options.postId);
  } catch (error) {
    return {
      status: "skipped",
      reason: error instanceof Error ? error.message : "Failed to build public post URL.",
    };
  }

  const publicUrlBlockReason = await getPublicPostUrlBlockReason(postUrl);
  if (publicUrlBlockReason) {
    return {
      status: "skipped",
      channel: target,
      postUrl,
      reason: publicUrlBlockReason,
    };
  }

  let body: TelegramSendResponse;

  try {
    console.log("[Telegram] Sending message", {
      target,
      post_id: options.postId,
      has_token: Boolean(token),
    });
    body = await sendTelegramMessage(
      token,
      target,
      buildTelegramPostText(options.post, postUrl),
    );
  } catch (error) {
    console.error("Telegram publish failed:", error);
    return {
      status: "failed",
      channel: target,
      postUrl,
      reason:
        error instanceof Error
          ? error.message
          : "Telegram sendMessage request failed.",
    };
  }

  if (!body.ok || !body.result?.message_id) {
    console.error("Telegram publish failed:", body.description);
    return {
      status: "failed",
      channel: target,
      postUrl,
      reason:
        body.description ?? "Telegram sendMessage did not return a message id.",
    };
  }

  console.log("[Telegram] Message sent", {
    target,
    post_id: options.postId,
    message_id: body.result.message_id,
  });

  return {
    status: "sent",
    channel: target,
    postUrl,
    messageId: body.result.message_id,
  };
}
