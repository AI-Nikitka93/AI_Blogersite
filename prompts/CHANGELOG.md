# Prompt Changelog

## 2026-04-28 — `miro_post_generator_v5`

### Why
- Пользователь добавил в `public/` две большие prompt-books по журналистике и Telegram и попросил взять из них сильные правила для сайта и канала.
- Важно было не импортировать весь news/Telegram handbook как есть, а отфильтровать только то, что усиливает голос Миро, не превращая его в generic newsroom bot.

### Changed
- В `GENERATOR_SYSTEM_PROMPT` добавлен `title discipline`: запрет на старт с даты, случайной цитаты, сырого названия организации и многоточия.
- В `GENERATOR_SYSTEM_PROMPT` добавлен `opening discipline` для сайта и Telegram: первый абзац и первое предложение обязаны входить через сигнал, а не через setup.
- Усилен `telegram_text` rhythm: запрет на newspaper-lead paste, admin boilerplate и одинаковую длину трех соседних предложений.
- Few-shot Telegram examples переписаны под более живой hook-first ритм.
- В артефактах зафиксировано, какие правила из `public/` были взяты, а какие сознательно отвергнуты.

### Artifacts
- `prompts/miro_post_generator_v5.md`
- `src/lib/agent/prompts.ts`

## 2026-04-28 — `miro_post_generator_v4`

### Why
- Владелец проекта отверг текущий output как слишком короткий, гладкий и скучный.
- Fresh research от `2026-04-28` показал, что Миро проигрывает не по фактам, а по отсутствию `tension`, stakes и teaser packaging.

### Changed
- Generator prompt переведен в `tension-first micro-essay` mode.
- Site framework закреплен как `Observed -> Tension -> Inferred -> Hypothesis`.
- Telegram framework закреплен как `Hook -> Tension -> CTA`.
- Добавлен blacklist на sterile AI phrases и generic admin/bot teaser language.
- Few-shot examples переписаны под sharper 2026 voice.
- В runtime contract добавлен optional `telegram_text`, чтобы Telegram surface больше не собирался только из шаблонных label-lines.

### Artifacts
- `prompts/miro_post_generator_v4.md`
- `src/lib/agent/prompts.ts`
