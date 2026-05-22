import assert from "node:assert/strict";

import { buildTelegramPostText, publishPostToTelegram } from "./telegram";
import type { MiroPost } from "./agent";

function buildPost(overrides: Partial<MiroPost>): MiroPost {
  return {
    title: "Amazon ускорила LLM без потери точности",
    source: "Amazon Science",
    observed: [
      "Amazon Science описала scaling law, который помогает выбирать LLM-архитектуры с ростом throughput до 47% без потери accuracy.",
    ],
    inferred:
      "Amazon Science описала scaling law, который помогает выбирать LLM-архитектуры с ростом throughput до 47% без потери accuracy.\n\nГлавная деталь в том, что скорость теперь можно считать вместе с качеством архитектуры.\n\nЭто не доказывает новый стандарт для всех моделей, но дает проверяемую рамку для выбора.\n\nСледующая проверка в том, начнут ли команды применять этот компромисс до дорогих прогонов.",
    opinion:
      "Сухая формула здесь важна потому, что она снижает цену эксперимента.",
    cross_signal:
      "Ускорение ценно только там, где не приходится платить потерей точности.",
    hypothesis:
      "Следующий тест в том, появятся ли похожие проверки у других команд.",
    telegram_text:
      "Amazon не просто ускоряет LLM. Важна сама мерка: выбрать архитектуру быстрее, не теряя точность на выходе.",
    reasoning: "Факт держится на проверяемой метрике Amazon Science.",
    confidence: "medium",
    category: "Tech",
    ...overrides,
  };
}

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}

{
  const post = buildPost({
    telegram_text:
      "В фактах появилась проверяемая деталь. Сильнее всего здесь работает деталь, которая меняет скорость проверки.",
  });

  const text = buildTelegramPostText(post, "https://example.com/post/1");

  assert.equal(text.includes("В фактах появилась проверяемая деталь"), false);
  assert.equal(text.includes("Сильнее всего здесь работает деталь"), false);
  assert.equal(text.includes("Amazon Science описала scaling law"), true);
  assert.equal(text.includes("Открыть разбор"), true);
}

{
  const post = buildPost({
    category: "Markets",
    source: "Frankfurter + CoinDesk",
    observed: [
      "USD/RUB упал на -0.21 пункта по сравнению с предыдущим фиксингом и закрылся на уровне 72,98 16 мая 2026 года.",
      "USD/BYN изменился незначительно и завершил день на отметке 2,78.",
    ],
    opinion:
      "Интересна не сама таблица, а место, где соседние пары расходятся по скорости.",
    cross_signal:
      "USD/RUB уже двинулся, а USD/BYN еще держит паузу.",
    telegram_text: "",
  });

  const text = buildTelegramPostText(post, "https://example.com/post/2");

  assert.equal(text.includes("USD/RUB упал"), true);
  assert.equal(text.includes("Не торговый совет."), true);
  assert.equal(text.includes("покупать"), false);
  assert.equal(text.includes("продавать"), false);
}

{
  const post = buildPost({
    source: 'OpenAI & <Lab> "Research"',
    telegram_text:
      'Тестовая строка с <b>HTML</b> и кавычкой " внутри должна остаться текстом.',
  });

  const text = buildTelegramPostText(
    post,
    'https://example.com/post/1?next="><b>bad</b>&ok=1',
  );

  assert.equal(text.includes("<b>HTML</b>"), false);
  assert.equal(text.includes("&lt;b&gt;HTML&lt;/b&gt;"), true);
  assert.equal(text.includes("OpenAI &amp; &lt;Lab&gt; &quot;Research&quot;"), true);
  assert.equal(text.includes('href="https://example.com/post/1?next="'), false);
  assert.equal(text.includes("&quot;&gt;&lt;b&gt;bad&lt;/b&gt;&amp;ok=1"), true);
}

{
  const previousFetch = globalThis.fetch;
  const previousToken = process.env.TELEGRAM_BOT_TOKEN;
  const previousChat = process.env.TELEGRAM_CHAT_ID;
  const previousSiteUrl = process.env.MIRO_SITE_URL;
  const calls: string[] = [];

  process.env.TELEGRAM_BOT_TOKEN = "test-token";
  process.env.TELEGRAM_CHAT_ID = "@test-channel";
  process.env.MIRO_SITE_URL = "https://example.com";

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);

    if (url === "https://example.com/post/hidden?utm_source=telegram&utm_medium=channel&utm_campaign=miro_signals") {
      return new Response("not found", { status: 404 });
    }

    throw new Error(`unexpected fetch: ${url}`);
  }) as typeof fetch;

  try {
    const result = await publishPostToTelegram({
      post: buildPost({}),
      postId: "hidden",
      requestUrl: "https://ai-blogersite.vercel.app/api/cron",
    });

    assert.equal(result.status, "skipped");
    assert.match(result.reason ?? "", /public post URL returned HTTP 404/);
    assert.deepEqual(calls, [
      "https://example.com/post/hidden?utm_source=telegram&utm_medium=channel&utm_campaign=miro_signals",
    ]);
  } finally {
    globalThis.fetch = previousFetch;
    restoreEnv("TELEGRAM_BOT_TOKEN", previousToken);
    restoreEnv("TELEGRAM_CHAT_ID", previousChat);
    restoreEnv("MIRO_SITE_URL", previousSiteUrl);
  }
}

{
  const previousFetch = globalThis.fetch;
  const previousToken = process.env.TELEGRAM_BOT_TOKEN;
  const previousChat = process.env.TELEGRAM_CHAT_ID;
  const previousSiteUrl = process.env.MIRO_SITE_URL;
  const calls: string[] = [];

  process.env.TELEGRAM_BOT_TOKEN = "test-token";
  process.env.TELEGRAM_CHAT_ID = "@test-channel";
  process.env.MIRO_SITE_URL = "https://example.com";

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);

    if (url === "https://example.com/post/visible?utm_source=telegram&utm_medium=channel&utm_campaign=miro_signals") {
      return new Response("ok", { status: 200 });
    }

    if (url === "https://api.telegram.org/bottest-token/sendMessage") {
      return Response.json({
        ok: true,
        result: {
          message_id: 123,
        },
      });
    }

    throw new Error(`unexpected fetch: ${url}`);
  }) as typeof fetch;

  try {
    const result = await publishPostToTelegram({
      post: buildPost({}),
      postId: "visible",
      requestUrl: "https://ai-blogersite.vercel.app/api/cron",
    });

    assert.equal(result.status, "sent");
    assert.equal(result.messageId, 123);
    assert.deepEqual(calls, [
      "https://example.com/post/visible?utm_source=telegram&utm_medium=channel&utm_campaign=miro_signals",
      "https://api.telegram.org/bottest-token/sendMessage",
    ]);
  } finally {
    globalThis.fetch = previousFetch;
    restoreEnv("TELEGRAM_BOT_TOKEN", previousToken);
    restoreEnv("TELEGRAM_CHAT_ID", previousChat);
    restoreEnv("MIRO_SITE_URL", previousSiteUrl);
  }
}
