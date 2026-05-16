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
