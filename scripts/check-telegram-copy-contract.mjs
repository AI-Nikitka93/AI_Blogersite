import { readFileSync } from "node:fs";

const telegram = readFileSync("src/lib/telegram.ts", "utf8");
const cron = readFileSync("app/api/cron/route.ts", "utf8");
const prompts = readFileSync("src/lib/agent/prompts.ts", "utf8");
const generator = readFileSync("src/lib/agent/generator.ts", "utf8");
const quality = readFileSync("src/lib/agent/quality.ts", "utf8");

const bannedTelegramPhrases = [
  "Полная запись",
  "Полная мысль",
  "Читать полностью",
  "подробности на сайте",
  "читайте на сайте",
  "На сайте — почему",
];

const failures = [];

for (const [label, content] of [
  ["cron", cron],
  ["prompts", prompts],
  ["generator", generator],
  ["telegram", telegram],
]) {
  for (const phrase of bannedTelegramPhrases) {
    if (content.includes(phrase)) {
      failures.push(`${label}: banned Telegram phrase still present: ${phrase}`);
    }
  }
}

const requiredTelegramNeedles = [
  "TELEGRAM_LINK_LABEL = \"Открыть разбор\"",
  "buildTelegramTrustLine",
  "Опора:",
  "Не торговый совет.",
  "TELEGRAM_BAD_COPY_PATTERNS",
];

for (const needle of requiredTelegramNeedles) {
  const found =
    telegram.includes(needle) ||
    quality.includes(needle) ||
    prompts.includes(needle) ||
    generator.includes(needle) ||
    cron.includes(needle);

  if (!found) {
    failures.push(`missing Telegram contract needle: ${needle}`);
  }
}

if (failures.length > 0) {
  console.error("Telegram copy contract check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Telegram copy contract check passed.");
