import assert from "node:assert/strict";

import { fetchHackerNewsFacts } from "./tech";

{
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        hits: [
          {
            title: "Trump leaves China with no agreement on foreign policy",
            url: "https://www.nbcnews.com/politics/donald-trump/example",
            created_at: "2026-05-15T18:08:50Z",
          },
          {
            title:
              "US orders travelers on Air Force One to throw away burner phones after China trip",
            url: "https://techcrunch.com/2026/05/15/us-orders-travelers-on-air-force-one-after-china-trip/",
            created_at: "2026-05-15T18:08:55Z",
          },
          {
            title: "Open-source database adds vector search for AI agents",
            url: "https://example.com/database-vector-search-ai-agents",
            created_at: "2026-05-15T18:09:50Z",
          },
          {
            title: "Quantum chip benchmark improves error correction",
            url: "https://example.com/quantum-chip-error-correction",
            created_at: "2026-05-15T18:10:50Z",
          },
        ],
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      },
    );

  try {
    const payload = await fetchHackerNewsFacts({ requestTimeoutMs: 1_000 });
    assert.equal(
      payload.source_url,
      "https://example.com/database-vector-search-ai-agents",
    );
    assert.equal(
      payload.facts.some((fact) =>
        /trump|foreign policy|air force one|china trip/i.test(fact),
      ),
      false,
    );
    assert.equal(payload.facts.length, 2);
    assert.deepEqual(
      payload.corroborating_sources?.map((source) => source.title),
      [
        "Open-source database adds vector search for AI agents",
        "Quantum chip benchmark improves error correction",
      ],
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
}

{
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        hits: [
          {
            title:
              "Voice-file messages involving actor manipulated by AI, Seoul police say",
            url: "https://www.koreatimes.co.kr/southkorea/law-crime/20260521/voice-file-messages-involving-actor-manipulated-by-ai-seoul-police",
            created_at: "2026-05-22T11:05:30Z",
          },
          {
            title: "Open-source database adds vector search for AI agents",
            url: "https://example.com/database-vector-search-ai-agents",
            created_at: "2026-05-22T11:06:30Z",
          },
          {
            title: "Small language model benchmark improves local agents",
            url: "https://example.com/small-language-model-local-agents",
            created_at: "2026-05-22T11:07:30Z",
          },
        ],
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      },
    );

  try {
    const payload = await fetchHackerNewsFacts({ requestTimeoutMs: 1_000 });
    assert.equal(
      payload.source_url,
      "https://example.com/database-vector-search-ai-agents",
    );
    assert.equal(
      payload.facts.some((fact) =>
        /actor|police|law-crime|manipulated by ai|koreatimes/i.test(fact),
      ),
      false,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
}

{
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        hits: [
          {
            title:
              "US bears brunt of Israel's missile defense, Pentagon assessments show",
            url: "https://www.washingtonpost.com/national-security/2026/05/21/us-bears-brunt-israels-missile-defense-pentagon-assessments-show/",
            created_at: "2026-05-22T00:23:23Z",
          },
          {
            title: "Small language model benchmark improves local agents",
            url: "https://example.com/small-language-model-local-agents",
            created_at: "2026-05-22T00:24:23Z",
          },
          {
            title: "Open-source database adds vector search for AI agents",
            url: "https://example.com/database-vector-search-ai-agents",
            created_at: "2026-05-22T00:25:23Z",
          },
        ],
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      },
    );

  try {
    const payload = await fetchHackerNewsFacts({ requestTimeoutMs: 1_000 });
    assert.equal(
      payload.source_url,
      "https://example.com/small-language-model-local-agents",
    );
    assert.equal(
      payload.facts.some((fact) =>
        /missile|defense|pentagon|national-security|washingtonpost/i.test(fact),
      ),
      false,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
}
