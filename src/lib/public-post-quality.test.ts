import assert from "node:assert/strict";

import { getPublicPostBlockReason } from "./public-post-quality";

const basePost = {
  id: "test-post",
  title: "Стартовала миссия снабжения станции",
  source: "NASA News Releases",
  source_url: "https://www.nasa.gov/example",
  source_published_at: "2026-05-15T22:52:14+00:00",
  event_date: "2026-05-15",
  observed: [
    "Стартовала миссия снабжения станции с научными экспериментами.",
  ],
  inferred:
    "Регулярность доставки груза важна для орбитальной научной программы.",
  opinion:
    "Здесь важна доставка научного груза, а не ставка или совет читателю.",
  cross_signal: "",
  hypothesis: "",
  reasoning: "Проверяется public quality filter.",
  confidence: "medium",
  category: "World",
};

assert.equal(
  getPublicPostBlockReason({
    ...basePost,
    opinion: "Здесь важна доставка научного груза, а не общий космический фон.",
  }),
  null,
);

assert.equal(
  getPublicPostBlockReason(basePost),
  "public post contains blocked quality-risk phrasing",
);

const marketBasePost = {
  ...basePost,
  id: "market-test",
  title: "USD/RUB снизился после фиксинга",
  source: "Frankfurter",
  source_url: "https://api.frankfurter.dev/v2/rates",
  source_published_at: "2026-05-22T00:00:00.000Z",
  event_date: "2026-05-22",
  observed: ["Frankfurter: USD/RUB снизился до 71,09 на дневном фиксинге."],
  inferred:
    "Снижение USD/RUB усиливает давление на российский экспорт и спрос на энергопродукты.",
  opinion:
    "Главный риск здесь в экспортной выручке, хотя источник показывает только курс.",
  cross_signal: "Экспортная рамка не подтверждена фактическим слоем.",
  hypothesis: "Следующий фиксинг покажет, сохранится ли валютный разрыв.",
  reasoning: "Проверяется источник-опора для market macro claims.",
  category: "Markets",
};

assert.equal(
  getPublicPostBlockReason(marketBasePost),
  "public market post contains unsupported macro claim",
);

assert.equal(
  getPublicPostBlockReason({
    ...marketBasePost,
    observed: [
      "Frankfurter: USD/RUB снизился до 71,09; источник связывает движение с экспортной выручкой и спросом на энергопродукты.",
    ],
  }),
  null,
);

assert.equal(
  getPublicPostBlockReason({
    ...basePost,
    id: "b4b379db-437c-48fd-a30e-023c52b5b927",
  }),
  "public post is explicitly blocked",
);

assert.equal(
  getPublicPostBlockReason({
    ...basePost,
    id: "legacy-fallback-voice",
    inferred:
      "Опорный источник здесь важен не как вывеска. В тексте остаются только детали, которые не делают прогноз сильнее исходных данных.",
    opinion: "Практическая ценность записи остается ограниченной.",
  }),
  "public post contains blocked quality-risk phrasing",
);

assert.equal(
  getPublicPostBlockReason({
    ...basePost,
    id: "english-observed-prefix",
    observed: [
      "Источник фиксирует: Making LLMs faster without sacrificing accuracy through a model throughput scaling law.",
    ],
    inferred:
      "Amazon Science описала проверку ускорения LLM через пропускную способность модели.",
    opinion: "Русский публичный текст не должен оставлять сырой английский факт в observed.",
  }),
  "public post contains blocked quality-risk phrasing",
);

assert.equal(
  getPublicPostBlockReason({
    ...basePost,
    id: "truncated-prefix-title",
    title: "Пять питчеров «Торонто Блю Джейс» вместе оформили сухой",
    source: "MLB News",
    observed: [
      "Пять питчеров «Торонто Блю Джейс» вместе оформили сухой матч против «Нью-Йорк Янкиз», позволив сопернику только три хита.",
    ],
    opinion:
      "Коллективный сухой матч здесь важен как проверка глубины питчерской ротации.",
  }),
  "public post has truncated title",
);
