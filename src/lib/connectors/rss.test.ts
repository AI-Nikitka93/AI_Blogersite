import assert from "node:assert/strict";

import { fetchRssFacts, summarizeRssDescriptionForFact } from "./rss";

{
  const summary = summarizeRssDescriptionForFact(
    "Первое предложение достаточно конкретное. " +
      "Второе предложение слишком длинное и должно быть отброшено, если оно не помещается в безопасный лимит для observed факта.",
    45,
  );

  assert.equal(summary, "Первое предложение достаточно конкретное.");
  assert.equal(summary.includes("…"), false);
}

{
  const summary = summarizeRssDescriptionForFact(
    "Очень длинный фрагмент без нормальной финальной точки должен быть отброшен из observed факта, чтобы не публиковать обрезанную строку",
    45,
  );

  assert.equal(summary, "");
}

{
  const originalFetch = globalThis.fetch;
  const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0">
      <channel>
        <title>Tech RSS</title>
        <item>
          <title>OpenAI launches GPT-5 coding model for developer agents</title>
          <link>https://tech.example/openai-gpt5-coding-model</link>
          <pubDate>Fri, 15 May 2026 10:00:00 GMT</pubDate>
          <description>The release focuses on longer codebase reasoning and tool use.</description>
        </item>
        <item>
          <title>Apple quarterly earnings beat estimates on iPhone sales</title>
          <link>https://tech.example/apple-earnings-iphone-sales</link>
          <pubDate>Fri, 15 May 2026 10:05:00 GMT</pubDate>
          <description>The company reported stronger iPhone demand.</description>
        </item>
      </channel>
    </rss>`;

  globalThis.fetch = async () =>
    new Response(rssXml, {
      status: 200,
      headers: {
        "content-type": "application/rss+xml",
      },
    });

  try {
    const facts = await fetchRssFacts("https://tech.example/rss.xml", {
      sourceName: "Tech RSS",
      categoryHint: "Tech",
      maxItems: 2,
      requestTimeoutMs: 1_000,
    });

    assert.deepEqual(
      facts.corroborating_sources?.map((source) => source.title),
      [
        "OpenAI launches GPT-5 coding model for developer agents",
        "Apple quarterly earnings beat estimates on iPhone sales",
      ],
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
}
