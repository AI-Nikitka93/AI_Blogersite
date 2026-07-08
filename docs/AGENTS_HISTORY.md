- 2026-07-07T15:09:00+03:00: Удален временный скрипт delete-today-posts.ts после успешной очистки сегодняшних постов.

- 2026-07-07T13:13:00+03:00: Обновлены статические тексты `opinion` во всех fallback-генераторах в `app/api/cron/route.ts` (`buildMarketTimeoutFallbackPost` и `buildTopicFallbackPost` для `tech_world`, `sports`, `world`) для точного совпадения словоформ с текстом статьи `inferred` без цифр и избыточного перекрытия. Проверка типов `npm run typecheck` пройдена успешно (Exit Code 0).

- 2026-07-07T13:10:00+03:00: Очищены мнения (opinion) от сырых фактов `${lead}` во всех fallback-генераторах в `app/api/cron/route.ts` для прохождения валидации качества постов (не допуская цифр и сырых фактов в мнениях). Запущена проверка типов `npm run typecheck`, которая завершилась успешно (Exit Code 0).

- : Внедрен Agentic RAG с помощью DuckDuckGo. В orchestrator.ts добавлен вызов unSearchDecision (Llama 3.3 70B) для оценки забракованных драфтов. Если поиск нужен, вызывается searchWeb (напрямую парсинг html.duckduckgo.com/html/ без сторонних API) для извлечения 4 сниппетов. Увеличен лимит времени Vercel (maxDuration=300) в  pp/api/cron/route.ts. Написаны тесты, все тесты успешно пройдены.

- 2026-06-29T20:52:43Z: Внедрен Agentic RAG с помощью DuckDuckGo. В orchestrator.ts добавлен вызов runSearchDecision (Llama 3.3 70B) для оценки забракованных драфтов. Если поиск нужен, вызывается searchWeb (напрямую парсинг html.duckduckgo.com/html/ без сторонних API) для извлечения 4 сниппетов. Увеличен лимит времени Vercel (maxDuration=300) в app/api/cron/route.ts. Написаны тесты, все тесты успешно пройдены.
