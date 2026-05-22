# STATE

Текущая цель: удержать production publishing contour в серверless-safe бюджете и подтвердить на живом контуре, что Миро продолжает публиковать нормальные посты на сайт и в Telegram без возврата к легаси-формату и без ложных novelty-блокировок от старого архива.

Новый актуальный сдвиг от `2026-05-22`: live/site/GitHub audit подтвердил свежий продуктовый перекос в валюту и Markets, хотя недельное расписание уже широкое. Локально добавлен corrective layer: `topic-fallback-policy` теперь блокирует market rescue при `markets_share > 0.5` в rolling sample, при рыночном доминировании верхних пяти видимых постов, а также fail-closed при недоступном category balance. `/api/cron` сохраняет `top_sample_size` / `top_markets_share` в `category_balance`, не запускает market editorial fallback и timeout rescue, если видимая лента уже market-heavy или баланс не загрузился. Sports source pool больше не держится на одном Sports.ru RSS: добавлены official `NHL Scoreboard API` и `MLB News RSS`, подтвержденные live audit. Главная и RSS получили read-time diversity ordering: свежий пост остается первым, но верх ленты не должен снова выглядеть как четыре вариации одного FX-сигнала подряд. Дополнительно добавлен market story-family novelty gate: `USD/RUB 71,09` и `USD/RUB 71,07` с тем же направлением/тезисом, а также близкий перенос рамки на `USD/BYN`, блокируются как повтор в коротком окне. Public/prepublish quality gate теперь блокирует market macro claims вроде экспортной выручки, энергопродуктов, импорта или спроса, если эти слова есть только в writer-тексте, но не в `observed` фактах. GitHub Actions cron больше не превращает любой skipped active slot в `scheduled_idle` только из-за свежего `/api/health`, а workflow command reason экранируется. Дополнительно hardened HackerNews source filtering: hyphenated `national-security` URL и военная лексика вроде `missile/defense/Pentagon` больше не проходят как `tech_world` source. Это локальная правка; production proof появится только после CI/CD/deploy и ближайших плановых runs.

Новый актуальный сдвиг от `2026-05-15`: качество editorial stack поднято выше fast-MVP режима. На live provider-smoke выбран production writer `NVIDIA + openai/gpt-oss-120b`, потому что он ответил parseable JSON, а Groq `openai/gpt-oss-120b` в текущем прямом JSON smoke дал transport-level validation fail. Чтобы слабые промежуточные роли не портили сильного writer-а, `research`, `gatekeeper` и `review` переведены с `llama-3.1-8b-instant` на `Groq + llama-3.3-70b-versatile`; market fallback generator тоже держится на `llama-3.3-70b-versatile`. Route budget поднят до 60-секундного serverless window, иначе сильные модели оставляли writer-у слишком короткий deadline. OpenRouter free path остается интеграцией/резервом, но не production baseline на это окно из-за live `429`/endpoint instability. Production deploy `dpl_zL8SLUewbCxVdCjMN1juhr7p4SMC` уже подтвержден через live `/api/health`: writer ready на `nvidia/openai/gpt-oss-120b`, research/gatekeeper/review ready на `groq/llama-3.3-70b-versatile`.

Новый актуальный сдвиг от `2026-05-15 21:20`: проведен 10/10 hardening pass по автопубликации и public trust surface. `editorial_fallback` теперь запрещен для `world`, `tech_world` и `sports`, parser игнорирует source metadata от LLM, corroboration считается только по той же истории, HackerNews стал no-politics fail-safe, quality gate режет fallback boilerplate/truncated titles/mixed observed facts, а вспомогательные cron-метрики больше не валят route при сетевой ошибке. Home/cards/detail показывают кликабельный источник и дату источника. Local production preview доказал честный `skipped` вместо weak fallback; production deploy `dpl_5QqbnuAft4Zov2t4RmU433dMgpxm` обновил alias `https://ai-blogersite.vercel.app`.

Новый актуальный сдвиг от `2026-05-15 21:32`: `tech_world` source pool расширен именно под новости мира ИИ. Старый пул был достаточен для общей технологии, но недостаточен для AI-first coverage. В active rotation добавлены OpenAI News, Google DeepMind, Google AI, Hugging Face Blog and Habr AI; stale/noisy кандидаты OpenAI Developers, Google Research and Microsoft AI Blog не включены в active runtime. Live source audit после изменения: 32 active sources, 30 ok, 0 stale; `tech_world` имеет 14 active sources, из них 5 AI-first.

