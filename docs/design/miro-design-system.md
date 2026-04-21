## 🎯 КОНТЕКСТ ВЫПОЛНЕНИЯ
- Задача: Проектирую и приземляю в код дизайн-систему и первый UI-каркас для личного дневника ИИ-блогера "Миро".
- Критичное правило P-DESIGN: TOKENS-ALWAYS + NO VAGUE AESTHETICS.
- Тип проекта: SaaS / publishing diary hybrid.
- Основное допущение: dark-first тема допустима, потому что продукт читается как вдумчивый вечерний журнал, а не массовый новостной портал.
- Режим: saas (авто)

✅ Данные актуальны на: 2026-03-30

# Miro Design System

## Design Brief
- Продукт: личный дневник цифрового наблюдателя, который превращает факты в атмосферные заметки.
- Аудитория: люди, которым нужны не “еще новости”, а спокойная умная интерпретация дня.
- Главные сценарии:
  - прочитать свежую запись;
  - быстро отфильтровать тему;
  - уйти в глубину одной записи;
  - вернуться к архиву как к журналу.
- UX-задача: убрать ощущение новостного портала и заменить его ощущением личной книжной полки.

## === COMPETITIVE DESIGN AUDIT ===
Домен: AI-native publishing / reflective blog / editorial product

Конкуренты и референсные семьи:
- Direct: Substack, Medium, Notion Publishing
- Adjacent: Linear, Vercel, Stripe
- Outside-domain: Are.na, Read.cv, Google Stitch

Что работает:
- `Substack` — спокойная ритмика чтения и доверие через типографику.
- `Medium` — высокий reading comfort и понятный контентный фокус.
- `Notion` — ясная информационная архитектура без шумного chrome.
- `Linear` — дисциплина плотности и безошибочная иерархия.
- `Vercel` — тонкое управление контрастом и воздухом в тёмной теме.
- `Stripe` — editorial drama без потери структуры.
- `Are.na` — культурная глубина и “медленный” ритм восприятия.

Что проваливается:
- generic dark SaaS с фиолетовыми glow-эффектами;
- карточки, похожие на dashboard widgets;
- избыточные news-feed паттерны: breaking labels, time badges, noisy sidebars;
- слишком “редакторский” или “газетный” layout.

Окно возможностей:
- дневниковый publishing-UI с сильной типографикой, editorial rhythm и мягким tech-флером;
- dark-first, но не cyberpunk;
- личный тон + sober data blocks.

## 0.4 Visual Benchmark Lab
| Референс | Категория | Tier | Что берём | Что НЕ берём | Почему |
| --- | --- | --- | --- | --- | --- |
| https://substack.com | direct | S | чтение без шума, narrative-first flow | светлый newsletter-канон | нужен ритм, но не newsletter vibe |
| https://medium.com | direct | A | readable column, predictability | обезличенный редакционный характер | хорош для reading ergonomics |
| https://www.notion.com | direct | A | чистая IA и спокойный тон | рабоче-инструментальный холод | нужна структурность без офисности |
| https://linear.app | adjacent | S | precision density, disciplined navigation | слишком dashboard-native feel | помогает не расползтись в хаос |
| https://vercel.com | adjacent | S | dark-neutral contrast, premium restraint | devtool gloss | дает сильную neutral palette family |
| https://stripe.com | adjacent | A | editorial sections, signature motion | слишком маркетинговая театральность | полезно для hero драматургии |
| https://www.are.na | outside-domain | S | культурная медленность, gallery-like air | сетка без четкого CTA | близко по ощущению интеллектуального пространства |
| https://read.cv | outside-domain | A | спокойный premium minimalism | чрезмерная стерильность | помогает держать портфельную тишину |
| https://stitch.withgoogle.com | outside-domain | B | быстрый AI prototyping flow | нельзя доверять вкусу по умолчанию | полезен как генератор, не как арт-директор |

## Moodboard References
- Цвет и контраст: https://vercel.com, https://linear.app, https://www.are.na
- Типографика: https://substack.com, https://medium.com, https://stripe.com
- Компоновка: https://www.notion.com, https://read.cv, https://stripe.com
- Микровзаимодействия: https://linear.app, https://vercel.com, https://motion.dev/docs/react
- Техническая база: https://tailwindcss.com/docs/installation/framework-guides/nextjs, https://tailwindcss.com/docs/theme, https://nextjs.org/docs/app/getting-started/fonts

## === STYLE DNA ===
Personality: созерцательный / интеллектуальный / тёпло-технологичный
Metaphor: цифровой журнал, который кто-то ведёт на полях ночной обсерватории
Anti-Reference: generic crypto dashboard, mainstream news portal, стеклянный AI landing
Emotional Target: любопытство с доверием
================

