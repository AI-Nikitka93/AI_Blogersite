import assert from "node:assert/strict";

import {
  getEditorialFallbackBlockedReasonForTopic,
  isEditorialFallbackAllowedForTopic,
  isRecoverableNonMarketEditorialFallbackReason,
} from "./editorial-fallback-policy";

const balancedFeed = {
  sample_size: 10,
  counts: {
    Markets: 2,
    Tech: 3,
    World: 3,
    Sports: 2,
  },
  missing_categories: [],
  markets_share: 0.2,
  markets_rescue_allowed: true,
};

const marketHeavyFeed = {
  ...balancedFeed,
  counts: {
    Markets: 7,
    Tech: 1,
    World: 1,
    Sports: 1,
  },
  markets_share: 0.7,
  markets_rescue_allowed: false,
};

{
  assert.equal(
    isRecoverableNonMarketEditorialFallbackReason(
      "quality gate blocked English observed fact in Russian mode",
    ),
    true,
  );
}

{
  assert.equal(
    isRecoverableNonMarketEditorialFallbackReason(
      "quality gate blocked thin article body",
    ),
    false,
  );
}

{
  assert.equal(
    isRecoverableNonMarketEditorialFallbackReason(
      "quality gate blocked opinion that is too detached from the note",
    ),
    false,
  );
}

{
  assert.equal(
    isEditorialFallbackAllowedForTopic({
      topic: "world",
      reason: "quality gate blocked English observed fact in Russian mode",
      categoryBalance: marketHeavyFeed,
    }),
    true,
  );
}

{
  assert.equal(
    isEditorialFallbackAllowedForTopic({
      topic: "tech_world",
      reason: "quality gate blocked thin article body",
      categoryBalance: balancedFeed,
    }),
    false,
  );
}

{
  assert.equal(
    isEditorialFallbackAllowedForTopic({
      topic: "sports",
      reason: "quality gate blocked thin article body",
      source: "MLB News",
      facts: ["5 Blue Jays pitchers combine on 3-hit shutout of Yankees"],
      categoryBalance: balancedFeed,
    }),
    true,
  );
}

{
  assert.equal(
    isEditorialFallbackAllowedForTopic({
      topic: "sports",
      reason: "quality gate blocked thin article body",
      source: "Sports.ru",
      facts: ["Игрок перешел в новый клуб на следующий сезон."],
      categoryBalance: balancedFeed,
    }),
    false,
  );
}

{
  assert.equal(
    isEditorialFallbackAllowedForTopic({
      topic: "sports",
      reason: "quality gate blocked opinion that is too detached from the note",
      categoryBalance: balancedFeed,
    }),
    false,
  );
}

{
  assert.equal(
    isEditorialFallbackAllowedForTopic({
      topic: "markets_fx",
      reason: "quality gate blocked thin article body",
      categoryBalance: balancedFeed,
    }),
    true,
  );
}

{
  assert.equal(
    isEditorialFallbackAllowedForTopic({
      topic: "markets_crypto",
      reason: "quality gate blocked English observed fact in Russian mode",
      categoryBalance: marketHeavyFeed,
    }),
    false,
  );
}

{
  assert.match(
    getEditorialFallbackBlockedReasonForTopic({
      topic: "world",
      categoryBalance: balancedFeed,
    }),
    /weak drafts stay skipped/,
  );
}
