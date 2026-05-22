import { readFileSync } from "node:fs";

const checks = [
  {
    file: "src/lib/agent/quality.ts",
    needles: ["FINANCIAL_ADVICE_PATTERNS", "financial advice"],
    label: "financial-advice quality guard",
  },
  {
    file: "src/lib/agent/quality.ts",
    needles: ["SPORTS_BETTING_ADVICE_PATTERNS", "sports betting advice"],
    label: "sports betting quality guard",
  },
  {
    file: "src/lib/agent/quality.ts",
    needles: ["SPORTS_SANITY_BLOCK_PATTERNS", "contradictory or coachy sports framing"],
    label: "sports contradiction quality guard",
  },
  {
    file: "src/lib/agent/quality.ts",
    needles: ["REPETITIVE_MIRO_VOICE_PATTERNS", "repetitive Miro voice fingerprint"],
    label: "repetitive Miro voice guard",
  },
  {
    file: "src/lib/public-post-quality.ts",
    needles: ["getPublicPostBlockReason", "MARKET_ADVICE_COPY_PATTERNS", "public market post contains advice-like copy"],
    label: "shared public pre-publish quality gate",
  },
  {
    file: "src/lib/public-post-quality.ts",
    needles: ["getPrePublishSourceBlockReason", "source_url", "stale source metadata"],
    label: "source metadata and stale-source pre-publish gate",
  },
  {
    file: "src/lib/connectors/types.ts",
    needles: ["source_url", "source_published_at", "event_date", "corroborating_sources"],
    label: "connector source metadata contract",
  },
  {
    file: "supabase/migrations/20260513_add_source_metadata.sql",
    needles: ["source_url", "source_published_at", "event_date", "corroborating_sources"],
    label: "source metadata database migration",
  },
  {
    file: "app/api/cron/route.ts",
    needles: ["getPublicPostBlockReason", "publicBlockReason"],
    label: "pre-publish public quality gate before persistence and Telegram",
  },
  {
    file: "src/lib/telegram.ts",
    needles: ["MARKET_ADVICE_COPY_PATTERNS", "buildTelegramTrustLine", "Опора:", "Не торговый совет"],
    label: "Telegram market trust and advice guard",
  },
  {
    file: "scripts/check-telegram-copy-contract.mjs",
    needles: ["Telegram copy contract check passed", "TELEGRAM_BAD_COPY_PATTERNS", "Открыть разбор"],
    label: "Telegram copy contract gate",
  },
  {
    file: "package.json",
    needles: ["check:telegram-copy", "npm run check:telegram-copy"],
    label: "Telegram copy npm gate",
  },
  {
    file: "scripts/eval-content-quality.mjs",
    needles: ["fixture_count", "financial_advice", "template_or_repetitive_voice", "telegram_admin_boilerplate"],
    label: "content quality eval runner",
  },
  {
    file: "package.json",
    needles: ["eval:content", "npm run eval:content"],
    label: "content eval npm gate",
  },
  {
    file: "src/lib/agent/quality.ts",
    needles: ["PUBLIC_TEMPLATE_LEAK_PATTERNS", "fallback template language", "thin article body"],
    label: "fallback template language guard",
  },
  {
    file: "app/api/cron/route.ts",
    needles: ["tryEditorialFallbacks", "validatePostQuality", "completeSuccessfulRun"],
    label: "gated editorial fallback can publish when primary generation skips",
  },
  {
    file: "app/api/cron/route.ts",
    needles: ["buildFallbackLongformArticle", "join(\"\\n\\n\")"],
    label: "fallback longform article builder",
  },
  {
    file: "src/components/miro/post-detail-view.tsx",
    needles: ["Вторая линия", "post.cross_signal"],
    label: "full article cross-signal display",
  },
  {
    file: "src/components/miro/post-detail-view.tsx",
    needles: ["Не рекомендация", "финансовая рекомендация"],
    label: "market disclaimer on detail view",
  },
  {
    file: "app/feed.xml/route.ts",
    needles: ["не являются финансовыми рекомендациями"],
    label: "market disclaimer in RSS",
  },
  {
    file: "app/api/health/route.ts",
    needles: ["freshness_incident", "recent_route_reasons"],
    label: "freshness incident payload",
  },
  {
    file: "app/api/cron/route.ts",
    needles: ["category_balance", "quality_events"],
    label: "category balance and quality ledger",
  },
  {
    file: "app/api/cron/route.ts",
    needles: ["getMiroDueScheduleSlots", "dueSlots", "filledSlotKeys"],
    label: "catch-up scheduler for delayed cron runs",
  },
  {
    file: "scripts/trigger-cron.sh",
    needles: ["product_outcome", "freshness_status", "stale_health", "published_not_visible", "market_rescue_violation", "markets_rescue_allowed", "checks.reader_visibility"],
    label: "product-vs-workflow outputs",
  },
  {
    file: "package.json",
    needles: ["test:cron-trigger", "scripts/trigger-cron.test.mjs"],
    label: "cron trigger outcome regression gate",
  },
  {
    file: "pre-launch-check.sh",
    needles: ["Health reader visibility ready", "latest_visible_post", "reader-visible latest post"],
    label: "pre-launch reader visibility smoke",
  },
  {
    file: "app/page.tsx",
    needles: ["Новая запись", "FreshnessStatus", "PinnedPosts", "MiroNow"],
    label: "secondary reading suggestions, freshness, and article-led UI",
  },
  {
    file: "src/components/miro/post-card.tsx",
    needles: ["Почему опубликовано", "post.reasoning"],
    label: "card-level editorial reasoning",
  },
  {
    file: "src/lib/posts.ts",
    needles: ["isPublicLaunchPost", "isPublicLaunchPostContent", "confidence\", \"low"],
    label: "launch-safe public post filter",
  },
  {
    file: "app/api/health/route.ts",
    needles: ["reader_visibility", "latest_visible_post", "latest_success_visible"],
    label: "reader-visible health gate",
  },
  {
    file: "app/api/cron/route.ts",
    needles: ["verifySavedPostReaderVisible", "post persisted but not publicly visible"],
    label: "post-id visibility verification before publish success",
  },
  {
    file: "package.json",
    needles: ["check:public-visibility", "scripts/check-public-visibility-contract.mjs"],
    label: "public visibility contract npm gate",
  },
  {
    file: "src/components/miro/post-card.tsx",
    needles: ["post-card-cta-mobile", "Читать запись"],
    label: "mobile CTA after reading hook",
  },
];

