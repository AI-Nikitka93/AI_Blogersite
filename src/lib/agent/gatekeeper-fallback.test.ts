import assert from "node:assert/strict";

import { evaluateGatekeeperTimeoutFallback } from "./gatekeeper";

{
  const result = evaluateGatekeeperTimeoutFallback(
    {
      category_hint: "World",
      source: "NASA News Releases",
      facts: [
        "NASA Science, Cargo Launch on 34th SpaceX Resupply Mission to Station.",
      ],
    },
    '429 {"error":{"message":"Rate limit reached for model `llama-3.3-70b-versatile`","code":"rate_limit_exceeded"}}',
  );

  assert.equal(result?.is_safe, true);
}

{
  const result = evaluateGatekeeperTimeoutFallback(
    {
      category_hint: "Tech",
      source: "Microsoft Research",
      facts: [
        "MagenticLite, MagenticBrain, Fara1.5: An agentic experience optimized for small models.",
      ],
    },
    "gatekeeper model call exceeded the 2800ms deadline.",
  );

  assert.equal(result?.is_safe, true);
}

{
  const result = evaluateGatekeeperTimeoutFallback(
    {
      category_hint: "Markets",
      source: "CoinGecko",
      facts: ["Bitcoin price touches $100k"],
    },
    "gatekeeper model call exceeded the 2600ms deadline.",
  );

  assert.equal(result?.is_safe, true);
}

{
  const result = evaluateGatekeeperTimeoutFallback(
    {
      category_hint: "Tech",
      source: "Microsoft Research",
      facts: [
        "The government announced military use of an AI model after an election.",
      ],
    },
    "gatekeeper model call exceeded the 2800ms deadline.",
  );

  assert.equal(result?.is_safe, false);
  assert.equal(
    result?.reason,
    "timeout fallback blocked political or power-related signal",
  );
}
