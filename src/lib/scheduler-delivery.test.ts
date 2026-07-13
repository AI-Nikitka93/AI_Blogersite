import assert from "node:assert/strict";

import { assessSchedulerDelivery } from "./scheduler-delivery";

const activeNow = new Date("2026-07-13T13:00:00.000Z"); // 16:00 Minsk

assert.equal(
  assessSchedulerDelivery({
    latestAttemptAt: "2026-07-13T12:15:00.000Z",
    now: activeNow,
  }).status,
  "pass",
);

assert.equal(
  assessSchedulerDelivery({
    latestAttemptAt: "2026-07-13T10:30:00.000Z",
    now: activeNow,
  }).status,
  "warn",
);

assert.equal(
  assessSchedulerDelivery({
    latestAttemptAt: "2026-07-13T09:30:00.000Z",
    now: activeNow,
  }).status,
  "fail",
);

assert.equal(
  assessSchedulerDelivery({
    latestAttemptAt: null,
    now: new Date("2026-07-13T21:30:00.000Z"), // 00:30 Minsk
  }).status,
  "pass",
);
