import assert from "node:assert/strict";

import { getPrimaryWriterTimeoutMs } from "./orchestrator";

const originalTimeout = process.env.MIRO_PRIMARY_WRITER_TIMEOUT_MS;

try {
  process.env.MIRO_PRIMARY_WRITER_TIMEOUT_MS = "20000";
  assert.equal(
    getPrimaryWriterTimeoutMs(30_000, true),
    20_000,
    "a configured fallback reserves time for its own generation attempt",
  );
  assert.equal(
    getPrimaryWriterTimeoutMs(12_000, true),
    12_000,
    "the hedge never exceeds the route's remaining writer budget",
  );
  assert.equal(
    getPrimaryWriterTimeoutMs(30_000, false),
    30_000,
    "a single-provider setup keeps its existing writer budget",
  );

  process.env.MIRO_PRIMARY_WRITER_TIMEOUT_MS = "999999";
  assert.equal(
    getPrimaryWriterTimeoutMs(30_000, true),
    25_000,
    "an unsafe hedge override is bounded so a fallback still has time to run",
  );
} finally {
  if (originalTimeout === undefined) {
    delete process.env.MIRO_PRIMARY_WRITER_TIMEOUT_MS;
  } else {
    process.env.MIRO_PRIMARY_WRITER_TIMEOUT_MS = originalTimeout;
  }
}
