import { readFileSync } from "node:fs";

const files = [
  "app/layout.tsx",
  "app/page.tsx",
  "app/about/page.tsx",
  "app/manifesto/page.tsx",
  "src/components/miro/miro-hero.tsx",
  "src/components/miro/post-card.tsx",
  "src/components/miro/post-detail-view.tsx",
  "src/components/miro/publishing-rhythm.tsx",
];

const sources = Object.fromEntries(
  files.map((file) => [file, readFileSync(file, "utf8")]),
);

const failures = [];

if (!sources["app/layout.tsx"].includes("Manrope")) {
  failures.push("Body font must stay on Manrope for readable Cyrillic UI.");
}

if (!sources["app/layout.tsx"].includes("Unbounded")) {
  failures.push("Display font must stay on Unbounded for a distinct Cyrillic identity.");
}

if (sources["app/layout.tsx"].includes("Merriweather")) {
  failures.push("Merriweather must not return as the display font; it makes the hero feel oversized and generic.");
}

const bannedOversizedPatterns = [
  "text-[clamp(2.9rem,6.4vw,5.35rem)]",
  "max-w-[9ch]",
  "md:text-6xl",
  "xl:text-6xl",
];

for (const [file, source] of Object.entries(sources)) {
  for (const pattern of bannedOversizedPatterns) {
    if (source.includes(pattern)) {
      failures.push(`${file} still contains oversized typography pattern: ${pattern}`);
    }
  }
}

if (!sources["src/components/miro/miro-hero.tsx"].includes("Сначала источник, потом вывод.")) {
  failures.push("Hero should keep the source-first identity headline.");
}

if (failures.length > 0) {
  console.error("Typography scale check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Typography scale check passed.");
