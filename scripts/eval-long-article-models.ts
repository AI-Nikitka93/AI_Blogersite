import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { createMiroChatClient } from "../src/lib/agent/clients";
import { parseJsonObject } from "../src/lib/agent/parsing";

type Provider = "groq" | "nvidia" | "openrouter";

type Candidate = {
  provider: Provider;
  model: string;
  reasoningEffort?: "low" | "medium" | "high";
  timeoutMs: number;
  maxTokens: number;
};

type LongArticleResult = {
  title: string;
  thesis: string;
  article: string;
  takeaway: string;
};

type EvalResult = {
  provider: Provider;
  model: string;
  status: "success" | "failed";
  latencyMs: number;
  parseOk: boolean;
  title?: string;
  articleWords?: number;
  articleChars?: number;
  paragraphCount?: number;
  russianRatio?: number;
  bannedHits?: string[];
  preview?: string;
  error?: string;
};

const TEST_FACTS = [
  "На 29 апреля 2026 года live-каталог OpenRouter models API показывает 32 бесплатные модели.",
  "В текущем каталоге больше не подтверждается модель deepseek/deepseek-r1-0528:free, хотя более ранние списки рекомендовали её как лучший бесплатный reasoning-вариант.",
  "В live-проверке OpenRouter по-прежнему видны qwen/qwen3-next-80b-a3b-instruct:free, z-ai/glm-4.5-air:free, minimax/minimax-m2.5:free и google/gemma-4-31b-it:free.",
  "В live-smoke openrouter/free был маршрутизирован на poolside/laguna-m.1-20260312:free и завершился с finish_reason=length и content=null.",
  "NVIDIA openai/gpt-oss-20b в live-проверке вернул завершённый JSON после включения reasoning_effort=low.",
  "NVIDIA minimaxai/minimax-m2.7 в live-smoke показал длинный reasoning-trace и потребовал строгой защиты парсера от ложного JSON внутри размышлений.",
  "Groq остаётся быстрым слоем для вспомогательных ролей и держит живые модели вроде openai/gpt-oss-120b и llama-3.3-70b-versatile.",
  "Требование продукта: основной writer должен писать по-русски, глубже обычного AI-summary, без шаблонной аналитической жвачки и без пустого пафоса.",
] as const;

const SYSTEM_PROMPT = `Ты пишешь большую русскоязычную аналитическую статью.

Верни только JSON с ключами:
- title
- thesis
- article
- takeaway

Жёсткие правила:
- article должен быть большой: 7-9 абзацев и примерно 700-1100 русских слов.
- Никаких списков, markdown, заголовков внутри article, буллетов и служебных пояснений.
- Это должна быть именно статья, а не набор заметок.
- Статья должна быть конкретной, напряжённой и наблюдательной.
- Не пиши как пресс-релиз, не пиши как скучный рыночный обзор, не пиши как helpful assistant.
- Не используй фразы: "важно отметить", "в современном мире", "таким образом", "эта новость показывает", "в более широком контексте".
- Не выдумывай фактов вне входного пакета.
- Пиши естественным русским языком.
- thesis и takeaway — по одному плотному предложению.
- Верни только один валидный JSON-объект.`;

const USER_PROMPT = JSON.stringify(
  {
    task: "Напиши большую аналитическую статью о том, почему рынок бесплатных reasoning-моделей весной 2026 года нельзя выбирать по старым спискам и почему реальные live-проверки важнее красивых каталогов.",
    target_language: "ru",
    required_angle:
      "Покажи конфликт между красивой таблицей бесплатных моделей и реальным operational quality на живых API.",
    facts: TEST_FACTS,
  },
  null,
  2,
);

