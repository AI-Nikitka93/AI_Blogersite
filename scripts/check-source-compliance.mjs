import fs from "node:fs";

const runtimeFiles = [
  "src/lib/agent/topics.ts",
  "src/lib/agent/prompts.ts",
  "src/lib/agent/gatekeeper.ts",
  "src/lib/connectors/presets.ts",
  "src/lib/connectors/world-rss.ts",
  "src/lib/connectors/index.ts",
];

const blockedPatterns = [
  {
    pattern: /\bBBC\b|bbci\.co\.uk|bbc\.com/i,
    reason:
      "BBC is excluded from active runtime because BBC News Russian / bbc.com was reported as listed in Belarus extremist materials in 2026.",
  },
  {
    pattern:
      /tut\.by|zerkalo\.io|dw\.com|belsat\.eu|svaboda\.org|euroradio\.fm|charter97\.org|nashaniva\.com|meduza\.io|zona\.media|reform\.news/i,
    reason:
      "Known high-risk Belarus-restricted media domains must not be active runtime sources.",
  },
];

const violations = [];

for (const file of runtimeFiles) {
  const text = fs.readFileSync(file, "utf8");

  for (const { pattern, reason } of blockedPatterns) {
    if (pattern.test(text)) {
      violations.push({ file, reason });
    }
  }
}

if (violations.length > 0) {
  console.error(JSON.stringify({ status: "failed", violations }, null, 2));
  process.exit(1);
}

console.log("Source compliance check passed.");
