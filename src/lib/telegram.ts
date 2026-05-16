import type { MiroPost } from "./agent";
import { MARKET_ADVICE_COPY_PATTERNS } from "./public-post-quality";

const TELEGRAM_PRIMARY_TEASER_MAX_LENGTH = 420;
const TELEGRAM_FALLBACK_TEASER_MAX_LENGTH = 800;
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
    .replace(/>/g, "&gt;");
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

  if (looksLikeLegacyTelegramTemplate(normalized)) {
    return null;
  }

  if (TELEGRAM_BAD_COPY_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return null;
  }

  if (
    post.category === "Markets" &&
    MARKET_ADVICE_COPY_PATTERNS.some((pattern) => pattern.test(normalized))
  ) {
    return null;
  }

  return clampText(normalized, TELEGRAM_PRIMARY_TEASER_MAX_LENGTH);
}

function buildDerivedTelegramTeaser(post: MiroPost): string {
  const paragraphs = splitParagraphs(post.inferred);
  const lines = buildDistinctTelegramLines([
    post.opinion,
    paragraphs[0],
    paragraphs[1],
    post.hypothesis,
    post.cross_signal,
    firstSentence(post.inferred),
  ]);

  if (lines.length === 0) {
    return clampText(
      normalizeWhitespace(post.opinion || firstSentence(post.inferred)),
      TELEGRAM_FALLBACK_TEASER_MAX_LENGTH,
    );
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