Новый актуальный сдвиг от `2026-05-15 21:45`: BBC полностью удален из active runtime по compliance-риску для Беларуси. Fresh review показал мартовские сообщения 2026 года о внесении `BBC News Русская служба` с идентификатором `www.bbc.com` в Республиканский список экстремистских материалов. Удалены `BBC World RSS` и `BBC Sport RSS` из presets, connectors, exports, topic rotation и gatekeeper fast-pass. Добавлены `docs/COMPLIANCE_SOURCE_POLICY.md` и `npm run check:source-compliance`, который падает при возврате BBC или известных high-risk BY-restricted media domains в runtime-файлы. После изменения active source audit: 30 active sources, 28 ok, 0 stale.

Новый актуальный сдвиг от `2026-05-15 22:05`: live site audit выявил, что последний видимый материал был старым слабым `tech_world` `editorial_fallback`, mobile header показывал обрубки `Дом / Арх / О / Прав`, а RSS мог коротко держать старые заблокированные записи из edge cache. Публичный фильтр теперь блокирует known weak fallback/sports/market posts, truncated titles и fallback self-report phrases; mobile nav использует компактные, но читаемые labels; RSS переведен на `force-dynamic` + `no-store`. После revalidate home показывает только reader-visible Aalto post и честную паузу до следующего нормального запуска.

Новый актуальный сдвиг от `2026-05-15 22:30`: `tech_world` получил дополнительный AI/research source pool и live proof публикации. В active runtime добавлены vetted RSS sources Amazon Science, Microsoft Research и MIT Machine Learning с AI keyword filtering и single-item extraction. Исправлен blocker одиночных RSS-историй: parser больше не допускает mixed observed facts, но сохраняет русскую writer-переформулировку; generator получил отдельный single-fact prompt, чтобы не раздувать один source fact в неподтвержденный longform. Production cron `topic=tech_world&strategy=urgent_override` создал visible post `414c9e26-6317-4da2-aa57-20fa819de81e` по Amazon Science, Telegram `messageId=83`; live `/api/health` вернулся в `status: ok` с `publish_freshness=pass` и `reader_visibility=pass`.

Активный шаг: `2026-04-29` emergency incident по production cron закрыт как `fixed` на уровне publish-path. Ранее `markets_crypto` не доходил до публикации из-за слишком тесного route budget, дорогих промежуточных моделей и того, что даже успешный `editorial_fallback` мог быть заблокирован novelty-check'ом о старые source-less market posts. После hotfix-а route budget поднят до `8500ms`, market generator caps расширены до `4200ms`, `gatekeeper/review/research` переведены на `llama-3.1-8b-instant`, generator для fast-model path сокращает prompt/memory payload, а cooldown теперь не считает source-backed candidate дублем относительно legacy posts без `source`. Production proof уже собран: live run `miro_1777483392367_olfn7t5t_editorial_fallback` создал post `6f9c7d57-a605-4218-bd9a-a9084831b2b1`, записал `run_history.status=success`, `duration_ms=3111` и отправил Telegram `messageId=42`.

Дополнительный актуальный сдвиг: Telegram formatter и `world` kill switch остаются в силе. Новый live Telegram message для post `6f9c7d57-a605-4218-bd9a-a9084831b2b1` уже подтвержден как чистый teaser + ссылка без `Что случилось / Мнение Миро / Что дальше`, а detail page post-а показывает `Источник сигнала: CoinGecko + Bloomberg Markets`.

Новый актуальный сдвиг от `2026-04-29 22:52`: LLM-layer переведен в честный multi-provider режим. `OpenRouter` и `NVIDIA` теперь поддерживаются в том же chat-client слое, а parser перестал доверять reasoning/preamble мусору. Отдельно подтверждено, что апрельская рекомендация из локального research-файла про `deepseek/deepseek-r1-0528:free` уже устарела для текущего OpenRouter free pool: live models API не показывает этот model id на `2026-04-29`. Практически подтвержденный default writer-path теперь `NVIDIA + openai/gpt-oss-20b`, потому что:
- live NVIDIA endpoint стабильно отвечает и поддерживает OpenAI-compatible chat completions;
- `reasoning_effort: low` позволяет `gpt-oss-20b` вернуть законченный JSON в market budget `440` tokens;
- OpenRouter free path в текущем окне остается интегрированным, но operationally волатильным: часть моделей дает `429`, часть долго молчит, а `openrouter/free` в live smoke уводит весь completion budget в reasoning и не является надежным production-default.

