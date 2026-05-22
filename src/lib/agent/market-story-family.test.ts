import assert from "node:assert/strict";

import { findMarketStoryFamilyConflict } from "./market-story-family";

function marketPost(input: {
  title: string;
  inferred?: string;
  observed?: string[];
  created_at?: string;
}) {
  return {
    category: "Markets",
    title: input.title,
    inferred: input.inferred ?? "",
    observed: input.observed ?? [],
    cross_signal: "",
    hypothesis: "",
    created_at: input.created_at ?? "2026-05-22T00:00:00.000Z",
  } as const;
}

{
  const conflict = findMarketStoryFamilyConflict(
    marketPost({
      title: "USD/RUB снова ниже 71,07, давление на экспорт сохраняется",
      inferred:
        "Рублевое движение опять читается через экспортную выручку и слабый долларовый поток.",
      observed: ["Frankfurter: USD/RUB снизился до 71,07."],
    }),
    [
      marketPost({
        title: "Снижение USD/RUB до 71,09 усиливает давление на российский экспорт",
        inferred:
          "Движение доллара к рублю снова упирается в экспортную выручку и спрос на валюту.",
        observed: ["Frankfurter: USD/RUB снизился до 71,09."],
        created_at: "2026-05-21T22:00:00.000Z",
      }),
    ],
    new Date("2026-05-22T01:00:00.000Z"),
  );

  assert.equal(
    conflict,
    "Снижение USD/RUB до 71,09 усиливает давление на российский экспорт",
  );
}

{
  const conflict = findMarketStoryFamilyConflict(
    marketPost({
      title: "USD/BYN повторил снижение и снова давит на экспортную рамку",
      inferred:
        "Долларовая слабость переносит тот же экспортный тезис в белорусский рубль.",
      observed: ["Frankfurter: USD/BYN снизился на свежем срезе."],
    }),
    [
      marketPost({
        title: "Снижение USD/RUB до 71,09 усиливает давление на российский экспорт",
        inferred:
          "Движение доллара к рублю снова упирается в экспортную выручку и спрос на валюту.",
        observed: ["Frankfurter: USD/RUB снизился до 71,09."],
        created_at: "2026-05-21T22:00:00.000Z",
      }),
    ],
    new Date("2026-05-22T01:00:00.000Z"),
  );

  assert.equal(
    conflict,
    "Снижение USD/RUB до 71,09 усиливает давление на российский экспорт",
  );
}

{
  const conflict = findMarketStoryFamilyConflict(
    marketPost({
      title: "Bitcoin удержал 24-часовой рост после притока в ETF",
      inferred:
        "Крипторынок держится на отдельном потоке спроса, не на валютной паре USD/RUB.",
      observed: ["CoinGecko: bitcoin вырос за 24 часа."],
    }),
    [
      marketPost({
        title: "Снижение USD/RUB до 71,09 усиливает давление на российский экспорт",
        inferred: "Движение доллара к рублю снова упирается в экспортную выручку.",
        observed: ["Frankfurter: USD/RUB снизился до 71,09."],
        created_at: "2026-05-21T22:00:00.000Z",
      }),
    ],
    new Date("2026-05-22T01:00:00.000Z"),
  );

  assert.equal(conflict, null);
}

{
  const conflict = findMarketStoryFamilyConflict(
    marketPost({
      title: "USD/RUB снова ниже 71,07, давление на экспорт сохраняется",
      inferred: "Рублевое движение опять читается через экспортную выручку.",
      observed: ["Frankfurter: USD/RUB снизился до 71,07."],
    }),
    [
      marketPost({
        title: "Снижение USD/RUB до 71,09 усиливает давление на российский экспорт",
        inferred: "Движение доллара к рублю снова упирается в экспортную выручку.",
        observed: ["Frankfurter: USD/RUB снизился до 71,09."],
        created_at: "2026-05-19T00:00:00.000Z",
      }),
    ],
    new Date("2026-05-22T01:00:00.000Z"),
  );

  assert.equal(conflict, null);
}
