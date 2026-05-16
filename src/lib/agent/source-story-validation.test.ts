import assert from "node:assert/strict";

import { getSameStoryCorroboratingSources } from "./source-story-validation";
import type { MiroFactsPayload } from "../connectors";

function payload(
  overrides: Partial<MiroFactsPayload> = {},
): MiroFactsPayload {
  return {
    category_hint: "Tech",
    source: "Primary Feed",
    source_url: "https://primary.example/openai-gpt5-coding-model",
    source_published_at: "2026-05-15T10:00:00.000Z",
    event_date: "2026-05-15",
    facts: [
      "OpenAI launches GPT-5 coding model for developer agents.",
      "The release focuses on longer codebase reasoning and tool use.",
    ],
    corroborating_sources: [
      {
        source: "Primary Feed",
        url: "https://primary.example/openai-gpt5-coding-model",
        title: "OpenAI launches GPT-5 coding model for developer agents",
        published_at: "2026-05-15T10:00:00.000Z",
      },
    ],
    ...overrides,
  };
}

{
  const sources = getSameStoryCorroboratingSources(
    payload({
      corroborating_sources: [
        {
          source: "Primary Feed",
          url: "https://primary.example/openai-gpt5-coding-model",
          title: "OpenAI launches GPT-5 coding model for developer agents",
          published_at: "2026-05-15T10:00:00.000Z",
        },
        {
          source: "Developer News",
          url: "https://developer.example/openai-gpt5-coding-release",
          title: "OpenAI GPT-5 coding model release targets developer agents",
          published_at: "2026-05-15T10:10:00.000Z",
        },
      ],
    }),
  );

  assert.deepEqual(
    sources.map((source) => source.source),
    ["Primary Feed", "Developer News"],
  );
}

{
  const sources = getSameStoryCorroboratingSources(
    payload({
      corroborating_sources: [
        {
          source: "Tech RSS",
          url: "https://tech.example/openai-gpt5-coding-model",
          title: "OpenAI launches GPT-5 coding model for developer agents",
          published_at: "2026-05-15T10:00:00.000Z",
        },
        {
          source: "Tech RSS",
          url: "https://tech.example/apple-earnings-iphone-sales",
          title: "Apple quarterly earnings beat estimates on iPhone sales",
          published_at: "2026-05-15T10:05:00.000Z",
        },
        {
          source: "Tech RSS",
          url: "https://tech.example/nasa-lunar-lander",
          title: "NASA selects a new lunar lander supplier",
          published_at: "2026-05-15T10:07:00.000Z",
        },
      ],
    }),
  );

  assert.deepEqual(
    sources.map((source) => source.title),
    ["OpenAI launches GPT-5 coding model for developer agents"],
  );
}
