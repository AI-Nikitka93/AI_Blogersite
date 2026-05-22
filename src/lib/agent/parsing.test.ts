import assert from "node:assert/strict";

import { ensurePostShape } from "./parsing";

{
  const post = ensurePostShape(
    {
      title: "Cиннер взял трофеи всех девяти Мастерсов",
      source: "Sports.ru",
      observed: ["Cиннер выиграл еще один турнир серии Мастерс."],
      inferred:
        "Cиннер выиграл еще один турнир серии Мастерс.\n\nФакт остается спортивной строкой.",
      opinion: "Cиннер важен как проверка формы.",
      cross_signal: "",
      hypothesis: "",
      reasoning: "Проверяется смешанный латинско-кириллический символ.",
      confidence: "medium",
      category: "Sports",
    },
    {
      category_hint: "Sports",
      source: "Sports.ru",
      facts: ["Cиннер выиграл еще один турнир серии Мастерс."],
    },
    "Проверяется смешанный латинско-кириллический символ.",
    "medium",
  );

  assert.equal(post.title.startsWith("Синнер"), true);
  assert.equal(post.observed[0].startsWith("Синнер"), true);
}

{
  const post = ensurePostShape(
    {
      title: "Гандбол получил один ясный счет",
      source: "Sport-Express",
      observed: [
        "Сборная России по гандболу обыграла Гонконг в матче международного товарищеского турнира в Ганьчжоу — 44:11.",
      ],
      inferred: "Сборная России по гандболу обыграла Гонконг со счетом 44:11.",
      opinion: "Это один проверяемый результат, а не смесь разных турниров.",
      cross_signal: "",
      hypothesis: "",
      reasoning: "Факт держится на конкретном счете.",
      confidence: "medium",
      category: "Sports",
    },
    {
      category_hint: "Sports",
      source: "Sport-Express",
      facts: [
        "Сборная России по гандболу обыграла Гонконг в матче международного товарищеского турнира в Ганьчжоу — 44:11.",
      ],
    },
    "Факт держится на конкретном счете.",
    "medium",
  );

  assert.equal(post.observed.length, 1);
}

{
  const sourceFact =
    "Amazon Science сообщила о scaling law, который помогает выбирать LLM-архитектуры с ростом throughput до 47% без потери accuracy.";
  const post = ensurePostShape(
    {
      title: "LLM стали быстрее на уровне архитектуры",
      source: "Amazon Science",
      observed: [
        sourceFact,
        "Microsoft Research отдельно описала риски AI delegation в документах.",
      ],
      inferred:
        "Главный факт здесь в том, что ускорение модели связано с проверяемым архитектурным выбором.",
      opinion: "Модель не должна смешивать соседние RSS-истории.",
      cross_signal: "",
      hypothesis: "",
      reasoning: "Единственный source fact должен остаться единственным observed.",
      confidence: "high",
      category: "Tech",
    },
    {
      category_hint: "Tech",
      source: "Amazon Science",
      source_url: "https://www.amazon.science/blog/example",
      source_published_at: "2026-05-15T13:00:00.000Z",
      event_date: "2026-05-15",
      facts: [sourceFact],
      corroborating_sources: [
        {
          source: "Amazon Science",
          url: "https://www.amazon.science/blog/example",
          published_at: "2026-05-15T13:00:00.000Z",
        },
      ],
    },
    "Единственный source fact должен остаться единственным observed.",
    "high",
  );

  assert.deepEqual(post.observed, [sourceFact]);
}

{
  const post = ensurePostShape(
    {
      title: "Модель не должна владеть источником",
      source: "Model",
      source_url: "https://fake.example/llm",
      source_published_at: "2030-01-01T00:00:00.000Z",
      event_date: "2030-01-01",
      corroborating_sources: [
        {
          source: "Fake",
          url: "https://fake.example/extra",
          published_at: "2030-01-01",
        },
      ],
      observed: ["NASA опубликовала новый технический материал."],
      inferred:
        "NASA опубликовала новый технический материал.\n\nФакт остается проверяемым через исходный URL.",
      opinion: "Источник должен приходить из connector payload.",
      cross_signal: "",
      hypothesis: "",
      reasoning: "Проверяется серверная source metadata.",
      confidence: "medium",
      category: "Tech",
    },
    {
      category_hint: "Tech",
      source: "NASA Technology",
      source_url: "https://www.nasa.gov/real",
      source_published_at: "2026-05-15T04:00:00.000Z",
      event_date: "2026-05-15",
      facts: ["NASA опубликовала новый технический материал."],
      corroborating_sources: [
        {
          source: "NASA Technology",
          url: "https://www.nasa.gov/real",
          published_at: "2026-05-15T04:00:00.000Z",
        },
      ],
    },
    "Проверяется серверная source metadata.",
    "medium",
  );

  assert.equal(post.source_url, "https://www.nasa.gov/real");
  assert.equal(post.source_published_at, "2026-05-15T04:00:00.000Z");
  assert.equal(post.event_date, "2026-05-15");
  assert.deepEqual(post.corroborating_sources, [
    {
      source: "NASA Technology",
      url: "https://www.nasa.gov/real",
      published_at: "2026-05-15T04:00:00.000Z",
    },
  ]);
}
