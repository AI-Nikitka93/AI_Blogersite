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
      source: "OpenAI News",
      source_url: "https://openai.com/index/adventhealth",
      facts: [
        "AdventHealth advances whole-person care with OpenAI.",
        "AdventHealth is using ChatGPT for Healthcare to streamline workflows.",
      ],
      corroborating_sources: [
        {
          source: "OpenAI News",
          url: "https://openai.com/index/adventhealth",
          title: "AdventHealth advances whole-person care with OpenAI",
          published_at: "2026-05-21T12:00:00.000Z",
        },
        {
          source: "OpenAI News",
          url: "https://openai.com/index/ramp",
          title: "How Ramp engineers accelerate code review with Codex",
          published_at: "2026-05-21T13:00:00.000Z",
        },
        {
          source: "OpenAI News",
          url: "https://openai.com/index/introducing-openai-for-singapore",
          title: "Introducing OpenAI for Singapore",
          published_at: "2026-05-21T14:00:00.000Z",
        },
      ],
    }),
  );

  assert.deepEqual(
    sources.map((source) => source.title),
    ["AdventHealth advances whole-person care with OpenAI"],
  );
}

{
  const sources = getSameStoryCorroboratingSources(
    payload({
      source: "MLB News",
      source_url:
        "https://www.mlb.com/news/key-takeaways-from-blue-jays-2-0-win-over-yankees",
      facts: [
        "5 Blue Jays pitchers combine on 3-hit shutout of Yankees.",
        "The Blue Jays held the Yankees scoreless in a division game.",
      ],
      corroborating_sources: [
        {
          source: "MLB News",
          url:
            "https://www.mlb.com/news/key-takeaways-from-blue-jays-2-0-win-over-yankees",
          title: "5 Blue Jays pitchers combine on 3-hit shutout of Yankees",
          published_at: "2026-05-22T02:45:00.000Z",
        },
        {
          source: "MLB News",
          url: "https://www.mlb.com/news/best-mlb-division-races-to-follow-2026",
          title:
            "These division rivalries are already heated. Which will be the best race?",
          published_at: "2026-05-22T03:00:00.000Z",
        },
        {
          source: "MLB News",
          url:
            "https://www.mlb.com/news/aaron-judge-rbi-drought-hits-career-long-10-games",
          title: "Judge's rare dry spell has Yankees captain seeking a spark",
          published_at: "2026-05-22T03:30:00.000Z",
        },
      ],
    }),
  );

  assert.deepEqual(
    sources.map((source) => source.title),
    ["5 Blue Jays pitchers combine on 3-hit shutout of Yankees"],
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
