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

{
  const localized = coerceEnglishFactToRussianFallback(
    "MagenticLite, MagenticBrain, Fara1.5: An agentic experience optimized for small models — MagenticLite is an agentic system for small models that works across the browser and local file system in a single workflow. It combines specialized models and orchestration to support efficient agentic performance on everyday tasks.",
    "Microsoft Research",
  );

  assert.equal(
    localized,
    "Microsoft Research описала MagenticLite, MagenticBrain и Fara1.5 как агентный стек для малых моделей: он связывает браузер, локальную файловую систему, специализированные модели и оркестрацию для повседневных задач.",
  );
}

{
  const localized = coerceEnglishFactToRussianFallback(
    "5 Blue Jays pitchers combine on 3-hit shutout of Yankees",
    "MLB News",
  );

  assert.equal(
    localized,
    "Пять питчеров «Торонто Блю Джейс» вместе оформили сухой матч против «Нью-Йорк Янкиз», позволив сопернику только три хита.",
  );
}

{
  const localized = coerceEnglishFactToRussianFallback(
    "Join ESA for a total solar eclipse on 12 August 2026 — Follow the total solar eclipse with the European Space Agency (ESA), in person or online.",
  );

  assert.equal(
    localized,
    "ESA анонсировало сопровождение полного солнечного затмения 12 августа 2026 года в очном и онлайн-формате.",
  );
}

{
  const localized = coerceEnglishFactToRussianFallback(
    "Atlas reveals rocks with rare earth element potential, helping pinpoint new deposits — A new atlas charts the global distribution of unusual, critical-metal-bearing igneous rocks, finding that they often form near the thick and ancient cores of the world's major continents.",
  );

  assert.equal(
    localized,
    "Новый атлас показал глобальное распределение редких магматических пород с потенциалом редкоземельных элементов и помогает точнее искать новые месторождения.",
  );
}

{
  const localized = coerceEnglishFactToRussianFallback(
    "USD/RUB fell by -0.14 versus the previous fixing, ending at 72.98 on 2026-05-16.",
  );

  assert.equal(
    localized,
    "USD/RUB снизился на -0.14 к предыдущему фиксингу и закрылся на 72.98 2026-05-16.",
  );
}

{
  const localized = coerceEnglishFactToRussianFallback(
    "Bitcoin traded near $104000 / €96000 / ₽8240000 with a 24h move of +1.25%.",
  );

  assert.equal(
    localized,
    "Bitcoin торговался около $104000 / €96000 / ₽8240000 при изменении за 24 часа +1.25%.",
  );
}
