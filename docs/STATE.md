# STATE

Текущая цель: собрать runnable MVP-контур `cron -> connectors -> gatekeeper -> generator -> Supabase -> frontend read path`, закрепить пятислотовый editorial schedule Миро, развести `world`/`tech_world`, добавить anti-fatigue защиту и довести продукт до честного pre-launch состояния.

Активный шаг: после расширения ритма до пяти слотов в день усилен route-level anti-fatigue gate; следующий цикл — formal Lighthouse, `Content-Security-Policy` и повторный QA уже на более плотном cadence.

Статус: IN_PROGRESS

Блокеры:
- Для The Guardian free developer key действуют non-commercial ограничения.
- Для OpenRouter free tier лимит слишком низкий для роли основного production LLM.
- `TheSportsDB` из текущей среды отвечает `403` / Cloudflare block.
- `GDELT DOC API` в fast smoke-mode из текущей среды прерывается по timeout/abort; прежний риск `429` тоже остается актуальным при burst-вызовах.
- Полный live-path для `tech_world` теперь подтвержден через `ScienceDaily`, `HackerNews`, `Onliner Tech` и tech-oriented `GDELT`, а отдельный `world` topic — через `Global Voices`, `Onliner` и `BELTA`; `sports` при этом остается частично заблокированным внешними API-ограничениями среды.
- Для `Беларусь 1` не подтвержден стабильный официальный неполитический RSS-вход; найден только косвенный политизированный Mirtesen-слой, который пока не включен в основной pipeline.
- Для `sports` теперь добавлены RSS fallback-источники `Pressball`, `Sports.ru` и `Sport-Express`, но live end-to-end run в текущей среде пока упирается в медленный `Groq gatekeeper`, а не в сами источники.
- Полный pre-launch gate еще не закрыт: formal Lighthouse evidence не собран, `Content-Security-Policy` пока отсутствует, а deploy по-прежнему сделан как linked local directory без Git integration.
- Полная automation для пяти окон в день теперь перенастроена в коде и `vercel.json`, route-level anti-fatigue уже добавлен, но длинная стабильность такого cadence еще не накоплена на production.
- После QA на пятислотовом cadence `world/tech_world` больше не должны падать route-level error из-за медленного `Groq gatekeeper`: для timeout добавлен консервативный fallback, а сами `skip` теперь отражают качество входа, а не аварийное завершение пайплайна.
- Production data-ingestion audit показал, что `markets_fx`, `markets_crypto` и `sports` успешно проходят route -> agent -> Supabase insert, а `tech_world` раньше мог уходить в `skipped` по политическому gatekeeper-reason или по `connector exceeded the 4800ms deadline`; timeout profile и source split уже переработаны, но длинная стабильность еще не накоплена.
- `world` теперь поддерживается как отдельный API-topic `/api/cron?topic=world`, но его live publish-path по-прежнему зависит от того, какие именно нейтральные заголовки отдаст текущая ротация `Global Voices/BELTA/Onliner/GDELT`.

Следующий шаг:
- Вернуться к formal Lighthouse audit, решить вопрос с `Content-Security-Policy`, затем отдельно перепройти content QA уже на пятислотовом ритме и накопить evidence, что anti-fatigue gate действительно не дает ленте зацикливаться на соседних слотах.

Артефакты:
- `docs/RESEARCH_DISCOVERY_2026-03-30.md`
- `docs/PRODUCT_STRATEGY_MVP_2026-03-30.md`
- `docs/RESEARCH_LOG.md`
- `docs/OPENROUTER_FREE_MODELS_2026-03-30.md`
- `docs/ERROR_DECISIONS.md`
- `docs/DECISIONS.md`
- `docs/PROJECT_HISTORY.md`
- `prompts/miro_anti_politics_gatekeeper_v1.md`
- `prompts/miro_post_generator_v1.md`
- `eval/miro_prompt_report.md`
- `src/lib/miro-connectors.ts`
- `src/lib/miro-connectors.example.ts`
- `src/lib/miro-agent.ts`
- `prompts/CHANGELOG.md`
- `app/api/cron/route.ts`
- `.env.example`
- `.env.local.example`
- `src/lib/supabase.ts`
- `supabase/001_create_posts.sql`
- `DESIGN.md`
- `docs/design/miro-design-system.md`
- `docs/design/stitch-miro-ui-prompt.md`
- `docs/design/brand_rules.md`
- `docs/design/component_usage_rules.md`
- `docs/design/token_change_policy.md`
- `docs/design/deprecation_rules.md`
- `docs/design/brand_drift_checklist.md`
- `docs/design/implementation_review_points.md`
- `docs/design/motion-tokens.md`
- `docs/design/motion.md`
- `app/loading.tsx`
- `app/post/[id]/page.tsx`
- `package.json`
- `tsconfig.json`
- `next-env.d.ts`
- `run.bat`
- `.env.local`
- `handoff/ui-polish-01/TASK.md`
- `handoff/ui-polish-01/submission/`
- `src/components/miro/feed-container.tsx`
- `src/components/miro/post-detail-view.tsx`
- `src/components/miro/quiet-state.tsx`
- `src/components/miro/thinking-indicator.tsx`
- `vercel.json`
- `pre-launch-check.sh`
- `docs/launch-checklist.md`
- `docs/EDITORIAL_SCHEDULE.md`
- `public/robots.txt`
- `app/sitemap.ts`
- `next.config.ts`
- `src/lib/miro-schedule.ts`
- `src/components/miro/publishing-rhythm.tsx`

