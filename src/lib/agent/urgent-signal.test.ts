import assert from "node:assert/strict";

import { assessUrgentSignal } from "./urgent-signal";

const now = new Date("2026-07-19T00:30:00.000Z");

assert.deepEqual(
  assessUrgentSignal(
    "sports",
    {
      category_hint: "Sports",
      source: "Sports.ru",
      source_published_at: "2026-07-19T00:10:00.000Z",
      facts: [
        "Англия победила Францию в матче за третье место на ЧМ-2026 со счетом 6:4.",
      ],
    },
    now,
  ),
  {
    isUrgent: true,
    reason: "fresh decisive result from a major sports tournament",
  },
);

assert.equal(
  assessUrgentSignal(
    "sports",
    {
      category_hint: "Sports",
      source: "Sports.ru",
      source_published_at: "2026-07-18T12:00:00.000Z",
      facts: ["Англия победила Францию в матче за третье место на ЧМ-2026 со счетом 6:4."],
    },
    now,
  ).isUrgent,
  false,
  "a tournament result stops being urgent after the six-hour window",
);

assert.equal(
  assessUrgentSignal(
    "tech_world",
    {
      category_hint: "Tech",
      source: "Vendor status page",
      source_published_at: "2026-07-19T00:15:00.000Z",
      facts: ["Vendor confirmed a major outage affecting its public API."],
    },
    now,
  ).isUrgent,
  true,
);
