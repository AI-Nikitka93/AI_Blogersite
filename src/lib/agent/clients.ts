import Groq from "groq-sdk";

import type {
  GroqChatClientLike,
  MiroChatClientLike,
  MiroLlmProvider,
} from "./types";

const DEFAULT_NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";
const DEFAULT_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

type CreateMiroChatClientOptions = {
  provider?: MiroLlmProvider;
  apiKey?: string;
  baseUrl?: string;
  chatClient?: MiroChatClientLike;
  groqClient?: GroqChatClientLike;
  preserveReasoning?: boolean;
};

function trimEnv(name: string): string | undefined {
  const value = process?.env?.[name]?.trim();
  return value ? value : undefined;
}

function classifyApiKey(
  apiKey: string | undefined,
): MiroLlmProvider | "unknown" | "missing" {
  const normalized = apiKey?.trim();

  if (!normalized) {
    return "missing";
  }

  if (normalized.startsWith("gsk_")) {
    return "groq";
  }

  if (
    normalized.startsWith("nvapi-") ||
    normalized.startsWith("nv-")
  ) {
    return "nvidia";
  }

  if (
    normalized.startsWith("sk-or-") ||
    normalized.startsWith("sk-or-v1-") ||
    normalized.startsWith("or-")
  ) {
    return "openrouter";
  }

  return "unknown";
}

function normalizeProvider(value: string | undefined): MiroLlmProvider {
  return value === "nvidia"
    ? "nvidia"
    : value === "openrouter"
      ? "openrouter"
      : "groq";
}

function normalizeAssistantContent(content: unknown): string | null {
  if (typeof content === "string") {
    return content;
  }

  if (!Array.isArray(content)) {
    return null;
  }

  const textParts = content
    .map((part) => {
      if (typeof part === "string") {
        return part;
      }

      if (
        part &&
        typeof part === "object" &&
        "text" in part &&
        typeof part.text === "string"
      ) {
        return part.text;
      }

      return null;
    })
    .filter((part): part is string => Boolean(part));

  return textParts.length > 0 ? textParts.join("\n") : null;
}

class NvidiaChatClient implements MiroChatClientLike {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(options: { apiKey: string; baseUrl: string }) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
  }

  chat = {
    completions: {
      create: async (params: Record<string, unknown>) => {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(params),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(
            `NVIDIA API request failed (${response.status} ${response.statusText}): ${errorBody}`,
          );
        }

        const data = (await response.json()) as {
          choices?: Array<{
            message?: {
              content?: unknown;
            };
          }>;
        };

        return {
          choices: Array.isArray(data.choices)
            ? data.choices.map((choice) => ({
                message: {
                  content: normalizeAssistantContent(choice.message?.content),
                },
              }))
            : [],
        };
      },
    },
  };
}

class OpenRouterChatClient implements MiroChatClientLike {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly preserveReasoning: boolean;

  constructor(options: { apiKey: string; baseUrl: string; preserveReasoning: boolean }) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.preserveReasoning = options.preserveReasoning;
  }

  chat = {
    completions: {
      create: async (params: Record<string, unknown>) => {
        const existingReasoning =
          params.reasoning && typeof params.reasoning === "object"
            ? (params.reasoning as Record<string, unknown>)
            : {};

        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...params,
            ...(this.preserveReasoning
              ? {}
              : {
                  reasoning: {
                    effort: "none",
                    exclude: true,
                    ...existingReasoning,
                  },
                }),
          }),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(
            `OpenRouter API request failed (${response.status} ${response.statusText}): ${errorBody}`,
          );
        }

        const data = (await response.json()) as {
          choices?: Array<{
            message?: {
              content?: unknown;
            };
          }>;
        };

        return {
          choices: Array.isArray(data.choices)
            ? data.choices.map((choice) => ({
                message: {
                  content: normalizeAssistantContent(choice.message?.content),
                },
              }))
            : [],
        };
      },
    },
  };
}

export function resolveMiroLlmProvider(
  explicitProvider?: MiroLlmProvider,
): MiroLlmProvider {
  const requestedProvider =
    explicitProvider ?? normalizeProvider(process?.env?.MIRO_LLM_PROVIDER);
  const groqKey = trimEnv("GROQ_API_KEY");
  const nvidiaKey = trimEnv("NVIDIA_API_KEY");
  const openrouterKey = trimEnv("OPENROUTER_API_KEY");

  if (requestedProvider === "openrouter") {
    const keyKind = classifyApiKey(openrouterKey);

    if (keyKind === "openrouter" || keyKind === "unknown") {
      return "openrouter";
    }

    if (groqKey) {
      return "groq";
    }

    if (nvidiaKey) {
      return "nvidia";
    }
  }

  if (requestedProvider === "groq") {
    const keyKind = classifyApiKey(groqKey);

    if (keyKind === "groq" || keyKind === "unknown") {
      return "groq";
    }

    if (openrouterKey) {
      return "openrouter";
    }

    if (nvidiaKey) {
      return "nvidia";
    }
  }

  if (requestedProvider === "nvidia") {
    const keyKind = classifyApiKey(nvidiaKey);

    if (keyKind === "nvidia" || keyKind === "unknown") {
      return "nvidia";
    }

    if (openrouterKey) {
      return "openrouter";
    }

    if (groqKey) {
      return "groq";
    }
  }

  return requestedProvider;
}

export function createMiroChatClient(
  options: CreateMiroChatClientOptions = {},
): MiroChatClientLike {
  const reusedClient = options.chatClient ?? options.groqClient;
  if (reusedClient) {
    return reusedClient;
  }

  const provider = resolveMiroLlmProvider(options.provider);

  if (provider === "nvidia") {
    const apiKey = options.apiKey ?? trimEnv("NVIDIA_API_KEY");
    if (!apiKey) {
      throw new Error("NVIDIA_API_KEY is required to run MiroAgent with NVIDIA.");
    }

    return new NvidiaChatClient({
      apiKey,
      baseUrl:
        options.baseUrl ??
        process?.env?.NVIDIA_BASE_URL ??
        DEFAULT_NVIDIA_BASE_URL,
    });
  }

  if (provider === "openrouter") {
    const apiKey =
      options.apiKey ??
      trimEnv("OPENROUTER_API_KEY");
    if (!apiKey) {
      throw new Error(
        "OPENROUTER_API_KEY is required to run MiroAgent with OpenRouter.",
      );
    }

    return new OpenRouterChatClient({
      apiKey,
      baseUrl:
        options.baseUrl ??
        process?.env?.OPENROUTER_BASE_URL ??
        DEFAULT_OPENROUTER_BASE_URL,
      preserveReasoning: Boolean(options.preserveReasoning),
    });
  }

  const apiKey = options.apiKey ?? process?.env?.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is required to run MiroAgent with Groq.");
  }

  return new Groq({ apiKey }) as unknown as MiroChatClientLike;
}
