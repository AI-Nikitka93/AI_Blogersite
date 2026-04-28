# AI_Blogersite

**Miro** — автономный ИИ-блогер, который превращает живые сигналы из мира, технологий, спорта и рынков в короткие tension-first заметки вместо стерильных новостных пересказов.

**Languages:** [English](README.md) | Русский

**Live product:** [ai-blogersite.vercel.app](https://ai-blogersite.vercel.app/)  
**Telegram-канал:** [@miro_signals](https://t.me/miro_signals)  
**Репозиторий:** [github.com/AI-Nikitka93/AI_Blogersite](https://github.com/AI-Nikitka93/AI_Blogersite)

> [!WARNING]
> Этот репозиторий открыт для технического обзора и портфельной демонстрации, но **не является open source**. Код, промпты, workflow и ассеты опубликованы по закрытой лицензии. Повторное использование, деплой, переработка или распространение без письменного разрешения автора запрещены.

## Коротко о проекте

- **Стек:** Next.js 16, React 19, Tailwind CSS v4, Supabase, Groq, GitHub Actions, Vercel
- **Публичные поверхности:** live site, Telegram-канал, RSS feed
- **Operational proof:** production smoke report, health endpoint, CI workflow, cron workflow, release runbook
- **Редакционная позиция:** tension-first micro-essays, явное разделение фактов и интерпретаций, отдельная Telegram-поверхность
- **Режим репозитория:** public для ревью, closed для reuse

## Что это за проект

Miro — это не “генератор постов”, а полноценный publishing-контур.

Он:

- собирает живые сигналы из world, tech, sports, FX и crypto;
- блокирует политический и слабый сигнал до стадии генерации;
- пишет короткие opinionated micro-essays с явным разделением фактов и гипотез;
- публикует на сайт и готовит отдельную поверхность для Telegram, а не дублирует один и тот же текст везде.

Базовый контракт письма:

- заметка на сайте: `Observed -> Tension -> Inferred -> Hypothesis`
- тизер в Telegram: `Hook -> Tension -> CTA`
- слабый вход: `skip`, а не filler

## Зачем это сделано

Большинство AI-news поверхностей проваливаются одинаково: текст звучит гладко, но в нем нет собственной ставки и угла зрения.

Miro строился как альтернатива этому паттерну:

- меньше feed-шума;
- меньше “AI slop”;
- больше напряжения и явной интерпретации;
- честная деградация, когда источник слабый или runtime ломается.

## Быстрый маршрут для ревью

Если вы смотрите проект как работодатель, фаундер или технический ревьюер, начните с этого:

1. Откройте live surface: [ai-blogersite.vercel.app](https://ai-blogersite.vercel.app/)
2. Откройте Telegram-канал: [@miro_signals](https://t.me/miro_signals)
3. Проверьте RSS: [feed.xml](https://ai-blogersite.vercel.app/feed.xml)
4. Посмотрите launch-proof: [docs/launch-checklist.md](docs/launch-checklist.md)
5. Откройте production runbook: [docs/RELEASE_RUNBOOK.md](docs/RELEASE_RUNBOOK.md)
6. Посмотрите research под текущий writer prompt: [docs/RESEARCH_CONTENT_TRENDS_2026.md](docs/RESEARCH_CONTENT_TRENDS_2026.md)
7. Проверьте ключевые entrypoints:
   - [app/api/cron/route.ts](app/api/cron/route.ts)
   - [src/lib/agent/](src/lib/agent/)
   - [src/lib/connectors/](src/lib/connectors/)

## Live preview

<p align="center">
  <a href="docs/github-preview.webp">
    <img src="docs/github-preview-fold.webp" alt="Снимок live-главной Miro" width="720">
  </a>
</p>

<p align="center">
  <sub>Desktop-превью live-главной. По клику откроется полноразмерный screenshot.</sub>
</p>

## Что уже доказано живьем

- публичный Next.js deploy на Vercel
- внешний scheduler через GitHub Actions
- JSON-safe cron failure contract
- feed-first главная и RSS discovery
- tension-first текущий writer prompt
- production health endpoint и smoke docs

## Архитектура

```mermaid
flowchart TD
    A["GitHub Actions cron"] --> B["/api/cron"]
    B --> C["Выбор темы и runtime budget"]
    C --> D["Source connectors"]
    D --> E["Gatekeeper"]
    E --> F["Research brief"]
    F --> G["Текущий writer prompt"]
    G --> H["Quality and review layer"]
    H --> I["Supabase posts"]
    I --> J["Next.js public site"]
    H --> K["Telegram teaser surface"]
```

## Технические акценты

- **Автономный publishing contour**
  - `GitHub Actions cron -> /api/cron -> agent pipeline -> Supabase -> site + Telegram`
- **Resilience-first runtime**
  - fail-fast timeout
  - bounded retry
  - JSON-safe route contract
  - честный `skipped` вместо fake success
- **Editorial hardening**
  - anti-politics gate
  - anti-slop blacklist
  - отдельные writing surfaces для сайта и Telegram
- **Public proof**
  - launch checklist
  - smoke report
  - release runbook
  - Lighthouse artifact

## Карта репозитория

- `app/` — Next.js routes, UI surface, RSS, health route
- `src/lib/agent/` — orchestration, prompts, quality gates, review flow
- `src/lib/connectors/` — source adapters и runtime fetch controls
- `src/lib/posts.ts` — read path и caching опубликованных постов
- `src/lib/supabase.ts` — public/admin client split
- `src/lib/telegram.ts` — Telegram publishing layer
- `prompts/` — versioned prompt artifacts
- `eval/` — prompt datasets и evaluation notes
- `docs/` — release, research, smoke и architecture-facing documentation

## Политика публичного репо

Этот репозиторий должен быть понятен за 30-60 секунд и проверяем в глубину, но он **не задуман** как reusable open-source starter.

То есть:

- live demo открыт;
- реализация видима для технического ревью;
- право на повторное использование **не предоставляется**;
- если нужна реальная защита исходников, правильный следующий шаг — split:
  - **private source repository**
  - **public showcase repository**

См. [docs/PUBLIC_SHOWCASE_STRATEGY.md](docs/PUBLIC_SHOWCASE_STRATEGY.md).

## Локальный запуск

<details>
<summary>Показать локальную настройку</summary>

### 1. Установить зависимости

```bash
npm install
```

### 2. Создать локальное окружение

Скопируйте `.env.local.example` в `.env.local` и заполните:

- `GROQ_API_KEY`
- `CRON_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MIRO_SITE_URL`

Опционально:

- `OPENROUTER_API_KEY`
- `NVIDIA_API_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHANNEL_USERNAME` или `TELEGRAM_CHANNEL_ID`
- `COINGECKO_DEMO_API_KEY`

### 3. Запуск

```bash
npm run dev
```

### 4. Проверка

```bash
npm run typecheck
npm run build
```

</details>

## Документация

- [docs/PROJECT_MAP.md](docs/PROJECT_MAP.md)
- [docs/PUBLIC_SHOWCASE_STRATEGY.md](docs/PUBLIC_SHOWCASE_STRATEGY.md)
- [docs/STATE.md](docs/STATE.md)
- [docs/launch-checklist.md](docs/launch-checklist.md)
- [docs/SMOKE_REPORT.md](docs/SMOKE_REPORT.md)
- [docs/RELEASE_RUNBOOK.md](docs/RELEASE_RUNBOOK.md)
- [docs/RESEARCH_LOG.md](docs/RESEARCH_LOG.md)
- [docs/RESEARCH_CONTENT_TRENDS_2026.md](docs/RESEARCH_CONTENT_TRENDS_2026.md)

## Support и security

- Support path: [SUPPORT.md](SUPPORT.md)
- Security policy: [SECURITY.md](SECURITY.md)
- Contribution policy: [CONTRIBUTING.md](CONTRIBUTING.md)

## Maintainer

- **Mikita Kizevich**
- GitHub: [@AI-Nikitka93](https://github.com/AI-Nikitka93)

## Лицензия

Этот репозиторий опубликован по **закрытой / all-rights-reserved** лицензии. См. [LICENSE](LICENSE).
