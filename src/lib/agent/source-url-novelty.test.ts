import assert from "node:assert/strict";

import {
  findSourceUrlConflict,
  normalizeSourceUrlForNovelty,
} from "./source-url-novelty";

assert.equal(
  normalizeSourceUrlForNovelty(
    "https://example.com/story/?utm_source=rss&fbclid=ignored#section",
  ),
  "https://example.com/story",
);

assert.equal(
  findSourceUrlConflict("https://example.com/story?utm_medium=rss", [
    {
      title: "Уже опубликованная история",
      source_url: "https://example.com/story",
    },
  ]),
  "Уже опубликованная история",
);

assert.equal(
  findSourceUrlConflict("https://example.com/another-story", [
    {
      title: "Уже опубликованная история",
      source_url: "https://example.com/story",
    },
  ]),
  null,
);
