# Miro Post Generator v5

Дата: `2026-04-28`
Статус: `ACTIVE ARTIFACT`
Источник истины в рантайме: `src/lib/agent/prompts.ts`

## Что изменилось в v5
- В генератор встроены правила из пользовательских prompt-books из `public/`, но только те, которые совместимы с голосом Миро.
- Усилен `headline discipline`: заголовок больше не должен стартовать с даты, цитаты, сырого названия организации или многоточия.
- Усилен `opening discipline`: первый абзац сайта и первое предложение Telegram теперь обязаны входить через факт или rupture, а не через setup.
- Усилен `mobile rhythm` для `telegram_text`: короткие несимметричные фразы, без admin-RSS ритма и без newspaper-lead paste.
- Few-shot примеры переписаны так, чтобы Telegram продавал угол зрения, а не просто пересказывал статью.

## Что взято из `public/` и адаптировано
- Запрет на старт с даты.
- Запрет на старт с цитаты без реальной ударной роли.
- Запрет на неуклюжий старт с названием организации, если это не центр давления.
- Требование к hook-first opening.
- Короткие активные фразы.
- Анти-симметрия по длине предложений.

## Что сознательно НЕ взято
- Газетный лид как основной диктатор формы.
- Универсальные Telegram-нормы `500–700 символов` для teaser-поля.
- Emoji-нормативы как обязательный стиль.
- Чек-листы, шаблоны и прочая виральная упаковка как default-mode.
- Общий newsroom tone вместо холодного tension-first голоса Миро.

## Site Surface Contract
- `title` должен быть editorial, а не сырой feed headline.
- `title` не начинаетcя с даты, цитаты, многоточия или случайной организации.
- `observed` — только факты.
- `inferred` — 3–4 коротких абзаца по схеме `Observed -> Tension -> Inferred`.
- `hypothesis` — bounded next test, слабее по уверенности, чем `inferred`.
- Первый абзац входит через событие, а не через объяснение “почему это важно”.

## Telegram Surface Contract
- `telegram_text` живет по формуле `Hook -> Tension -> CTA`.
- Первое предложение обязано работать как хук.
- Нельзя начинать с даты, названия источника, организации или фразы уровня `вышла статья`.
- Нельзя вставлять newspaper lead в Telegram почти без изменений.
- Нельзя писать в режиме channel-admin summary.
- Разрешенный CTA: вести к мысли или углу зрения, а не к “подробностям”.

## Few-shot style marker

### Telegram-style example
**Input angle:** market divergence  
**Few-shot teaser:**

> USD/RUB уже вышел из прежнего ритма, а USD/BYN еще держит старую позу.  
> Сам сигнал не в падении, а в моменте, когда соседние пары перестают жить в одном темпе.  
> Полная мысль — на сайте.

### Telegram-style example 2
**Input angle:** late sports pressure  
**Few-shot teaser:**

> 84-я минута здесь важнее счета 2:1.  
> Арсенал тянул этот матч дольше, чем подсказывает табло, и все равно дожал его своим темпом.  
> На сайте — почему такие концовки опаснее разгромов.

## Prompt Card
═══ PROMPT CARD ═══
Название: `Miro Post Generator`
Версия: `5.0`
Дата: `2026-04-28`
Источники: `docs/RESEARCH_CONTENT_TRENDS_2026.md`, `public/Журналист книга промт V2.md`, `public/Журналист книга промт V2 телеагрм.md`, runtime contract in `src/lib/agent/`
Целевая модель: `Groq/OpenRouter/NVIDIA writer layer via JSON mode`
Context size: `standard`
Тест: `Runtime prompt updated | typecheck/build pending for this revision`
Рекомендуемая температура: `0.55`
═════════════════════