Новый актуальный сдвиг от `2026-04-29 23:09`: проведен отдельный long-form benchmark для “больших статей” на `Groq`, `NVIDIA` и `OpenRouter`. По сумме реального качества winner сменился: для длинной русскоязычной статьи лучший текущий writer-default у Миро — `Groq + openai/gpt-oss-120b`. Именно он дал самый сильный профиль на одном и том же article contract: `7` абзацев, `536` слов, нормальный русский, без banned filler и с latency около `4s`. `NVIDIA openai/gpt-oss-20b` остался рабочим вторым местом, но пишет короче и слабее по стилю. OpenRouter free-path подтвердил интеграцию, но как long-article baseline снова проиграл по stability/shape.

Новый актуальный сдвиг от `2026-04-30 03:43`: canonical writer configuration доведена до конца внутри topic defaults. Найден и убран скрытый drift, из-за которого `markets_fx` и `markets_crypto` при отсутствии явного `MIRO_MARKETS_GENERATOR_MODEL` могли тихо сваливаться на `llama-3.1-8b-instant`, хотя writer winner уже выбран как `Groq + openai/gpt-oss-120b`. Теперь market topics наследуют цепочку `MIRO_MARKETS_GENERATOR_MODEL -> MIRO_WRITER_MODEL -> MIRO_GENERATOR_MODEL -> openai/gpt-oss-120b`, а env examples синхронизированы с этим решением. Локальная верификация прошла: `npm run typecheck`, `npm run build` и отдельный smoke по resolved topic models подтвердили, что `markets_*` больше не уходят на 8B default по умолчанию.

В том же проходе закрыт и verification drift на Windows: `npm run typecheck` раньше мог возвращать `0`, но печатать ложный `ENOENT` из `next typegen` сразу после полного удаления `.next`. Script усилен: теперь он заранее создает `.next/types`, после чего `next typegen` и `tsc --noEmit` проходят чисто.

Новый актуальный сдвиг от `2026-04-30 03:57`: operator health surface усилен до реальной runtime-ready проверки. `/api/health` больше не ограничивается env presence и теперь показывает `supabase_public`, `supabase_admin`, `publish_freshness`, актуальные writer/research/gatekeeper/review settings и Telegram config. При `view=ops` и валидном `CRON_SECRET` route может отдать snapshot последних run-ов. В том же проходе синхронизирован локальный `.env.local`: writer переведен на `Groq + openai/gpt-oss-120b`, fast roles — на `llama-3.1-8b-instant`, default strategy — на `editorial_schedule`. Дополнительно hardened `pre-launch-check.sh`: все curl-paths теперь bounded через `CURL_MAX_TIME`, чтобы release smoke не мог зависнуть бесконечно.

Новый актуальный сдвиг от `2026-04-30 04:10`: этот operator/health slice уже выкачен на production. Production deploy `dpl_5qyghx78KLBrdmsUNvecx4hBFMQZ` выкатил новый health contract, затем env mismatch по `MIRO_TOPIC_STRATEGY` был выровнен на `editorial_schedule` и подтвержден повторным production deploy `dpl_EmT631JSrSdGanz9FdNQDFuBUnd6`. Live alias `https://ai-blogersite.vercel.app/api/health` уже отдает `status:"ok"` с `supabase_public=pass`, `supabase_admin=pass`, `publish_freshness=pass`, writer `openai/gpt-oss-120b`, а safe authorized cron preview после deploy вернул честный JSON `status:"skipped"` по novelty reason без HTML/500 и без побочного publish.

Статус: IN_PROGRESS

