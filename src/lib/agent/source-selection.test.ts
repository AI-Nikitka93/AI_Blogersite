import assert from "node:assert/strict";

import { fetchRankedSuccessfulSource } from "./source-selection";
import type { RankedFetchSource } from "./source-selection";

function source(label: string, calls: string[]): RankedFetchSource {
  return {
    label,
    sourceKind: "media",
    async fetchPayload() {
      calls.push(label);
      return {
        category_hint: "Tech",
        source: label,
        facts: [`${label} fact one`, `${label} fact two`],
        source_url: `https://example.com/${label}`,
        source_published_at: "2026-05-13T12:00:00.000Z",
        event_date: "2026-05-13",
        corroborating_sources: [
          {
            source: label,
            url: `https://example.com/${label}`,
            published_at: "2026-05-13T12:00:00.000Z",
          },
        ],
      };
    },
  };
}

{
  const calls: string[] = [];
  const result = await fetchRankedSuccessfulSource(
    [source("first-success", calls), source("second-success", calls)],
    {
      failurePrefix: "test source selection failed",
      rotationBudgetMs: 2_000,
      now: new Date("2026-05-13T13:00:00.000Z"),
    },
  );

  assert.deepEqual(calls.sort(), ["first-success", "second-success"]);
  assert.equal(result.attempts.length, 2);
  assert.equal(result.attempts.every((attempt) => attempt.status === "success"), true);
  assert.equal(result.payload.source_url?.startsWith("https://example.com/"), true);
}