const CANDIDATES: Candidate[] = [
  {
    provider: "groq",
    model: "openai/gpt-oss-120b",
    reasoningEffort: "low",
    timeoutMs: 60_000,
    maxTokens: 1_800,
  },
  {
    provider: "groq",
    model: "llama-3.3-70b-versatile",
    timeoutMs: 60_000,
    maxTokens: 1_800,
  },
  {
    provider: "nvidia",
    model: "openai/gpt-oss-20b",
    reasoningEffort: "low",
    timeoutMs: 60_000,
    maxTokens: 1_800,
  },
  {
    provider: "nvidia",
    model: "minimaxai/minimax-m2.7",
    timeoutMs: 60_000,
    maxTokens: 1_800,
  },
  {
    provider: "openrouter",
    model: "qwen/qwen3-next-80b-a3b-instruct:free",
    timeoutMs: 60_000,
    maxTokens: 1_800,
  },
  {
    provider: "openrouter",
    model: "z-ai/glm-4.5-air:free",
    timeoutMs: 60_000,
    maxTokens: 1_800,
  },
  {
    provider: "openrouter",
    model: "google/gemma-4-31b-it:free",
    timeoutMs: 60_000,
    maxTokens: 1_800,
  },
];

const BANNED_PATTERNS = [
  "важно отметить",
  "в современном мире",
  "таким образом",
  "эта новость показывает",
  "в более широком контексте",
] as const;

function countWords(value: string): number {
  return value
    .trim()
    .split(/\s+/u)
    .filter(Boolean).length;
}

function countParagraphs(value: string): number {
  return value
    .split(/\n\s*\n/gu)
    .map((item) => item.trim())
    .filter(Boolean).length;
}

function estimateRussianRatio(value: string): number {
  const letters = value.match(/\p{L}/gu) ?? [];
  if (letters.length === 0) {
    return 0;
  }

  const cyrillic = value.match(/[А-Яа-яЁё]/gu) ?? [];
  return Number((cyrillic.length / letters.length).toFixed(3));
}

function findBannedHits(value: string): string[] {
  const normalized = value.toLowerCase();
  return BANNED_PATTERNS.filter((pattern) => normalized.includes(pattern));
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} exceeded ${timeoutMs}ms`)), timeoutMs);
    }),
  ]);
}

async function runCandidate(candidate: Candidate): Promise<EvalResult> {
  const client = createMiroChatClient({
    provider: candidate.provider,
  });
  const startedAt = Date.now();

  try {
    const completion = await withTimeout(
      client.chat.completions.create({
        model: candidate.model,
        temperature: 0.45,
        top_p: 0.9,
        max_tokens: candidate.maxTokens,
        response_format: {
          type: "json_object",
        },
        ...(candidate.reasoningEffort
          ? { reasoning_effort: candidate.reasoningEffort }
          : {}),
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: USER_PROMPT,
          },
        ],
      }),
      candidate.timeoutMs,
      `${candidate.provider}:${candidate.model}`,
    );

    const raw = completion.choices?.[0]?.message?.content ?? "";
    const parsed = parseJsonObject<LongArticleResult>(
      raw,
      `${candidate.provider}:${candidate.model}`,
    );
    const article = parsed.article.trim();
    const allText = [parsed.title, parsed.thesis, article, parsed.takeaway].join(" ");

    return {
      provider: candidate.provider,
      model: candidate.model,
      status: "success",
      latencyMs: Date.now() - startedAt,
      parseOk: true,
      title: parsed.title,
      articleWords: countWords(article),
      articleChars: article.length,
      paragraphCount: countParagraphs(article),
      russianRatio: estimateRussianRatio(allText),
      bannedHits: findBannedHits(allText),
      preview: article.slice(0, 600),
    };
  } catch (error) {
    return {
      provider: candidate.provider,
      model: candidate.model,
      status: "failed",
      latencyMs: Date.now() - startedAt,
      parseOk: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main(): Promise<void> {
  const results: EvalResult[] = [];

  for (const candidate of CANDIDATES) {
    results.push(await runCandidate(candidate));
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    prompt: {
      system: SYSTEM_PROMPT,
      user: JSON.parse(USER_PROMPT),
    },
    results,
  };

  mkdirSync(join(process.cwd(), "artifacts"), { recursive: true });
  const outputPath = join(
    process.cwd(),
    "artifacts",
    "long-article-model-eval-2026-04-29.json",
  );
  writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(payload, null, 2));
}

await main();
