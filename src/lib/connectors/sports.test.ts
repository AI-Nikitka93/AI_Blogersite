import assert from "node:assert/strict";

import { fetchMlbNewsFacts, fetchNhlScoreFacts } from "./sports";
import { getTopicSourceRegistry } from "../agent/topics";

{
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        currentDate: "2026-05-21",
        games: [
          {
            id: 2025030311,
            gameDate: "2026-05-21",
            startTimeUTC: "2026-05-22T00:00:00Z",
            gameState: "FINAL",
            awayTeam: {
              abbrev: "MTL",
              name: { default: "Canadiens" },
              score: 4,
            },
            homeTeam: {
              abbrev: "CAR",
              name: { default: "Hurricanes" },
              score: 1,
            },
            seriesStatus: {
              seriesTitle: "Conference Finals",
              gameNumberOfSeries: 1,
            },
            venue: { default: "Lenovo Center" },
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
    const payload = await fetchNhlScoreFacts({ requestTimeoutMs: 1_000 });
    assert.equal(payload.category_hint, "Sports");
    assert.equal(payload.source, "NHL Scoreboard");
    assert.equal(payload.source_published_at, "2026-05-21");
    assert.equal(payload.event_date, "2026-05-21");
    assert.equal(payload.source_url, "https://www.nhl.com/scores/2026-05-21");
    assert.equal(payload.facts.length >= 3, true);
    assert.equal(
      payload.facts.some((fact) =>
        /Canadiens|Hurricanes|4-1|Conference Finals/i.test(fact),
      ),
      true,
    );
    assert.equal(
      payload.facts.some((fact) => /odds|betting|wager|став/i.test(fact)),
      false,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
}

{
  const originalFetch = globalThis.fetch;
  const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0">
      <channel>
        <title>MLB News</title>
        <item>
          <title>Guardians complete four-game sweep of Tigers</title>
          <link>https://www.mlb.com/news/guardians-complete-four-game-sweep-tigers</link>
          <pubDate>Thu, 21 May 2026 22:00:00 GMT</pubDate>
          <description>Cleveland closed the series with another late run.</description>
        </item>
        <item>
          <title>Ohtani blasts leadoff homer and lowers ERA in return</title>
          <link>https://www.mlb.com/news/shohei-ohtani-starts-vs-padres</link>
          <pubDate>Thu, 21 May 2026 20:00:00 GMT</pubDate>
          <description>The two-way star worked from the mound and stayed in the lineup.</description>
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
    const payload = await fetchMlbNewsFacts({ requestTimeoutMs: 1_000 });
    assert.equal(payload.category_hint, "Sports");
    assert.equal(payload.source, "MLB News");
    assert.equal(payload.source_url, "https://www.mlb.com/news/guardians-complete-four-game-sweep-tigers");
    assert.deepEqual(
      payload.corroborating_sources?.map((source) => source.source),
      ["MLB News", "MLB News"],
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
}

{
  const sportsSources = getTopicSourceRegistry().filter(
    (entry) => entry.topic === "sports",
  );
  assert.equal(sportsSources.length >= 3, true);
  assert.equal(
    sportsSources.some((source) => source.label === "Soccer365 RU/BY"),
    true,
  );
  assert.equal(
    sportsSources.some((source) => source.label === "TheSportsDB RU/BY"),
    true,
  );
}
