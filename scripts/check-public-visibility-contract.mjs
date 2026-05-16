import { readFileSync } from "node:fs";

const healthRoute = readFileSync("app/api/health/route.ts", "utf8");
const cronRoute = readFileSync("app/api/cron/route.ts", "utf8");
const publicQuality = readFileSync("src/lib/public-post-quality.ts", "utf8");
const postsLib = readFileSync("src/lib/posts.ts", "utf8");

const checks = [
  {
    label: "health exposes reader visibility check",
    content: healthRoute,
    needles: ["reader_visibility", "latest_visible_post", "latest_success_visible"],
  },
  {
    label: "health uses the same public launch filter as reader pages",
    content: healthRoute,
    needles: ["getPublicPostBlockReason", "isReaderVisiblePost"],
  },
  {
    label: "cron records public block reasons as skipped, not success",
    content: cronRoute,
    needles: ["publicBlockReason", "status: \"skipped\"", "getPublicPostBlockReason"],
  },
  {
    label: "cron verifies persisted post is reader-visible before success",
    content: cronRoute,
    needles: [
      "verifySavedPostReaderVisible",
      "deletePersistedPostAfterVisibilityFailure",
      "getPublicSupabaseClient",
      "post persisted but not publicly visible",
    ],
  },
  {
    label: "health verifies latest successful post directly",
    content: healthRoute,
    needles: [
      "loadPublicPostById",
      "latest successful run post is not readable through public post lookup",
    ],
  },
  {
    label: "reader post filtering remains centralized",
    content: postsLib,
    needles: ["isPublicLaunchPostContent", "isPublicLaunchPost"],
  },
  {
    label: "known self-report AI-blogger phrases are blocked",
    content: publicQuality,
    needles: [
      "источник\\s+здесь\\s+важен\\s+не\\s+как\\s+вывеска",
      "смысл\\s+такой\\s+статьи",
      "если\\s+эта\\s+проверка\\s+не\\s+сработает",
    ],
  },
];

const failures = checks.flatMap((check) =>
  check.needles
    .filter((needle) => !check.content.includes(needle))
    .map((needle) => `${check.label}: missing ${needle}`),
);

const forbiddenCronFallbackPhrases = [
  "Источник здесь важен не как вывеска",
  "Смысл такой статьи",
  "Если эта проверка не сработает",
  "editorial fallback disabled for public launch",
];

for (const phrase of forbiddenCronFallbackPhrases) {
  if (cronRoute.includes(phrase)) {
    failures.push(`cron fallback must not emit self-report phrase: ${phrase}`);
  }
}

if (failures.length > 0) {
  console.error("Public visibility contract check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Public visibility contract check passed.");
