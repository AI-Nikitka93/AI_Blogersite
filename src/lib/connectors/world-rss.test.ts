import assert from "node:assert/strict";

import { fetchPhysOrgFacts } from "./world-rss";

{
  const originalFetch = globalThis.fetch;
  const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0">
      <channel>
        <title>Phys.org</title>
        <item>
          <title>FIFA World Cup expected to generate record visitor traffic</title>
          <link>https://phys.org/news/2026-05-fifa-world-cup-generate.html</link>
          <pubDate>Fri, 22 May 2026 05:30:01 EDT</pubDate>
          <description>The tournament story belongs in sports or markets, not the world science lane.</description>
        </item>
        <item>
          <title>Researchers map a new reef recovery pattern after bleaching</title>
          <link>https://phys.org/news/2026-05-reef-recovery-pattern.html</link>
          <pubDate>Fri, 22 May 2026 06:15:00 EDT</pubDate>
          <description>The field team tracked local ecosystems and found a repeatable recovery signal.</description>
        </item>
        <item>
          <title>New observatory camera tracks faint asteroids in daylight</title>
          <link>https://phys.org/news/2026-05-observatory-camera-asteroids.html</link>
          <pubDate>Fri, 22 May 2026 06:45:00 EDT</pubDate>
          <description>The instrument gives researchers a second daily window for sky surveys.</description>
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
    const payload = await fetchPhysOrgFacts({ requestTimeoutMs: 1_000 });

    assert.equal(payload.category_hint, "World");
    assert.equal(
      payload.source_url,
      "https://phys.org/news/2026-05-reef-recovery-pattern.html",
    );
    assert.equal(
      payload.facts.some((fact) => /FIFA|World Cup|tournament/i.test(fact)),
      false,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
}
