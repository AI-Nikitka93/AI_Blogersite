# Launch Checklist — AI_Blogersite

## Дата проверки: 2026-04-28

## Deployment
- [x] Production deploy выполнен через Vercel CLI
- [x] Production alias обновлен
- [x] Публичный URL отвечает по HTTPS
- [x] HTTP перенаправляется на HTTPS

## Production URLs
- Alias: `https://ai-blogersite.vercel.app/`
- Deployment URL: `https://ai-blogersite-2kbpjok07-alexaiartbel-3231s-projects.vercel.app`
- Vercel deploy id: `dpl_B1A23yTsnaacVy87Svbq4tdYEvvz`

## Performance (Lighthouse)
Команда:

```bash
npx lighthouse https://ai-blogersite.vercel.app --output=json --output-path=./lighthouse-production.json --only-categories=performance,accessibility,best-practices,seo --chrome-flags="--headless=new --no-sandbox"
```

Результат:

| Метрика | Score | Target | Статус |
|---------|-------|--------|--------|
| Performance | 88 | ≥ 90 | ⚠️ |
| Accessibility | 100 | ≥ 90 | ✅ |
| Best Practices | 96 | ≥ 90 | ✅ |
| SEO | 100 | ≥ 90 | ✅ |

Core metrics из отчета:

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| LCP | 3.9s | < 2.5s | ⚠️ |
| CLS | 0 | < 0.1 | ✅ |
| TBT | 60ms | < 200ms | ✅ |
| FCP | см. `lighthouse-production.json` | informational | ℹ️ |
| TTI | см. `lighthouse-production.json` | informational | ℹ️ |

Примечание:
- JSON-отчет сохранен в `lighthouse-production.json`.
- CLI завершился с `EPERM` на cleanup temp-папки Windows после успешной записи JSON. Сам аудит состоялся, но shell exit code был `1` из-за cleanup, а не из-за провала проверки сайта.

## SEO
- [x] `title` и `meta description` присутствуют на главной
- [x] OG-теги присутствуют на главной
- [x] `sitemap.xml` доступен
- [x] `robots.txt` доступен
- [x] Canonical URL присутствует
- [x] RSS discovery tag присутствует
- [ ] RSS discovery link содержит нормализованный URL без двойного `/`

Evidence:
- `GET /robots.txt` -> `200`
- `GET /sitemap.xml` -> `200`
- `GET /feed.xml` -> `200`, `Content-Type: application/rss+xml`
- В `<head>` главной найден `rel="alternate" type="application/rss+xml"`

## Accessibility
- [x] Lighthouse Accessibility = `100`
- [x] Главная страница имеет main landmark
- [x] Навигация, ссылки и заголовки видимы в browser snapshot
- [x] Лента доступна как первый главный контентный блок

## Security
- [x] HTTPS активен
- [x] HTTP -> HTTPS redirect (`308`)
- [x] `Content-Security-Policy`
- [x] `Strict-Transport-Security`
- [x] `X-Frame-Options`
- [x] `X-Content-Type-Options`
- [x] `Referrer-Policy`
- [x] `Permissions-Policy`

## Runtime / public smoke
Команда:

```bash
bash "./pre-launch-check.sh" "https://ai-blogersite.vercel.app"
```

Результат:
- [x] Home page `200`
- [x] Archive page `200`
- [x] Health endpoint `200`
- [x] 404 route возвращает `404`
- [x] `robots.txt` проходит
- [x] `sitemap.xml` проходит
- [x] HSTS header проходит
- [ ] `favicon.ico` отсутствует (`404`)
- [x] `/api/cron` без секрета возвращает `401` и JSON, а не HTML `500`

## Browser / visual proof
- [x] Публичная главная открыта в browser session
- [x] В snapshot подтверждено, что `Лента наблюдений` находится выше hero/manifesto блока `Я замечаю сдвиги раньше, чем они становятся шумом.`
- [x] RSS ссылка видна в header navigation
- [x] Screenshot attempt выполнен

Browser artifact:
- Firecrawl session screenshot сохранен как `/tmp/ai-blogersite-home.png`
- Session live view: `https://liveview.firecrawl.dev/d3NzOi8vYnJvd3Nlci5maXJlY3Jhd2wuZGV2L3NjcmVlbmNhc3QvMWM4M2JjMmYzNGQwODUwZj90b2tlbj1jN2QzNmNiYjlkNGFkODhlMmU4MmY0M2ViYTFkNjc2NGJlOGQwOWQ1YWI0YjBmNjE2NGVjNTRiZmYxYWI2MTYz`

## Cross-browser
- [ ] Chrome desktop manual browser outside audit sandbox
- [ ] Firefox
- [ ] Safari
- [ ] Edge
- [ ] Mobile 375px
- [ ] Mobile 390px
- [ ] Tablet 768px

Статус:
- Browser-session proof есть
- Полная матрица реальных пользовательских браузеров еще не закрыта

## Контент
- [x] Публичная лента содержит реальные посты
- [x] RSS feed отдает реальные посты
- [x] Кастомный 404 route существует
- [ ] `favicon.ico` отсутствует
- [ ] Политика конфиденциальности / cookie-consent не проверялись в этом прогоне

## Итог
`GO WITH RISK`

### Почему не чистый GO
1. Lighthouse Performance = `88`, ниже целевого `90`, а LCP = `3.9s`.
2. `favicon.ico` отсутствует на проде (`404`).
3. RSS discovery tag на главной использует URL с двойным `/feed.xml`.
4. Полная cross-browser матрица еще не подтверждена живыми ручными прогонами.

### Почему не BLOCKED
1. Production deploy успешен.
2. Главная, архив, `feed.xml`, `sitemap.xml`, `robots.txt`, `api/health` доступны на публичном домене.
3. Security headers реально отдаются.
4. Browser-proof подтверждает ключевой user-visible outcome: лента постов теперь выше manifesto/hero слоя.

Проверил: Codex  
Дата: 2026-04-28