const fixture = readFileSync("eval/quality-fixtures.jsonl", "utf8")
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => JSON.parse(line));

const riskyFixture = fixture.find((item) => item.id === "markets_financial_advice");
if (!riskyFixture) {
  throw new Error("Missing markets_financial_advice fixture.");
}

for (const phrase of riskyFixture.must_reject_phrases) {
  if (!riskyFixture.output.includes(phrase)) {
    throw new Error(`Fixture no longer contains expected risky phrase: ${phrase}`);
  }
}

const riskySportsFixture = fixture.find((item) => item.id === "sports_betting_advice");
if (!riskySportsFixture) {
  throw new Error("Missing sports_betting_advice fixture.");
}

for (const phrase of riskySportsFixture.must_reject_phrases) {
  if (!riskySportsFixture.output.includes(phrase)) {
    throw new Error(`Fixture no longer contains expected risky sports phrase: ${phrase}`);
  }
}

const templateLeakFixture = fixture.find((item) => item.id === "fallback_template_language");
if (!templateLeakFixture) {
  throw new Error("Missing fallback_template_language fixture.");
}

for (const phrase of templateLeakFixture.must_reject_phrases) {
  if (!templateLeakFixture.output.includes(phrase)) {
    throw new Error(`Fixture no longer contains expected template leak phrase: ${phrase}`);
  }
}

const sportsContradictionFixture = fixture.find(
  (item) => item.id === "sports_result_contradiction",
);
if (!sportsContradictionFixture) {
  throw new Error("Missing sports_result_contradiction fixture.");
}

for (const phrase of sportsContradictionFixture.must_reject_phrases) {
  if (!sportsContradictionFixture.output.includes(phrase)) {
    throw new Error(`Fixture no longer contains expected sports contradiction phrase: ${phrase}`);
  }
}

const repetitiveVoiceFixture = fixture.find((item) => item.id === "repetitive_miro_voice");
if (!repetitiveVoiceFixture) {
  throw new Error("Missing repetitive_miro_voice fixture.");
}

for (const phrase of repetitiveVoiceFixture.must_reject_phrases) {
  if (!repetitiveVoiceFixture.output.includes(phrase)) {
    throw new Error(`Fixture no longer contains expected repetitive voice phrase: ${phrase}`);
  }
}

const telegramMarketAdviceFixture = fixture.find(
  (item) => item.id === "telegram_market_advice_copy",
);
if (!telegramMarketAdviceFixture) {
  throw new Error("Missing telegram_market_advice_copy fixture.");
}

for (const phrase of telegramMarketAdviceFixture.must_reject_phrases) {
  if (!telegramMarketAdviceFixture.output.includes(phrase)) {
    throw new Error(`Fixture no longer contains expected Telegram market advice phrase: ${phrase}`);
  }
}

const missing = [];
for (const check of checks) {
  const content = readFileSync(check.file, "utf8");
  const missingNeedles = check.needles.filter((needle) => !content.includes(needle));
  if (missingNeedles.length > 0) {
    missing.push(`${check.label}: ${missingNeedles.join(", ")}`);
  }
}

if (missing.length > 0) {
  console.error("Product upgrade regression check failed:");
  for (const item of missing) {
    console.error(`- ${item}`);
  }
  process.exit(1);
}

console.log("Product upgrade regression check passed.");
