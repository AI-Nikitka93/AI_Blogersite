import assert from "node:assert/strict";

import {
  extractStorySubjectKeys,
  findStorySubjectConflict,
} from "./story-subject-novelty";

{
  const keys = extractStorySubjectKeys({
    title: "Turnstile сохраняет token ID для обучения агентов",
    observed: [
      "Amazon Science представила Rust-прокси Turnstile, который сохраняет token ID во взаимодействиях агента.",
    ],
  });

  assert.ok(keys.has("turnstile"));
}

{
  const conflict = findStorySubjectConflict(
    {
      title: "Turnstile фиксирует token ID в агентных сессиях",
      observed: [
        "Amazon Science описала Turnstile как Rust-прокси для сохранения token ID.",
      ],
      created_at: "2026-06-30T12:00:00.000Z",
    },
    [
      {
        title: "Turnstile сохраняет token ID для обучения агентов",
        observed: [
          "Amazon Science представила Rust-прокси Turnstile, который сохраняет token ID во взаимодействиях агента.",
        ],
        created_at: "2026-06-30T08:00:00.000Z",
      },
    ],
    new Date("2026-06-30T14:00:00.000Z"),
  );

  assert.equal(conflict, "Turnstile сохраняет token ID для обучения агентов");
}

{
  const conflict = findStorySubjectConflict(
    {
      title: "Сдвиг в обучении агентов: SkillOpt делает навыки параметрами",
      observed: [
        "Microsoft Research представила SkillOpt как способ обучать навыки агентов без изменения весов модели.",
      ],
      source_url:
        "https://www.microsoft.com/en-us/research/blog/skillopt-agent-skills-as-trainable-parameters/",
      created_at: "2026-06-30T16:00:00.000Z",
    },
    [
      {
        title: "SkillOpt: навыки агентов как обучаемые параметры",
        observed: [
          "SkillOpt превращает редактирование навыков AI-агентов в процесс обучения.",
        ],
        source_url:
          "https://www.microsoft.com/en-us/research/blog/skillopt-agent-skills-as-trainable-parameters/?utm_source=rss",
        created_at: "2026-06-30T10:00:00.000Z",
      },
    ],
    new Date("2026-06-30T18:00:00.000Z"),
  );

  assert.equal(conflict, "SkillOpt: навыки агентов как обучаемые параметры");
}

{
  const conflict = findStorySubjectConflict(
    {
      title: "Новый атлас показал редкие магматические породы",
      observed: ["Новый атлас показал глобальное распределение редких пород."],
      created_at: "2026-06-30T12:00:00.000Z",
    },
    [
      {
        title: "SpaceX успешно вывела спутник на орбиту",
        observed: ["SpaceX завершила запуск ракеты Falcon."],
        created_at: "2026-06-30T08:00:00.000Z",
      },
    ],
    new Date("2026-06-30T14:00:00.000Z"),
  );

  assert.equal(conflict, null);
}

{
  const conflict = findStorySubjectConflict(
    {
      title: "Turnstile сохраняет token ID для обучения агентов",
      observed: [
        "Amazon Science представила Rust-прокси Turnstile, который сохраняет token ID во взаимодействиях агента.",
      ],
      created_at: "2026-06-28T08:00:00.000Z",
    },
    [
      {
        title: "Старый пост про Turnstile",
        observed: ["Turnstile сохраняет token ID."],
        created_at: "2026-06-24T08:00:00.000Z",
      },
    ],
    new Date("2026-06-28T10:00:00.000Z"),
  );

  assert.equal(conflict, null);
}