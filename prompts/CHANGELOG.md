# Prompt Changelog

## 2026-04-01 — `3.0.0`

### Added
- `miro_post_generator_v3.md`

### Changed
- Website generation is now framed as a short factual article instead of a compact diary note.
- `inferred` is now treated as article body with paragraph breaks.
- Prompt explicitly forbids invented quotes and uses lead -> nut graf -> detail flow.
- Telegram is treated as a separate teaser surface instead of a mirror of the website text.

## 2026-04-01 — `2.0.0`

### Added
- `miro_post_generator_v2.md`

### Changed
- Generator prompt reframed around one dominant signal instead of forced unity across all facts.
- `cross_signal` and `hypothesis` are now optional in spirit and may return empty strings.
- Added anti-cliche blacklist to suppress stock openings and reusable generic titles.
- Added a second few-shot example that demonstrates a stronger concrete note with empty optional fields.
- Recommended generator settings updated to slightly higher temperature and token budget for more natural variation.

## 2026-03-31 — `1.1.0`

### Changed
- `miro_anti_politics_gatekeeper_v1.md`
- Добавлено явное правило: Global Voices, ScienceDaily, Hacker News, GDELT и другие RSS-источники не считаются "безопасными по названию источника".
- Добавлено явное требование блокировать политические заголовки из новых RSS/HN источников так же строго, как и из прежних коннекторов.
- Расширен список примеров источников в gatekeeper prompt: теперь он явно упоминает `Onliner` и `BELTA`.
- Список примеров расширен еще и под спортивные RSS-источники: `Sports.ru`, `Sport-Express`, `Pressball`.

## 2026-03-30 — `1.0.0`

### Added
- `miro_anti_politics_gatekeeper_v1.md`
- `miro_post_generator_v1.md`
- JSON-only contracts for both prompts
- Two few-shot examples for Miro post generation
- Eval datasets for gatekeeper and post generator
- Initial eval report with structural/spec validation

### Notes
- Live model eval on Groq was not executed because `GROQ_API_KEY` is absent in the current environment.
- Prompts are versioned and ready for integration, but production confidence still requires live regression runs.