Краткий вывод на текущий момент:
- Идея жизнеспособна как MVP.
- Публичных зрелых аналогов немного; ниша существует, но рынок не насыщен сильными standalone AI-blog брендами.
- Наиболее практичная бесплатная связка для MVP сейчас: `GDELT + TheSportsDB + Frankfurter + CoinGecko + Gemini`.
- Продуктовая подача должна быть не “AI-агрегатором”, а личным дневником цифрового наблюдателя с жесткой anti-politics рамкой.
- Prompt layer уже формализован, но его реальную надежность еще нужно подтвердить live Groq eval-набором.
- OpenRouter free на 2026-03-30 стал сильнее как fallback layer; лучший pinned free candidate там сейчас — `qwen/qwen3-next-80b-a3b-instruct:free`.
- Connector layer написан и скомпилирован; `Frankfurter` и `CoinGecko` подтвердились живыми вызовами, `TheSportsDB` по-прежнему упирается в Cloudflare 403, а `GDELT` в fast smoke-mode прервался по timeout/abort.
- Agent layer, Supabase storage layer и Next.js scaffold уже написаны; `npm install`, `npm run typecheck` и `npm run build` прошли успешно.
- Прямой тест Groq API с реальным ключом успешен.
- Supabase URL, anon key и service role key рабочие на уровне подключения; таблица `public.posts` создана и читается через anon/admin clients.
- Реальный local live-run `/api/cron?topic=markets_fx` завершился за ~3.2s, сгенерировал пост и сохранил его в `public.posts`.
- Frontend read path теперь реализован: главная, архив, about, manifesto и страница поста читают данные из Supabase и оформлены в dark-first diary style.
- Tailwind v4, `next/font` и Framer Motion уже интегрированы; дизайн-система и Stitch-ready артефакты сохранены в репозитории.
- Motion layer для feed/filter/about добавлен: лента получает staggered entry, category pills используют shared layout transition, карточки реагируют мягким hover, а about-страница показывает ненавязчивый thinking indicator с учетом `prefers-reduced-motion`.
- Frontend read path теперь полностью сидит на Server Components и Supabase: главная, архив и canonical detail-route `/post/[id]` читают данные сервером, имеют graceful empty/error states и подтверждены runtime-smoke через живой `next start`.
- Handoff review показал: текущая UI-реализация в репозитории живая и проходит `typecheck/build`; папка `submission/` была нормализована поверх имеющихся материалов и теперь содержит корректный `result.md`, `patch_notes.md`, отдельную `SCREENSHOTS/` и `REFERENCES.md` для Stitch-референсов.
- Launch QA блокер по cron resilience закрыт: `sports` и `tech_world` теперь возвращают `200 skipped` с явной причиной в JSON и логах, а не route-level `500`.
- База после серии ручных cron-вызовов уже содержит `11` постов, так что следующий QA-проход можно делать на достаточной выборке по контенту.
- Vercel production deploy выполнен: проект отвечает по `https://ai-blogersite.vercel.app/`, production env vars заданы, ручной smoke `/api/cron?topic=markets_fx` с `CRON_SECRET` вернул `status=success`, а запись появилась в Supabase.
- Деплой выполнен как linked Vercel project, а не как Git-integrated repo, потому что в рабочей директории нет `.git`.
- Базовые SEO/security fixes уже на проде: `robots.txt`, `sitemap.xml`, `X-Content-Type-Options`, `X-Frame-Options` и `Referrer-Policy` подтверждены на `https://ai-blogersite.vercel.app/`.
- Полный P-LAUNCH gate пока честно не пройден: performance evidence через Lighthouse и `Content-Security-Policy` все еще отсутствуют, что зафиксировано в `docs/launch-checklist.md`.
- `tech_world` ingestion больше не опирается только на `GDELT`: добавлены живые источники `ScienceDaily RSS`, `Global Voices RSS`, `Onliner RSS`, `BELTA RSS` и `HackerNews (Algolia)`, которые прогоняются через тот же `MiroAgent` gatekeeper/generator pipeline.
- Live smoke подтвердил два ключевых сценария: `ScienceDaily` проходит весь pipeline до генерации поста, а `Global Voices` может быть корректно остановлен gatekeeper на политическом заголовке.
- Дополнительный smoke подтвердил: `Onliner Tech` отдает рабочие русскоязычные tech facts, а `BELTA` при политизированных заголовках корректно уходит в `skipped` через gatekeeper.
- В `sports` добавлены живые русско-/белорусские спортивные RSS-источники `Pressball`, `Sports.ru` и `Sport-Express`; отдельные fetch-smoke прошли успешно, а fallback больше не зависит только от `TheSportsDB`.
- Editorial rhythm теперь расширен до пяти ежедневных окон: `08:00`, `11:00`, `14:00`, `17:00`, `20:00` по Минску; `urgent_override` по-прежнему разрешен только вне ночи.
- Production UI и `vercel.json` теперь готовы к пятислотовому ритму, а блок ритма на сайте должен показывать новые окна вместо старой трехслотовой формулировки.
- Data-ingestion audit на production подтвердил:
  - `sports` -> `status=success`, post inserted
  - `markets_fx` -> `status=success`, post inserted
  - `markets_crypto` -> `status=success`, post inserted
  - `tech_world` -> `status=skipped`, на разных запусках либо political gatekeeper reason, либо connector timeout
  - count в `public.posts` вырос с `14` до `17`
  - standalone `world` topic в route тогда еще не поддерживался