Блокеры:
- Локальных blockers для publishing contour нет: `npm run typecheck` и `npm run build` проходят после hotfix-а.
- Полный локальный `npm run check` после source-hygiene pass от 2026-05-22 проходит: typecheck, source compliance, content eval, public/Telegram contracts, agent/source/public-post/cron/Telegram tests, mobile/typography checks и Next build зеленые.
- Свежий live `npm run audit:sources --silent` после этого pass попытался `32` active sources и вернул `32 ok`, `0 failed`, `0 stale`; `world` rows были Naked Science, N+1, Phys.org, NASA News Releases, ESA Space Science и Onliner People, без Onliner Money.
- Production deploy proof от 2026-05-22 13:18 +03 собран: финальный Vercel deploy `dpl_3S6LJR4XSsUftTMrks8aUcYsTkJ4` Ready и aliased на `https://ai-blogersite.vercel.app`; защищенный real cron `topic=world&strategy=urgent_override` создал видимый World-пост `2793a91e-d59c-411a-8ffa-ea37d082c9d9` из Phys.org и отправил Telegram `messageId=93`.
- После deploy `/api/health` сначала честно был `degraded`, потому что последний старый market-пост теперь блокировался новым unsupported macro-claim gate. Gate не ослаблялся: вместо этого world fallback/ranking/localization доведены до чистого non-market publish path, после чего live health вернулся в `status=ok` с `reader_visibility=pass`.
- Прямой production blocker "cron не может дожить до publish" закрыт для одного боевого smoke-run, но длинное observation по пяти слотам еще не завершено.
- Основной generator для `markets_*` все еще сидит на `llama-3.3-70b-versatile`, поэтому внешние Groq quota/latency limits остаются operational risk, а не полностью устраненной угрозой.
- OpenRouter free routing теперь работает на уровне интеграции, но live free-pool остается нестабильным как production baseline: verified current responses включали `429`, `400` и `finish_reason=length` с `content=null` на `openrouter/free`.
- Для long-form writer baseline NVIDIA уже не лидер: после live benchmark `openai/gpt-oss-120b` на Groq обошел `gpt-oss-20b` по длине, структуре и чистоте текста.
- Canonical writer default локально уже выровнен, но production env и live cron smoke еще нужно отдельно подтвердить именно на path `Groq + openai/gpt-oss-120b`.
- Production `/api/health` на новом contract уже подтвержден, но отдельный fresh non-preview live cron success после последнего env sync еще не собран именно в этом проходе.
- Старые слабые и source-less записи остаются historical debt в архиве; новый novelty filter их больше не использует как hard-block для source-backed fallback, но сам архив от этого еще не очищен.
- `world` и часть `tech_world` по-прежнему честно могут уходить в `skipped`, если source pool не дает tension; это уже editorial constraint, а не runtime-crash.
- После 2026-05-15 это ожидаемое поведение усилено: для `world`, `tech_world` и `sports` слабый fallback запрещен, поэтому меньше плохих публикаций важнее, чем механическое закрытие каждого слота.
- После 2026-05-22 добавлен отдельный guard от market/currency dominance: если верх ленты или rolling sample уже рыночные, market fallback/rescue должен быть заблокирован, а слот обязан искать не-рыночную историю или честно skip. При недоступном category balance market rescue теперь fail-closed, чтобы сбой диагностики не превращался в очередной валютный filler.
- Market novelty теперь проверяет story-family, а не только точный заголовок/Jaccard: повторяющиеся FX-тезисы по тем же инструментам, направлению и причинной рамке блокируются даже при другой цифре курса.
- Market macro claims теперь требуют observed support: если writer добавляет экспорт/энергопродукты/импорт/спрос поверх голого FX fixing-а, public/prepublish gate блокирует пост.
- Cron quality ledger теперь сохраняет bounded `route_attempts` trace в `quality_events.quality_flags`: после deploy можно разбирать не только итоговый `status/reason`, но и цепочку skipped/generated attempts, из-за которой агент ушел в fallback или честный skip.
- Telegram formatter теперь экранирует кавычки в HTML вместе с `&`, `<` и `>`, чтобы source/trust line и `<a href="...">` не ломались на нестандартных URL/source строках.
- Свежий read-only GitHub check от 2026-05-22 подтвердил, что production на старом `main@30c6f4f` все еще уходит в `markets_fx`: плановый run `26274884294` стартовал со sports/reroute path, увидел `Markets=11/20` (`markets_share=0.55`), но old policy все равно разрешила market rescue и опубликовала post `571a702a-41d5-4964-b8b6-bce123d971fe`.
- `scripts/trigger-cron.sh` теперь дополнительно валит workflow как `market_rescue_violation`, если `/api/cron` все же вернет published `markets_fx` / `markets_crypto` при `category_balance.markets_rescue_allowed=false`. Для этого добавлен behavioral fake-curl regression `scripts/trigger-cron.test.mjs`, потому что `jq // "unknown"` раньше съедал boolean `false`.
- Cleanup hygiene: `artifacts/verification/` теперь добавлен в `.gitignore` как generated local evidence; `scripts/query-db-real.ts` и `scripts/smoke.ts` не удалялись и не игнорировались, потому что это потенциально полезные ops helpers, но они читают `.env.local` и требуют отдельного hardening перед tracking.
- Sports больше не зависит от одного RSS: active pool теперь включает `Sports.ru RSS`, official `NHL Scoreboard API` и official `MLB News RSS`; старые `Sport-Express`, `Soccer365`, `TheSportsDB`, `Pressball` не возвращались в runtime, потому что live probe показал timeout/403/stale behavior.
- `world` source lane больше не использует `Onliner Money RSS`: после source-hygiene pass world rotation держится на Naked Science, N+1, Phys.org, NASA News Releases, ESA Space Science, Onliner People и opt-in GDELT. Общий world RSS filter теперь отдельно режет FIFA/World Cup/tournament и money/currency/banknote/ruble/dollar drift, чтобы `world` не становился скрытым валютным или sports-business fallback.
- Public home/RSS теперь делают read-time diversity ordering для общей ленты: category-filter и archive остаются хронологическими, но неотфильтрованная витрина подтягивает больше постов и ограничивает Markets в верхнем окне.
- BBC / `bbc.com` / `bbci.co.uk` теперь hard-block для active runtime; расширение источников нужно сверять с `docs/COMPLIANCE_SOURCE_POLICY.md` и `npm run check:source-compliance`.
- Health снова `ok` после visible `tech_world` success `414c9e26-6317-4da2-aa57-20fa819de81e`; если future health деградирует, сначала проверять latest successful run visibility, а не возвращать fallback filler.

