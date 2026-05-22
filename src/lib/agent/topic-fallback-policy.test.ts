import assert from "node:assert/strict";

import {
  getAutonomousTopicOrder,
  getBalancedFallbackTopics,
  getBalancedPrimaryTopic,
  isMarketRescueAllowed,
} from "./topic-fallback-policy";

{
  assert.equal(isMarketRescueAllowed(undefined), false);

  const topics = getBalancedFallbackTopics("tech_world");
  assert.equal(topics.includes("markets_fx"), false);
  assert.equal(topics.includes("markets_crypto"), false);
}

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
  const topics = getBalancedFallbackTopics("world", {
    sample_size: 20,
    counts: {
      Markets: 11,
      Sports: 2,
      Tech: 5,
      World: 2,
    },
    missing_categories: [],
    markets_share: 0.55,
    markets_rescue_allowed: true,
  });

  assert.equal(topics.includes("markets_fx"), false);
  assert.equal(topics.includes("markets_crypto"), false);
}

{
  const topics = getBalancedFallbackTopics("tech_world", {
    sample_size: 20,
    counts: {
      Markets: 9,
      Sports: 3,
      Tech: 4,
      World: 4,
    },
    missing_categories: [],
    markets_share: 0.45,
    markets_rescue_allowed: true,
    top_sample_size: 5,
    top_markets_share: 0.8,
  });

  assert.equal(topics.includes("markets_fx"), false);
  assert.equal(topics.includes("markets_crypto"), false);
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
  const topic = getBalancedPrimaryTopic("markets_fx", {
    sample_size: 20,
    counts: {
      Markets: 11,
      Sports: 2,
      Tech: 5,
      World: 2,
    },
    missing_categories: [],
    markets_share: 0.55,
    markets_rescue_allowed: true,
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

{
  const topics = getAutonomousTopicOrder({
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

  assert.equal(topics[0], "sports");
  assert.equal(topics.includes("markets_fx"), true);
}

{
  const topics = getAutonomousTopicOrder({
    sample_size: 20,
    counts: {
      Markets: 12,
      Sports: 2,
      Tech: 4,
      World: 2,
    },
    missing_categories: [],
    markets_share: 0.6,
    markets_rescue_allowed: false,
    top_sample_size: 5,
    top_markets_share: 0.8,
  });

  assert.deepEqual(
    topics.filter((topic) => topic === "markets_fx" || topic === "markets_crypto"),
    [],
  );
  assert.equal(topics[0], "world");
}

{
  const topics = getAutonomousTopicOrder();

  assert.deepEqual(topics, ["world", "tech_world", "sports"]);
}
