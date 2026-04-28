# RELEASE RUNBOOK

## Scope
- Проект: `AI_Blogersite` / Миро
- Production surface: публичный Next.js сайт + `GET /api/cron`
- Scheduler: GitHub Actions (`.github/workflows/cron.yml`)
- Deploy target: Vercel production
- Storage: Supabase
- Актуальность: `2026-04-28`

## 1. Release contour

### Source of truth
- `CI`: `.github/workflows/ci.yml`
- `CD`: `.github/workflows/cd.yml`
- `Cron`: `.github/workflows/cron.yml`
- `Health`: `GET /api/health`
- Public smoke helper: `pre-launch-check.sh`

### Required GitHub secrets
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `MIRO_SITE_URL`
- `CRON_SECRET`
- `TELEGRAM_ALERT_BOT_TOKEN` `PROPOSED`
- `TELEGRAM_ALERT_CHAT_ID` `PROPOSED`

### Required runtime env in Vercel
- `CRON_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MIRO_SITE_URL`
- `GROQ_API_KEY` или другой выбранный writer/research secret-set
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHANNEL_USERNAME`
- `TELEGRAM_CHANNEL_ID`

## 2. Normal deploy path

### Automatic path
1. Push в `main`.
2. Дождаться зеленого `CI`.
3. `CD` автоматически:
   - подтягивает production env из Vercel;
   - собирает prebuilt deployment;
   - публикует production deploy;
   - запускает route-level smoke против `MIRO_SITE_URL` или deployment URL.

### Manual path
Использовать только если GitHub Actions временно недоступен.

```bash
npx vercel pull --yes --environment=production
npx vercel build --prod
npx vercel deploy --prebuilt --prod
```

## 3. Post-deploy smoke

### Automatic smoke inside `cd.yml`
Обязательные проверки:
- `GET /` -> `200`
- `GET /archive` -> `200`
- `GET /api/health` -> `200`
- `GET /nonexistent-page-404-test` -> `404`
- home содержит `Лента наблюдений`
- на home есть `Strict-Transport-Security`
- `robots.txt` и `sitemap.xml` отдаются
- `favicon.ico` доступен

### Manual smoke
Локально:

```bash
bash "./pre-launch-check.sh" "https://your-production-domain"
```

Важно:
- по умолчанию smoke не должен дергать настоящий `/api/cron`, чтобы не публиковать лишний пост;
- authenticated cron smoke запускать только сознательно, если нужна живая проверка publish-path и побочный publish допустим.

## 4. How to pause publishing before rollback

Если нужно остановить авто-публикацию перед откатом:
1. В GitHub repository variables установить `MIRO_CRON_ENABLED=false`.
2. Дождаться, что следующий scheduled run в `cron.yml` будет `skipped`.
3. После стабилизации вернуть `MIRO_CRON_ENABLED=true`.

Если repository variable пока не используется, fallback:
1. Открыть GitHub Actions.
2. Найти workflow `Miro Cron Trigger`.
3. Временно disable workflow через UI.

## 5. Vercel rollback

### Fast rollback
Самый быстрый вариант:

```bash
npx vercel rollback
```

Что это делает:
- возвращает предыдущий production deployment как active production version.
- На Hobby этот путь ограничен только предыдущим production deployment; откат глубже требует повторного deploy known-good commit.

Когда использовать:
- broken deploy;
- неверный runtime env;
- маршрут жив, но сайт регресснул после последнего пуша.

### Safer explicit rollback
Если нужен контролируемый откат на known-good commit:
1. Найти последний рабочий commit SHA.
2. Checkout этого SHA локально или rerun CD на нём.
3. Повторить production deploy через `cd.yml` или manual path.

### Проверка после rollback
Сразу повторить:

```bash
bash "./pre-launch-check.sh" "https://your-production-domain"
```

И отдельно проверить:
- открывается home;
- открывается archive;
- `GET /api/health` отвечает `200`;
- новые runtime logs не показывают route crashes.

## 6. Supabase rollback

### Working rule
Для zero-cost контура rollback базы должен быть максимально консервативным:
- additive migrations предпочитать destructive changes;
- перед risky migration делать логический backup;
- если возможен forward-fix, он безопаснее слепого отката схемы.

### Before applying a risky migration
Сделать logical dump:

```bash
npx supabase db dump --linked --schema public -f "./backups/pre_migration_public.sql"
```

Если затрагиваются данные, а не только схема:

```bash
npx supabase db dump --linked --data-only -f "./backups/pre_migration_data.sql"
```

### Dry-run before push

```bash
npx supabase db push --linked --dry-run
```

Только после dry-run:

```bash
npx supabase db push --linked
```

### If migration broke production
1. Сразу остановить cron publish-path.
2. Оценить тип сбоя:
   - schema mismatch;
   - data corruption risk;
   - missing column / bad constraint.
3. Если можно быстро исправить forward migration without data loss:
   - создать corrective migration;
   - применить её;
   - повторить smoke.
4. Если нужен откат:
   - восстановить из логического dump;
   - затем повторно задеплоить known-good app build.

### Important limitation
- Для free/indie контура нельзя обещать мгновенный one-click rollback базы.
- Источник истины для safe rollback базы: заранее подготовленный logical dump плюс pause cron before restore.

## 7. Incident triage order

### If deploy is broken
1. Проверить `CD` workflow logs.
2. Проверить `GET /api/health`.
3. Проверить Vercel Runtime Logs по `trace_id` или route `/api/cron`.
4. Если broken only after latest deploy -> `vercel rollback`.

### If posts stopped appearing
1. Проверить последние runs в `.github/workflows/cron.yml`.
2. Проверить, был ли `skipped`, `success` или hard failure.
3. Если run есть, взять `trace_id` из workflow summary или JSON body и искать его в Vercel logs.
4. Если `success`, но Telegram пустой -> смотреть `telegram.status`.
5. Если repeated `skipped`, смотреть `reason` и внешние feed errors.

### If Supabase write path failed
1. Проверить `SUPABASE_SERVICE_ROLE_KEY` и `NEXT_PUBLIC_SUPABASE_URL`.
2. Проверить schema drift against latest migrations.
3. Если drift от последней миграции -> pause cron, decide forward-fix vs restore.

## 8. Release checklist
- `CI` green
- `CD` green
- `GET /api/health` -> `200`
- Home and archive load
- No unexpected runtime crash in Vercel logs
- Cron scheduler not paused accidentally
- If DB changed: dump created and migration dry-run reviewed

## 9. Known limits
- Этот контур не доказывает rollback базы без заранее созданного dump.
- Без внешнего heartbeat-сервиса missed-schedule на стороне GitHub не обнаруживается полностью независимо.
- Vercel Hobby logs подходят для baseline-debug, но не для длинной исторической аналитики.
