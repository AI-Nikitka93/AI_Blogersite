import type { MiroPost } from "./agent";

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
    .split(/\n\s*\n/g)
    .map((paragraph) => normalizeWhitespace(paragraph))
    .filter(Boolean);
}

function buildLead(post: MiroPost): string {
  const observed = post.observed[0];
  if (observed) {
    return clampText(normalizeWhitespace(observed), 160);
  }

  return clampText(firstSentence(post.inferred), 160);
}

function buildReflection(post: MiroPost): string | null {
  const articleParagraphs = splitParagraphs(post.inferred);
  const candidate =
    post.hypothesis ||
    post.cross_signal ||
    articleParagraphs[1] ||
    articleParagraphs[0] ||
    "";
  const normalized = normalizeWhitespace(firstSentence(candidate));

  if (!candidate || !normalized) {
    return null;
  }

  const lead = buildLead(post).replace(/…$/, "");
  if (normalized.startsWith(lead)) {
    return null;
  }

  return clampText(normalized, 180);
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
  const lead = escapeTelegramHtml(buildLead(post));
  const reflection = buildReflection(post);
  const escapedReflection = reflection
    ? escapeTelegramHtml(reflection)
    : null;

  const parts = [
    `<b>${escapeTelegramHtml(post.title)}</b>`,
    lead,
  ];

  if (escapedReflection) {
    parts.push(escapedReflection);
  }

  parts.push(
    `<a href="${escapeTelegramHtml(postUrl)}">Больше мыслей на сайте</a>`,
  );

  return parts.join("\n\n");
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
