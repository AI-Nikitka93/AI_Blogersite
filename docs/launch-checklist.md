# Launch Checklist — AI_Blogersite

## Дата проверки: 2026-03-31
## Production URL
- `https://ai-blogersite.vercel.app/`

## Deployment
- [x] Vercel project создан и связан с локальной папкой
- [x] Production deploy завершен
- [x] Главная страница отвечает `200`
- [x] Ручной cron smoke отвечает `200` и возвращает `status=success`
- [x] Production env vars заданы в Vercel
- [ ] Git repository integration настроена

## Production env vars
- [x] `GROQ_API_KEY`
- [x] `CRON_SECRET`
- [x] `NEXT_PUBLIC_SUPABASE_URL`
- [x] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [x] `SUPABASE_SERVICE_ROLE_KEY`
- [x] `COINGECKO_DEMO_API_KEY`
- [x] `MIRO_GATEKEEPER_MODEL`
- [x] `MIRO_GENERATOR_MODEL`
- [x] `MIRO_TOPIC_STRATEGY`

## Performance / Accessibility / SEO
| Check | Result | Evidence |
|---|---|---|
| Lighthouse Performance | BLOCKED | локальный Chrome/Edge binary не найден, CLI audit не выполнен |
| Lighthouse Accessibility | BLOCKED | formal browser audit не выполнен |
| Lighthouse Best Practices | BLOCKED | formal browser audit не выполнен |
| Lighthouse SEO | BLOCKED | formal browser audit не выполнен |
| `robots.txt` | PASS | `https://ai-blogersite.vercel.app/robots.txt` вернул `User-agent: *`, `Allow: /`, `Sitemap: ...` |
| `sitemap.xml` | PASS | `https://ai-blogersite.vercel.app/sitemap.xml` вернул валидный XML `urlset` |
| 404 page | PASS | `GET /nonexistent-page-404-test` -> `404` + кастомный контент |

## Security baseline
| Check | Result | Evidence |
|---|---|---|
| HTTPS / public URL | PASS | production alias `https://ai-blogersite.vercel.app/` |
| HSTS | PASS | `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` |
| Referrer-Policy | PASS | `Referrer-Policy: strict-origin-when-cross-origin` |
| X-Frame-Options | PASS | `X-Frame-Options: DENY` |
| X-Content-Type-Options | PASS | `X-Content-Type-Options: nosniff` |
| CSP | FAIL | заголовок не найден в `HEAD /` |

## Runtime smoke
| Check | Result | Evidence |
|---|---|---|
| Home page open | PASS | `Invoke-WebRequest https://ai-blogersite.vercel.app/` |
| Supabase data on home | PASS | HTML главной содержит реальные post titles: `Маленькие шаги валют`, `Нежный рост на рынках` |
| `/api/cron?topic=markets_fx` | PASS | `{\"status\":\"success\",\"post_id\":\"cbe2ecb6-318d-4299-8dde-217ffe632712\",...}` |
| New post persisted | PASS | Supabase select по `post_id` вернул запись `cbe2ecb6-318d-4299-8dde-217ffe632712` |
| Vercel runtime logs | PASS | `vercel logs ai-blogersite.vercel.app --environment production --since 10m --no-follow --expand` показал `λ GET /api/cron` и `[MiroAgent] trace=miro_1774909257241_rvrhe6q5 topic=markets_fx strategy=round_robin` |

## Cron configuration
- `vercel.json` добавлен в корень
- Текущий schedule: `0 5 * * *`
- Причина: daily-safe fallback для Vercel Hobby
- Если проект будет переведен на платный план, можно повысить cadence до `0 */4 * * *`

## Команды и реальные результаты
```text
vercel project add ai-blogersite --scope alexaiartbel-3231s-projects
-> Success! Project ai-blogersite added

vercel link --yes --project ai-blogersite --scope alexaiartbel-3231s-projects
-> Linked to alexaiartbel-3231s-projects/ai-blogersite

vercel env ls --scope alexaiartbel-3231s-projects
-> 9 production env vars found

vercel deploy --prod -y --scope alexaiartbel-3231s-projects
-> Production: https://ai-blogersite.vercel.app

Invoke-WebRequest https://ai-blogersite.vercel.app/api/cron?topic=markets_fx&strategy=round_robin
-> {"status":"success","post_id":"cbe2ecb6-318d-4299-8dde-217ffe632712",...}
```

## Итог
- Deployment status: `LIVE`
- Launch gate status: `BLOCKED`

### Почему blocked
- не собран formal Lighthouse evidence
- отсутствует `Content-Security-Policy`
- деплой связан с локальной папкой, а не с Git repository integration

### Следующий шаг
1. Собрать Lighthouse report на production URL
2. Добавить `Content-Security-Policy`
3. При необходимости подключить Git repo к Vercel отдельно от уже работающего linked deploy