Следующий шаг:
- Если writer действительно нужно усилить на production, первый кандидат на switch теперь `MIRO_WRITER_PROVIDER=groq` + `MIRO_WRITER_MODEL=openai/gpt-oss-120b`; перед live switch нужен один production cron smoke именно на этом path.
- После локальной нормализации defaults следующим прямым шагом остается production sync: проставить writer env на Vercel и собрать один live proof-run уже без скрытого `markets_* -> 8B` drift.
- Production sync по health/operator surface уже завершен; следующий прямой шаг — собрать свежий non-preview live cron success уже после deploy `dpl_EmT631JSrSdGanz9FdNQDFuBUnd6`, а затем продолжить cadence-observation по пяти слотам.
- Прогнать live production writer-path уже на новом hosted routing contract: отдельно проверить `NVIDIA + openai/gpt-oss-20b` в реальном cron-run и убедиться, что новый writer не ломает cadence-budget и продолжает отдавать parseable JSON.
- Если понадобится именно OpenRouter primary-path, сначала сделать еще один fresh provider pass и выбрать не “по старому TXT”, а по текущему live free catalog на дату запуска.
- Дать production прожить минимум один полный день на новой cadence-схеме и собрать evidence по каждому из пяти плановых слотов уже после fast-model hotfix и source-debt novelty fix.
- На ближайших plan/urgent slot-run проверить, что `editorial_fallback` остается редкой страховкой, а не постоянным способом публикации.
- После 2026-05-15 наблюдать долю честных `skipped` по `world`, `tech_world`, `sports`: если слоты часто пустые, расширять vetted source pool, а не возвращать fallback filler.
- После 2026-05-22 проверить ближайшие GitHub cron runs после деплоя: `category_balance.markets_rescue_allowed=false` или недоступный balance должны реально исключать market fallback, skipped active slot должен становиться видимым failure/warning, а успешные новые публикации должны начать выравнивать верх ленты по `world` / `tech_world` / `sports`.
- После deploy/source audit отдельно проверять, что `world` не возвращает money/currency rows и что Phys.org/NASA/ESA/N+1/Naked Science не протаскивают sports-business или валютные сюжеты через общие RSS.
- После deploy уже есть один real World proof, но 24-48h natural GitHub Actions cadence еще не закрыт: ближайшие scheduled runs должны подтвердить, что workflow behavior на новом code path не возвращает currency dominance.
- После deploy специально проверить, что если route когда-либо нарушит этот contract и вернет `published markets_*` при `markets_rescue_allowed=false`, GitHub Actions не останется green, а упадет с `market_rescue_violation`.
- После deploy проверить свежую строку `quality_events`: `quality_flags` должен содержать `route_attempts.details.attempts` с bounded цепочкой попыток темы/источника, чтобы market dominance debug больше не опирался только на текстовый reason.
- Для `tech_world` следующий шаг уже не "добавить любые источники", а добавить только недостающие primary/non-RSS connectors: Anthropic, Meta AI, Mistral, xAI, Stability/Runway/ElevenLabs only if they expose stable official feed/API or a controlled HTML extractor. Amazon Science, Microsoft Research и MIT Machine Learning уже в active RSS pool.
- Отдельно проследить, что Telegram и дальше уходит только как teaser + ссылка даже на следующих fallback/timeout ветках.
- После deploy проверить хотя бы один Telegram send на новом formatter path: message должен остаться teaser-only, link должен работать, а source/trust line не должен ломать HTML.
- На следующих `world` и `tech_world` слотах проверить, что обновленный source pool и hard kill switch действительно чаще дают честный `skipped`, чем слабую публикацию.

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
- `src/lib/agent/prompts.ts`
- `src/lib/agent/quality.ts`
- `supabase/001_create_posts.sql`
- `package.json`
- `tsconfig.json`
- `.env.example`
- `.env.local.example`