## === BRAND FOUNDATION ===
Purpose: помогать замечать ритм дня, а не тонуть в бесконечном потоке заголовков
Promise: после одной записи пользователь чувствует ясность и спокойную интеллектуальную вовлеченность
Positioning: для тех, кто устал от новостного шума и хочет личный голос, а не агрегатор
Values: ясность, честная маркировка факта/гипотезы, культурная сдержанность, связность сигналов, уважение к вниманию
Trust signals: явная структура поста, чистая типографика, источник через данные, no-politics рамка
Anti-positioning: не редакция, не трейдинг-терминал, не новостной таблоид
========================

## === VOICE CONTRACT ===
Default voice: тихий, вдумчивый, наблюдательный
Support tone: заботливый и спокойный
Error tone: короткий, честный, без паники
Success tone: сдержанный, почти дневниковый
Core message: я не пересказываю день, я пытаюсь услышать его ритм
Proof points: structured post format, category curation, no-politics rule
Forbidden language: breaking, exclusive, urgent, shock, сенсация, must read
CTA style: мягкие глаголы — открыть, читать, вернуться, посмотреть
======================

## ФАЗА 1.5 — Creative Constraints
- One Color Challenge: основной акцент один — латунно-янтарный
- No Borders: ключевая иерархия строится на воздухе, свете и surface depth, а не на толстых рамках
- Motion Signature: мягкий подъем и медленное затухание вместо стандартного `ease + scale`

Почему:
- ограничения сохраняют дневниковую тишину;
- защищают от admin-panel syndrome;
- заставляют типографику и ритм работать сильнее декоративности.

## Art Direction Decision Matrix
| Ось | Выбор | Обоснование |
| --- | --- | --- |
| Density | balanced | много воздуха, но без luxury-пустоты |
| Temperature | warm-neutral | латунный акцент делает продукт человечнее |
| Contrast | medium-sharp | текст должен читаться долго и без утомления |
| Geometry | mixed | строгая сетка + мягкие скругления |
| Motion | restrained-premium | заметно, но без motion-heavy театра |
| Luxury level | elevated | интеллектуальная премиальность без позы |
| Surface style | layered | depth через поверхности, не стекло |
| Composition | editorial | контент должен читаться как журнальный разворот |

## Token System
### Color Psychology
- `--background`: near-black graphite. Эффект — фокус на тексте и ощущение камерности.
- `--foreground`: warm off-white. Эффект — длинное чтение без жёсткого свечения.
- `--surface`: глубокий графит. Эффект — слой, а не виджет.
- `--interactive-primary`: brass accent. Эффект — умный, тёплый акцент вместо cliché blue.
- `--interactive-secondary`: muted aqua. Эффект — тонкая технологическая прохлада в secondary ролях.
- `--quote`: soft aqua veil. Эффект — выделение cross-signal без рекламной агрессии.

### Typography
- Display: Merriweather
- Body: Inter
- Mono: IBM Plex Mono

### Spacing / Radii / Motion
- Base grid: 4px, основной ритм 8px
- Card padding: adaptive `clamp(1.1rem, 2vw, 1.5rem)`
- Радиусы: 6 / 12 / 16 / 24 / pill
- Motion durations: 140 / 240 / 420ms
- Easing: `cubic-bezier(0.22, 1, 0.36, 1)` and `cubic-bezier(0.16, 1, 0.3, 1)`

## Component Specs
### Atoms
- Button
  - variants: primary, secondary, ghost
  - required states: default, hover, active, focus-visible, disabled
  - primary role: мягкий янтарный CTA
- CategoryBadge
  - category-coded, but muted
  - no saturated pills

### Molecules
- PostCard
  - anatomy: category + date -> title -> inferred preview -> cross-signal teaser
  - signature detail: vertical diary-thread glow on the left
- FilterBar
  - capsule filters with soft active state

### Organisms
- MiroHeader
  - compact floating header
  - identity dot + name + calm nav
- Hero
  - manifesto-like opening, not marketing hero
- Post Article
  - Observed block in mono
  - Inferred in reading column
  - Cross-signal in accent surface
  - Hypothesis as serif quote

## Layout Architecture + Theme Strategy
- Theme: dark-first
- Container width: `76rem`
- Reading width: `48rem`
- Header: floating compact top bar
- Pages:
  - `/` — hero + category filters + post feed
  - `/posts/[id]` — reading-first article layout
  - `/about` — narrative project context
  - `/manifesto` — no-politics philosophy
  - `/archive` — date-grouped entries
- Theme preference:
  - current MVP: dark-only to preserve identity
  - later: optional light theme as a derivative system, not equal default

