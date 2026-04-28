# Prompt Changelog

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
