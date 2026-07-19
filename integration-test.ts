import { getMiroScheduleDecision } from "./src/lib/miro-schedule";
import { getBalancedFallbackTopics } from "./src/lib/agent/topic-fallback-policy";

const date = new Date("2026-07-20T10:00:00Z"); // Monday 10:00 UTC -> 13:00 Minsk
const decision = getMiroScheduleDecision(date);
console.log("Schedule Decision:", JSON.stringify(decision, null, 2));

const fallback = getBalancedFallbackTopics("tech_world", {
  sample_size: 10,
  counts: { Tech: 5, World: 3, Sports: 2 },
  missing_categories: ["Markets"],
  markets_share: 0,
  markets_rescue_allowed: false
});
console.log("Fallback Topics:", fallback);