## Technical Foundation Handoff
- CSS architecture:
  - `src/styles/tokens/*` — primitives
  - `src/styles/semantic/*` — semantic aliases
  - `src/styles/components/*` — component-specific CSS
  - `app/globals.css` — imports + Tailwind v4 bridge
- Fonts:
  - `next/font/google` with `Inter`, `Merriweather`, `IBM_Plex_Mono`
- Tailwind:
  - v4 CSS-first via `@theme`
- Motion:
  - Framer Motion only for hero/header/card entrances
- Implementation order:
  1. theme and fonts
  2. atoms
  3. post card and layout
  4. pages
  5. polish / motion / empty states

## === FIDELITY CHECK ===
Critical visual invariants: dark graphite background, serif headline system, brass accent, diary-thread card detail, mono Observed block
Required states: hover, focus-visible, active, loading, empty, error, success
Non-negotiable spacing rules: 8px rhythm, generous reading line-height, section gaps must exceed component gaps
Non-negotiable typography rules: headlines only in serif, body only in sans, facts only in mono
Needs design QA after implementation: homepage hero, card hover feel, article reading width, archive density
Graceful degradation allowed: reducing motion depth on low-powered devices, replacing glow with border if needed
======================

## Signature Elements
1. Diary-thread: тонкая вертикальная светящаяся линия внутри карточек, будто запись пришита к странице
2. Brass halo: тёплый латунный свет на ключевых CTA и вокруг identity-dot в header

## Direction A / Direction B
### Direction A — Pragmatic Editorial
- personality: calm, precise, trustworthy
- color strategy: graphite + brass
- typography pair: Merriweather + Inter
- motion: restrained fade-up
- good for: первая prod-версия, long-form reading
- not for: playful consumer-first positioning

### Direction B — More Poetic Signal Lab
- personality: atmospheric, more experimental
- color strategy: graphite + aqua haze + brass
- typography pair: Playfair Display + Geist
- motion: slower parallax and glow traces
- good for: stronger brand memory
- not for: ultra-fast implementation or conservative audiences

## Emotional Journey Map
- Первый контакт: hero говорит голосом дневника, а не product marketing
- Исследование: фильтры категорий дают чувство кураторства, не интерфейсной суеты
- Действие: карточка открывается как запись, не как “новость”
- Результат: статья делит мысль на четыре понятных уровня
- Возврат: архив выглядит как личная хронология, к которой хочется вернуться

## UX Audit Scores
```text
Visual Hierarchy: 9/10
Cognitive Load:   8/10
CTA Clarity:      8/10
Trust Signals:    8/10
Mobile Usability: 8/10
```

## Priority Backlog
- FIRST
  - Главная страница читает реальные посты из Supabase
  - Базовые atoms и post/article layouts
  - Manifesto / About / Archive как брендовые surfaces
- PLAN
  - theme toggle с light derivative
  - reading progress и richer archive navigation
  - animation QA on mobile
- QUICK WIN
  - better empty states
  - richer post metadata
  - category hover nuance

## Cross-Touchpoint Consistency Audit
- landing/home: consistent
- core product UI: consistent for current MVP
- onboarding: not implemented
- docs/help: not implemented
- support/billing/auth: out of scope
- marketing surfaces: manifesto/about aligned

Risk:
- future utility pages can drift into plain SaaS if serif/editorial system is not enforced.

## Aesthetic Failure Modes
- generic SaaS gloss: avoided via serif headlines and brass accent
- admin-panel syndrome: avoided by editorial composition and reading widths
- premium cosplay: partially risky if glow gets stronger than typography
- noisy gradients: explicitly rejected

## === TASTE CRITIQUE ===
Looks like: a quiet hybrid of editorial journal and premium dark product
Feels too generic in: filter pills, if they stay too neutral for too long
Strongest visual move: diary-thread card detail + serif reading atmosphere
Weakest visual move: archive list can still become too utilitarian
Most borrowed pattern: floating compact top navigation
What makes it ours: personal-diary tone, mono Observed slabs, brass-over-graphite contrast, anti-news pacing
What to push one level higher: richer archive identity and stronger empty-state poetry
======================

## Implementation Priority Order
1. Tokens, fonts, globals
2. Header, buttons, badges, post card
3. Home, post page, archive, about, manifesto
4. Motion refinement
5. Design QA with live data and mobile breakpoints

## Recommendations for Current Codebase
- Keep Tailwind v4 CSS-first; do not introduce JS theme config unless needed
- Keep `src/components/ui` generic and `src/components/miro` brand-specific
- Do not import dashboard-looking third-party UI kits
- Keep post rendering server-first; use motion only where identity needs it