- После split-ingestion правки `world` стал отдельным topic в `MiroAgent` и `/api/cron`, а `tech_world` получил собственный timeout profile и более чистый tech-only source set.
- `world` quality gate теперь режет synthetic-bridge phrasing и woolly forecasts; если headlines не связаны, generation payload сужается до одного доминирующего факта вместо искусственной склейки.
- Production-контент очищен от худшего дублирующегося `world` поста про снег/летучую мышь: дубль удален из базы и Telegram, а оставшийся верхний `world` post переписан в узкий weather-only вариант.
- На detail-view и в карточках добавлен `post-insights` слой: `Коротко`, `Режим`, `Опора` и объяснение, почему сигнал попал в ленту; это первый практический trust-layer для Миро без изменения схемы базы.
- `markets` теперь режутся, если вход — это просто плоский снимок уровней без реального движения или divergence-signal; `sports` режутся, если это мелкий трансфер без ставки, результата или давления.
- Из production-ленты удалены слабые посты `Рынок не двинулся, но замер слишком ровно`, `День, который остался таблицей`, `Переход Августиновича в «Островец»` и `Евро и фунт не заметили`, чтобы верх сайта снова выглядел как голос Миро, а не как архив неудачных тестов.
- В `app/api/cron/route.ts` усилен route-level novelty/anti-fatigue gate под пятислотовый cadence: memory context расширен до `12` последних записей, один и тот же category теперь не должен возвращаться слишком быстро, а семантически слишком похожие drafts режутся не только внутри категории, но и кросс-категорийно.
- В `src/lib/miro-agent.ts` увеличены gatekeeper budgets для `world`/`tech_world`, а timeout `Groq gatekeeper` теперь не ломает run целиком: включен консервативный fallback, который либо fast-pass-ит явно low-risk signal, либо честно переводит слот в `skipped`.
- В `MiroAgent` внедрен behavioral layer: `memory_context` из последних постов, `emotional_appraisal` по входным фактам и `silence gate`, который режет слабый сигнал еще до генерации.
- Генератор Миро теперь получает не только raw facts, но и стабильный эмоциональный профиль момента: `tone`, `arousal`, `cause`, `signal_strength`; при этом therapy-like language и fake-human warmth режутся quality gate.
- Fallback-ветки cron-route больше не могут уронить `/api/cron` в `500`: ошибки вторичных `agent.run()` теперь переводятся в `skipped`, а не пробивают весь route.
