import assert from "node:assert/strict";

import {
  buildRouteAttemptsQualityEvent,
  MAX_PERSISTED_ROUTE_ATTEMPTS,
} from "./cron-quality-flags";

const event = buildRouteAttemptsQualityEvent([
  {
    topic: "world",
    status: "skipped",
    reason: "too few fresh facts",
  },
  {
    topic: "sports",
    status: "generated",
  },
]);

assert.ok(event, "expected route attempts event");
assert.equal(event.code, "route_attempts");
assert.equal(event.severity, "info");
assert.equal(event.details.attempt_count, 2);
assert.equal(event.details.truncated, false);
assert.deepEqual(event.details.attempts, [
  {
    index: 1,
    topic: "world",
    status: "skipped",
    reason: "too few fresh facts",
  },
  {
    index: 2,
    topic: "sports",
    status: "generated",
  },
]);

const bounded = buildRouteAttemptsQualityEvent(
  Array.from({ length: MAX_PERSISTED_ROUTE_ATTEMPTS + 3 }, (_, index) => ({
    topic: index === 0 ? "markets_fx" : "tech_world",
    status: "skipped" as const,
    reason: `attempt ${index + 1} `.repeat(40),
  })),
);

assert.ok(bounded, "expected bounded route attempts event");
assert.equal(bounded.details.attempt_count, MAX_PERSISTED_ROUTE_ATTEMPTS + 3);
assert.equal(bounded.details.truncated, true);
assert.equal(bounded.details.attempts.length, MAX_PERSISTED_ROUTE_ATTEMPTS);
assert.equal(bounded.details.attempts.at(-1)?.index, MAX_PERSISTED_ROUTE_ATTEMPTS + 3);
assert.ok(
  (bounded.details.attempts[0].reason?.length ?? 0) <= 243,
  "long reasons should be clipped before persistence",
);

assert.equal(buildRouteAttemptsQualityEvent([]), undefined);
