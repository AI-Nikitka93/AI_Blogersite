import assert from "node:assert/strict";

import { coerceEnglishFactToRussianFallback } from "./fact-localization";

{
  const localized = coerceEnglishFactToRussianFallback(
    "NASA Science, Cargo Launch on 34th SpaceX Resupply Mission to Station — The 34th SpaceX commercial resupply mission under contract with NASA is headed to the International Space Station with new scientific experiments aboard.",
  );

  assert.equal(
    localized,
    "Стартовала 34-я коммерческая миссия SpaceX по снабжению Международной космической станции с новыми научными экспериментами NASA.",
  );
}

{
  const localized = coerceEnglishFactToRussianFallback(
    "Making LLMs faster without sacrificing accuracy — Amazon Science described a scaling law for model throughput.",
  );

  assert.equal(
    localized,
    "Amazon Science описала scaling law для ускорения LLM без потери точности, с проверкой через throughput и качество ответа.",
  );
}