Краткий вывод на текущий момент:
- Root cause у нового провала "production cron не доводит markets до публикации" найден и закрыт: узким местом был не один Vercel timeout сам по себе, а комбинация тесного внутреннего budget, дорогих промежуточных LLM steps и novelty-блока от legacy source-less posts.
- Production proof уже есть в полном publish contour: live GET `/api/cron?topic=markets_crypto&strategy=urgent_override` вернул `status=success`, создал post `6f9c7d57-a605-4218-bd9a-a9084831b2b1`, записал `run_history.duration_ms=3111` и отправил Telegram `messageId=42`.
- Detail page нового post-а уже отдает `Источник сигнала: CoinGecko + Bloomberg Markets`, а Telegram-сообщение для этого post-а подтверждено как чистый teaser + `Читать полностью` без легаси-лейблов.
- LLM-layer больше не привязан к одному hosted provider: `OpenRouter` и `NVIDIA` интегрированы в тот же runtime contract, gatekeeper теперь можно держать на быстром Groq, а writer-routing — переключать отдельно.
- Parser теперь честно различает “финальный JSON после reasoning” и “ложный JSON-пример внутри `<think>`”: synthetic `think-only` smoke падает, а synthetic `think + final JSON` и live `gpt-oss-20b` generation-path проходят.
- На `2026-04-29` старый research-факт `deepseek/deepseek-r1-0528:free` уже нельзя считать текущим default: live OpenRouter catalog его не подтвердил, поэтому pragmatic verified writer default сейчас `NVIDIA + openai/gpt-oss-20b`, а не stale OpenRouter recommendation.
- Для отдельной задачи “большие статьи” уже есть более сильный winner: `Groq + openai/gpt-oss-120b` обошел всех по long-form benchmark и был возвращен в `.env.example` / `.env.local.example` как новый default recommendation для writer.
- Hidden config drift тоже закрыт: `markets_*` теперь наследуют writer winner и без отдельного env override больше не падают обратно на `llama-3.1-8b-instant`.
- Локальный verification path снова честно зеленый: `npm run typecheck` больше не маскирует `next typegen` drift после очистки `.next`.
- `/api/health` больше не декоративный: local runtime теперь показывает реальные DB/freshness/config checks и уже подтвержден прямым localhost smoke.
- Этот health/ops contract уже живет и на production alias: live `/api/health` и authorized preview path подтверждены после deploy.
- Следующий фронт работы снова смещается из emergency debugging в длительное production observation: нужно проверить не одиночный smoke, а устойчивость пятислотового cadence и долю fallback/skip по темам.
