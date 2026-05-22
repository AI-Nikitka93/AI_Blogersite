import assert from "node:assert/strict";

import {
  rankSourceCandidates,
  type SourceCandidate,
} from "./source-ranking";

const NOW = new Date("2026-05-13T20:00:00.000Z");

function candidate(
  label: string,
  overrides: Partial<SourceCandidate> = {},
): SourceCandidate {
  return {
    label,
    sourceKind: "media",
    payload: {
      category_hint: "Tech",
      source: label,
      facts: [`${label} fact one`, `${label} fact two`],
      source_url: `https://example.com/${label}`,
      source_published_at: "2026-05-13T10:00:00.000Z",
      event_date: "2026-05-13",
      corroborating_sources: [
        {
          source: label,
          url: `https://example.com/${label}`,
          published_at: "2026-05-13T10:00:00.000Z",
        },
      ],
    },
    ...overrides,
  };
}

{
  const ranked = rankSourceCandidates(
    [
      candidate("stale-first", {
        payload: {
          ...candidate("stale-first").payload,
          source_published_at: "2024-04-03T14:18:56.000Z",
          event_date: "2024-04-03",
        },
      }),
      candidate("fresh-second", {
        payload: {
          ...candidate("fresh-second").payload,
          corroborating_sources: [
            {
              source: "fresh-second",
              url: "https://example.com/fresh-second",
              published_at: "2026-05-13T10:00:00.000Z",
            },
            {
              source: "primary confirmation",
              url: "https://example.com/confirm",
              published_at: "2026-05-13T09:00:00.000Z",
            },
          ],
        },
      }),
    ],
    NOW,
  );

  assert.equal(ranked[0]?.label, "fresh-second");
}

{
  const ranked = rankSourceCandidates(
    [
      candidate("first-media", {
        sourceKind: "media",
        payload: {
          ...candidate("first-media").payload,
          facts: ["first fact one", "first fact two"],
          corroborating_sources: [
            {
              source: "first-media",
              published_at: "2026-05-13T10:00:00.000Z",
            },
          ],
        },
      }),
      candidate("second-primary", {
        sourceKind: "primary",
        payload: {
          ...candidate("second-primary").payload,
          facts: [
            "second fact one",
            "second fact two",
            "second fact three",
            "second fact four",
          ],
          corroborating_sources: [
            {
              source: "second-primary",
              published_at: "2026-05-13T10:00:00.000Z",
            },
            {
              source: "secondary confirmation",
              published_at: "2026-05-13T09:30:00.000Z",
            },
          ],
        },
      }),
    ],
    NOW,
  );

  assert.equal(ranked[0]?.label, "second-primary");
}

{
  const ranked = rankSourceCandidates(
    [
      candidate("unrelated-rss-neighbors", {
        payload: {
          ...candidate("unrelated-rss-neighbors").payload,
          facts: [
            "OpenAI launches GPT-5 coding model for developer agents.",
            "The release focuses on longer codebase reasoning and tool use.",
          ],
          corroborating_sources: [
            {
              source: "Tech RSS",
              url: "https://tech.example/openai-gpt5-coding-model",
              title: "OpenAI launches GPT-5 coding model for developer agents",
              published_at: "2026-05-13T10:00:00.000Z",
            },
            {
              source: "Tech RSS",
              url: "https://tech.example/apple-earnings-iphone-sales",
              title: "Apple quarterly earnings beat estimates on iPhone sales",
              published_at: "2026-05-13T10:05:00.000Z",
            },
            {
              source: "Tech RSS",
              url: "https://tech.example/nasa-lunar-lander",
              title: "NASA selects a new lunar lander supplier",
              published_at: "2026-05-13T10:07:00.000Z",
            },
            {
              source: "Tech RSS",
              url: "https://tech.example/phone-camera-sensor",
              title: "Phone maker introduces a larger camera sensor",
              published_at: "2026-05-13T10:09:00.000Z",
            },
          ],
        },
      }),
      candidate("same-story-confirmed", {
        payload: {
          ...candidate("same-story-confirmed").payload,
          facts: [
            "OpenAI launches GPT-5 coding model for developer agents.",
            "The release focuses on longer codebase reasoning and tool use.",
          ],
          corroborating_sources: [
            {
              source: "Primary Feed",
              url: "https://primary.example/openai-gpt5-coding-model",
              title: "OpenAI launches GPT-5 coding model for developer agents",
              published_at: "2026-05-13T10:00:00.000Z",
            },
            {
              source: "Developer News",
              url: "https://developer.example/openai-gpt5-coding-release",
              title: "OpenAI GPT-5 coding model release targets developer agents",
              published_at: "2026-05-13T10:10:00.000Z",
            },
          ],
        },
      }),
    ],
    NOW,
  );

  assert.equal(ranked[0]?.label, "same-story-confirmed");
  assert.equal(ranked[0]?.reasons.includes("corroborated:2"), true);
}

{
  const ranked = rankSourceCandidates(
    [
      candidate("fresh-official-promo", {
        sourceKind: "official",
        payload: {
          ...candidate("fresh-official-promo").payload,
          facts: [
            "Customer story: hospital partnership expands an AI chatbot pilot.",
            "Conference session announced for enterprise AI customers.",
            "Webinar recap highlights a generic productivity partnership.",
            "Actor lawsuit story mentions AI manipulation in court filings.",
            "Company blog repeats the customer quote.",
          ],
          corroborating_sources: [
            {
              source: "Official Promo",
              url: "https://example.com/customer-story-ai-chatbot",
              title: "Customer story: hospital partnership expands an AI chatbot pilot",
              published_at: "2026-05-13T10:00:00.000Z",
            },
          ],
        },
      }),
      candidate("single-strong-research", {
        sourceKind: "expert",
        payload: {
          ...candidate("single-strong-research").payload,
          facts: [
            "Researchers released a small language model benchmark for local AI agents.",
          ],
          corroborating_sources: [
            {
              source: "Research Lab",
              url: "https://example.com/small-language-model-benchmark-local-agents",
              title: "Small language model benchmark improves local agents",
              published_at: "2026-05-13T10:00:00.000Z",
            },
          ],
        },
      }),
    ],
    NOW,
  );

  assert.equal(ranked[0]?.label, "single-strong-research");
  assert.equal(ranked[0]?.reasons.includes("publishable-signal"), true);
  assert.equal(ranked[1]?.reasons.includes("low-publication-signal"), true);
}

{
  const ranked = rankSourceCandidates(
    [
      candidate("fresh-local-culture", {
        payload: {
          ...candidate("fresh-local-culture").payload,
          category_hint: "World",
          facts: [
            "Weekend festival guide lists concerts, premieres, and places to go.",
            "The culture guide includes a book review and several local events.",
          ],
          corroborating_sources: [
            {
              source: "Local Culture",
              url: "https://example.com/weekend-festival-guide",
              title: "Weekend festival guide: where to go",
              published_at: "2026-05-13T10:00:00.000Z",
            },
          ],
        },
      }),
      candidate("rainforest-research", {
        sourceKind: "expert",
        payload: {
          ...candidate("rainforest-research").payload,
          category_hint: "World",
          facts: [
            "Researchers used rainforest AI monitoring to reveal a biodiversity shift.",
          ],
          corroborating_sources: [
            {
              source: "Science Feed",
              url: "https://example.com/rainforest-ai-biodiversity",
              title: "Rainforest AI monitoring reveals biodiversity shift",
              published_at: "2026-05-13T10:00:00.000Z",
            },
          ],
        },
      }),
    ],
    NOW,
  );

  assert.equal(ranked[0]?.label, "rainforest-research");
}
