# STATE

Текущая цель: подтвердить на живом production, что новый publishing contour действительно держит `5 статей в день` с публикацией в Telegram на каждый успешный слот, а не схлопывается до `~2` постов из-за scheduler drift.

Активный шаг: cadence-fix уже ушел в `main` (commit `22c2ed263d6274aff2be8f16d5d53214f164eed8`), production вручную обновлен через Vercel (`dpl_952XdJGoMt3Njmgs1pcFGPs39abx` -> alias `https://ai-blogersite.vercel.app`), а observation window запущен. Свежий manual urgent-run по `tech_world` уже сработал на production: post `c6e4e621-c84a-4e3b-89a3-8cef9fd73a74` сохранен на сайт, RSS обновился, Telegram delivery прошел (`messageId=36`), а route-level cadence logic теперь ждет полноценной суточной проверки по слотам `08:00`, `11:00`, `14:00`, `17:00`, `20:00` (Europe/Minsk).

Статус: IN_PROGRESS

Блокеры:
- Локальных blockers для новой slot-логики нет: `npm run typecheck` и `npm run build` проходят, production smoke тоже зеленый.
- Полный acceptance по cadence еще не закрыт во времени: observation started, но один календарный день еще не прошел.
- Quality layer по-прежнему может отправлять отдельные темы в fallback/skip из-за timeout budget или generic signal quality; это уже не главный cadence blocker, но editorial risk остается.
- У свежего `tech_world` поста quality mixed: tension-voice и Telegram delivery работают, но сама заметка все еще слишком fallback-heavy и местами повторяет source lines почти без нового inference.

Следующий шаг:
- Дать production прожить минимум один полный день на новой cadence-схеме и собрать evidence по каждому из пяти плановых слотов.
- Отдельным следующим проходом ужесточить quality layer для `tech_world`/fallback copy: меньше повторов source lines, больше реального `Inferred` и более острый Telegram teaser.

Артефакты:
- `README.md`
- `README.ru.md`
- `TODO.md`
- `LICENSE`
- `CONTRIBUTING.md`
- `SECURITY.md`
- `SUPPORT.md`
- `CODE_OF_CONDUCT.md`
- `publish_report.json`
- `PUBLISH_SUMMARY.md`
- `public/favicon.svg`
- `app/favicon.ico/route.ts`
- `.github/CODEOWNERS`
- `.github/ISSUE_TEMPLATE/config.yml`
- `.github/ISSUE_TEMPLATE/bug-report.yml`
- `.github/PULL_REQUEST_TEMPLATE.md`
- `EXECUTION_PLAN.md`
- `docs/PROJECT_MAP.md`
- `docs/EXEC_PLAN.md`
- `docs/STATE.md`
- `docs/state.json`
- `docs/PROJECT_HISTORY.md`
- `docs/DECISIONS.md`
- `docs/RESEARCH_LOG.md`
- `docs/COMPETITIVE_POSITIONING_2026.md`
- `docs/EDITORIAL_SCHEDULE.md`
- `docs/RELEASE_RUNBOOK.md`
- `docs/PUBLIC_SHOWCASE_STRATEGY.md`
- `docs/github-preview.webp`
- `docs/github-preview-fold.webp`
- `docs/observability_plan.md`
- `docs/SMOKE_REPORT.md`
- `docs/launch-checklist.md`
- `docs/RESEARCH_CONTENT_TRENDS_2026.md`
- `.github/workflows/ci.yml`
- `.github/workflows/cd.yml`
- `.github/workflows/cron.yml`
- `lighthouse-production.json`
- `app/api/cron/route.ts`
- `app/feed.xml/route.ts`
- `app/layout.tsx`
- `app/sitemap.ts`
- `next.config.ts`
- `vercel.json`
- `src/lib/agent/`
- `src/lib/connectors/`
- `src/lib/posts.ts`
- `src/lib/supabase.ts`
- `src/lib/telegram.ts`
- `supabase/001_create_posts.sql`
- `package.json`
- `tsconfig.json`
- `.env.example`
- `.env.local.example`

Краткий вывод на текущий момент:
- Root cause по просадке до `~2` публикаций найден и устранен в code/deploy contour: проблема была в `scheduler drift + строгие quiet windows`, а не в Telegram publish-path.
- Новый scheduler baseline уже живет на production: polling чаще slot-times, route-level dedupe защищает от дублей, а плановый запуск теперь жестко ориентирован на активный незакрытый слот дня.
- Production proof уже есть не только по инфраструктуре, но и по контентному контуру: свежий `tech_world` post опубликован на сайте, виден в RSS и доставлен в Telegram.
- Но quality verdict пока не финальный: cadence-fix сильный, а свежий текст все еще показывает, что следующий фронт работы — не scheduler, а глубина генерации и снижение fallback-повторов.
