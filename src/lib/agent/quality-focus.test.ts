import assert from "node:assert/strict";

import { focusPayloadForGeneration } from "./quality";

{
  const focused = focusPayloadForGeneration(
    {
      category_hint: "Sports",
      source: "Sport-Express",
      facts: [
        "Сборная России по гандболу обыграла Гонконг в матче международного товарищеского турнира в Ганьчжоу — 44:11.",
        "Сидни Кросби вошел в состав сборной Канады на чемпионат мира по хоккею-2026.",
        "АПЛ опубликовала список номинантов на звание лучшего футболиста сезона-2025/26.",
      ],
    },
    "sports",
  );

  assert.deepEqual(focused.facts, [
    "Сборная России по гандболу обыграла Гонконг в матче международного товарищеского турнира в Ганьчжоу — 44:11.",
  ]);
}

{
  const focused = focusPayloadForGeneration(
    {
      category_hint: "Tech",
      source: "NASA Technology",
      facts: [
        "Анализ показал, где искусственное освещение ночью усилилось, а где оно уменьшилось.",
        "Технология NASA по 3D-печати помогает строить более прочные здания на Земле.",
      ],
    },
    "tech_world",
  );

  assert.deepEqual(focused.facts, [
    "Анализ показал, где искусственное освещение ночью усилилось, а где оно уменьшилось.",
  ]);
}
