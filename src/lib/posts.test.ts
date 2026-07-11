import assert from "node:assert/strict";

import { dedupePostsBySourceUrl, prioritizeDiversePostsForDisplay } from "./posts";
import type { PostRow } from "./supabase";

function post(id: string, category: PostRow["category"]): PostRow {
  return {
    id,
    category,
    title: `${category} ${id}`,
    source: "Test Source",
    source_url: `https://example.com/${id}`,
    source_published_at: "2026-05-22T00:00:00.000Z",
    event_date: "2026-05-22",
    corroborating_sources: null,
    observed: [`${category} observed ${id}`],
    inferred: `${category} inferred ${id}`,
    opinion: `${category} opinion ${id}`,
    cross_signal: `${category} cross ${id}`,
    hypothesis: `${category} hypothesis ${id}`,
    reasoning: `${category} reasoning ${id}`,
    confidence: "medium",
    created_at: `2026-05-22T00:${id.padStart(2, "0")}:00.000Z`,
  };
}

{
  const posts = [
    post("1", "Markets"),
    post("2", "Markets"),
    post("3", "Markets"),
    post("4", "Markets"),
    post("5", "Tech"),
    post("6", "World"),
    post("7", "Sports"),
    post("8", "Markets"),
    post("9", "Tech"),
    post("10", "World"),
    post("11", "Sports"),
    post("12", "Tech"),
  ];

  const prioritized = prioritizeDiversePostsForDisplay(posts).slice(0, 10);
  assert.equal(prioritized.length, 10);
  assert.equal(prioritized[0]?.id, "1");
  assert.equal(
    prioritized.slice(0, 5).filter((item) => item.category === "Markets").length,
    2,
  );
  assert.equal(
    prioritized.filter((item) => item.category === "Markets").length <= 4,
    true,
  );

  for (let index = 1; index < prioritized.length; index += 1) {
    assert.equal(
      prioritized[index - 1]?.category === "Markets" &&
        prioritized[index]?.category === "Markets",
      false,
      "Markets should not be promoted into adjacent top-feed positions",
    );
  }
}

{
  const posts = [post("1", "Markets"), post("2", "Markets")];
  const prioritized = prioritizeDiversePostsForDisplay(posts);
  assert.deepEqual(
    prioritized.map((item) => item.id),
    ["1", "2"],
  );
}

{
  const first = post("1", "Tech");
  const duplicate = {
    ...post("2", "Tech"),
    source_url: `${first.source_url}?utm_source=rss`,
  };

  assert.deepEqual(
    dedupePostsBySourceUrl([first, duplicate]).map((item) => item.id),
    ["1"],
  );
}
