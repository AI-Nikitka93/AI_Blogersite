import { getMinskParts } from "./miro-schedule";

export type SchedulerDeliveryStatus = "pass" | "warn" | "fail";

const SCHEDULER_START_MINUTES = 7 * 60;
const SCHEDULER_END_MINUTES = 21 * 60 + 30;
const SCHEDULER_PASS_AGE_HOURS = 1.5;
const SCHEDULER_WARN_AGE_HOURS = 3;

export function assessSchedulerDelivery(input: {
  latestAttemptAt?: string | null;
  now?: Date;
}): { status: SchedulerDeliveryStatus; reason: string } {
  const now = input.now ?? new Date();
  const { totalMinutes } = getMinskParts(now);

  if (
    totalMinutes < SCHEDULER_START_MINUTES ||
    totalMinutes >= SCHEDULER_END_MINUTES
  ) {
    return {
      status: "pass",
      reason: "scheduler is outside its daytime polling window",
    };
  }

  if (!input.latestAttemptAt) {
    return {
      status: "fail",
      reason: "no cron attempt is recorded during the active scheduler window",
    };
  }

  const ageHours = (now.getTime() - new Date(input.latestAttemptAt).getTime()) / 3_600_000;
  if (!Number.isFinite(ageHours) || ageHours < 0) {
    return {
      status: "warn",
      reason: "latest cron attempt has an invalid timestamp",
    };
  }

  if (ageHours <= SCHEDULER_PASS_AGE_HOURS) {
    return {
      status: "pass",
      reason: "scheduler is delivering recent cron attempts",
    };
  }

  if (ageHours <= SCHEDULER_WARN_AGE_HOURS) {
    return {
      status: "warn",
      reason: "scheduler delivery is delayed beyond the expected polling cadence",
    };
  }

  return {
    status: "fail",
    reason: "scheduler has not delivered a cron attempt for more than three hours",
  };
}
