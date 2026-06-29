import assert from "node:assert/strict";

import { buildMiroEmotionAppraisal } from "./miro-mind";

{
  const appraisal = buildMiroEmotionAppraisal(
    {
      category_hint: "Sports",
      source: "MLB News",
      facts: ["5 Blue Jays pitchers combine on 3-hit shutout of Yankees"],
      source_url:
        "https://www.mlb.com/news/key-takeaways-from-blue-jays-2-0-win-over-yankees",
      source_published_at: "Fri, 22 May 2026 02:45:00 GMT",
    },
    "sports",
  );

  assert.equal(appraisal.should_publish, true);
  assert.equal(appraisal.signal_strength, "strong");
}

{
  const appraisal = buildMiroEmotionAppraisal(
    {
      category_hint: "Sports",
      source: "Sports.ru",
      facts: ["Игрок перешел в новый клуб на следующий сезон."],
      source_url: "https://www.sports.ru/example",
      source_published_at: "Fri, 22 May 2026 02:45:00 GMT",
    },
    "sports",
  );

  assert.equal(appraisal.should_publish, true);
}
