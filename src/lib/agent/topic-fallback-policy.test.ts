import assert from "node:assert/strict";

import {
  getBalancedFallbackTopics,
  getBalancedPrimaryTopic,
} from "./topic-fallback-policy";

{
  const topics = getBalancedFallbackTopics("tech_world", {
    sample_size: 8,
    counts: {
      Sports: 2,
      Markets: 2,
      Tech: 2,
      World: 2,
    },
    missing_categories: [],
    markets_share: 0.25,
    markets_rescue_allowed: true,
  });

  assert.equal(topics.includes("sports"), false);
}

{
  const topics = getBalancedFallbackTopics("tech_world", {
    sample_size: 10,
    counts: {
      Markets: 7,
      Sports: 1,
      Tech: 1,
      World: 1,
    },
    missing_categories: [],
    markets_share: 0.7,
    markets_rescue_allowed: false,
  });

  assert.deepEqual(topics, ["world"]);
}

{
  const topics = getBalancedFallbackTopics("tech_world", {
    sample_size: 6,
    counts: {
      Markets: 2,
      Tech: 2,
      World: 2,
    },
    missing_categories: ["Sports"],
    markets_share: 0.33,
    markets_rescue_allowed: true,
  });

  assert.equal(topics.includes("sports"), true);
}

{
  const topic = getBalancedPrimaryTopic("markets_fx", {
    sample_size: 20,
    counts: {
      Sports: 2,
      Markets: 15,
      Tech: 2,
      World: 1,
    },
    missing_categories: [],
    markets_share: 0.75,
    markets_rescue_allowed: false,
  });

  assert.equal(topic, "world");
}

{
  const topic = getBalancedPrimaryTopic("sports", {
    sample_size: 20,
    counts: {
      Sports: 2,
      Markets: 8,
      Tech: 5,
      World: 5,
    },
    missing_categories: [],
    markets_share: 0.4,
    markets_rescue_allowed: true,
  });

  assert.notEqual(topic, "sports");
}
