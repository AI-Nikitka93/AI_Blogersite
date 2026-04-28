# EXECUTIVE SUMMARY FOR HUMANS

- [VERIFIED_LOCAL][VERIFIED_LIVE] У Миро уже сильная идея: это не еще один новостной сайт, а спокойный tension-first дневник сигналов. Эту идею нельзя размывать.
- [VERIFIED_LIVE] Главный разрыв сейчас не в позиционировании, а в исполнении: хорошие рыночные тексты уже убеждают, а слабые `world`/fallback-посты все еще проваливают обещанный уровень.
- [VERIFIED_LIVE] Первый экран объясняет продукт неплохо, но cold-load ощущается медленнее и слабее, чем должен: на живых страницах читатель сначала видит промежуточное состояние `Миро пока наблюдает за миром...`.
- [VERIFIED_LOCAL][VERIFIED_LIVE] Редакционная строгость пока не доведена до уровня продукта: в ленте рядом живут сильные посты и явные компромиссы, а значит доверие к бренду колеблется от записи к записи.
- [VERIFIED_EXTERNAL] Лучшие референсы выигрывают не количеством контента, а тремя вещами: шум режется жестче, лучший материал выделяется на первом экране, а голос автора и provenance объясняются явно.
- [VERIFIED_EXTERNAL][VERIFIED_LOCAL] Самый большой lever сейчас не в полном redesign, а в трех слоях: quality gating перед публикацией, better packaging лучших записей, и нормальная observability/editorial telemetry.
- [VERIFIED_EXTERNAL] OSS-мир уже дает почти все кирпичи: durable workflow, prompt eval, LLM observability, lightweight analytics и alerts. Здесь не нужен heroic rewrite.

# IF EXPLAINED SIMPLY

Если простым языком: продукт уже хорошо задуман, но сейчас ему больше всего мешает то, что он иногда публикует вещи слабее собственной идеи.

- Нужно сделать так, чтобы плохая запись лучше пропускалась мимо, чем попадала на сайт. Сейчас иногда выходит текст, который сбивает доверие ко всем остальным.
- Нужно перестать показывать читателю ожидание как первый опыт продукта. Когда человек открывает сайт, он должен сразу видеть сильную мысль, а не промежуточную загрузку.
- Нужно выделить лучшие записи, а не просто последние. Иначе случайно слабый пост выглядит как лицо всего проекта.
- Нужно яснее показывать, на чем держится каждая заметка: какие факты, какая гипотеза, почему вообще это было выбрано. Это делает ИИ-проект менее “магическим” и более надежным.
- Нужно сделать Telegram заметно острее и умнее, чем сейчас в среднем. Канал должен продавать угол зрения, а не звучать как скучный пересказ.
- Нужно сильнее вычистить мировые темы. Именно там продукт чаще всего скатывается в искусственную важность или в странную связку без достаточной опоры.
- Нужно завести нормальный экран или журнал качества: что было опубликовано, что было пропущено, где пост был слабым, где сработал fallback. Иначе невозможно стабильно улучшать продукт.
- Нужно собирать реакцию читателя на уровне событий: что открывают, что дочитывают, что игнорируют. Сейчас продукт почти не учится на собственном поведении.
- Нужно улучшить структуру архива. Если человек пришел как работодатель или новый читатель, ему нужен быстрый путь к лучшему, а не просто лента всех дат подряд.
- Нужно показать “почему Миро вообще можно доверять” не только через манифест, но и через практические детали: источник, время, степень уверенности, логика выбора сигнала.
- Нужно довести продукт до режима, где тишина действительно лучше слабого поста. Сейчас идея такая уже есть, но она еще не всегда защищена технологически.
- Нужно перестроить некоторые внутренние процессы так, чтобы cron не был единственным местом, где все решается за считанные секунды. Иначе качество всегда будет зависеть от слишком жесткого бюджета.

# AI / OPERATOR SNAPSHOT

- [VERIFIED_LOCAL] Surface classification: `HYBRID` = `WEB / WEB APP` + `BOT / CONVERSATIONAL` + `RSS / syndication` + `GitHub showcase`.
- [VERIFIED_LOCAL] Access & evidence map covered:
  - repo docs and memory files;
  - runtime prompt and quality files;
  - scheduler / cron route;
  - production site pages;
  - production RSS;
  - Telegram live embed;
  - public GitHub metadata;
  - external benchmark surfaces;
  - OSS repositories and docs.
- [VERIFIED_LOCAL] Current stack confirmed: Next.js 16.2.1, React 19.2.4, Tailwind v4, Supabase, Groq, Framer Motion, GitHub Actions, Vercel.
- [VERIFIED_LOCAL] Current operational intent confirmed: five daily Minsk slots with urgent window, skip-over-filler editorial policy, public site + Telegram + RSS distribution.
- [VERIFIED_LIVE] Runtime truth: the system is alive and publishing, but perceived quality varies materially by topic and by fallback path.
- [VERIFIED_EXTERNAL] Benchmark thesis: world-class here does not mean “becoming a generic media brand”; it means becoming much stricter about noise, provenance, best-piece packaging, and reader trust.

# VERIFIED LOCAL REALITY

- [VERIFIED_LOCAL] `README.md` presents Miro as an autonomous AI blogger with live site, Telegram channel, RSS, and tension-first micro-essays.
- [VERIFIED_LOCAL] `docs/PROJECT_MAP.md` confirms the intended product contour: modular agent layer, protected `/api/cron`, Supabase-backed posts, public frontend, Telegram teasers, five daily slots.
- [VERIFIED_LOCAL] `docs/EDITORIAL_SCHEDULE.md` confirms five Minsk slots: `08:00`, `11:00`, `14:00`, `17:00`, `20:00`, plus urgent window `07:00–22:30`.
- [VERIFIED_LOCAL] `src/lib/miro-schedule.ts` matches that five-slot cadence and codifies weekday/topic rhythm.
- [VERIFIED_LOCAL] `app/api/cron/route.ts` shows the system already has route-level novelty and cooldown logic, cache-tag revalidation imports, Telegram publish integration, and schedule-aware pending slot logic.
- [VERIFIED_LOCAL] `src/lib/agent/prompts.ts` is no longer generic. It contains:
  - anti-politics gatekeeper;
  - strict Miro voice contract;
  - site structure `Observed -> Tension -> Inferred -> Hypothesis`;
  - Telegram structure `Hook -> Tension -> CTA`;
  - anti-slop blacklist.
- [VERIFIED_LOCAL] `src/lib/agent/quality.ts` already contains pattern-based quality guards against generic titles, woolly forecasts, assistant tone, generic Telegram phrasing, soft opinion, fake-human validation, and synthetic world links.
- [VERIFIED_LOCAL] `docs/launch-checklist.md` still contains stale pre-fix claims about favicon and RSS discovery, so the project’s documentary layer is not fully synchronized with production truth.
- [VERIFIED_LOCAL] `package.json` confirms the repo is `private: true` and `license: UNLICENSED`, while the public GitHub repo is used as a showcase surface rather than a reusable OSS library.

# VERIFIED LIVE REALITY

- [VERIFIED_LIVE] Homepage, archive, about, manifesto, RSS feed, and individual post pages are publicly reachable on `https://ai-blogersite.vercel.app/`.
- [VERIFIED_LIVE] Telegram surface is publicly reachable via `https://t.me/miro_signals`; message `38` is currently live and message `37` is removed.
- [VERIFIED_LIVE] RSS responds with `200` and currently leads with the FX post `a63214ba-37bc-4ae6-8598-0200fab345a4`.
- [VERIFIED_LIVE] Live Telegram teaser for post `38` is better than the earlier broken template and now reads as a short teaser rather than `Что случилось / Мнение Миро / Что дальше`.
- [VERIFIED_LIVE] The homepage still exposes a loading-first experience before content settles. The HTML surface repeatedly shows:
  - `Миро пока наблюдает за миром...`
  - `Несколько секунд тишины здесь означают не пустоту, а работу...`
  This weakens first-impression confidence.
- [VERIFIED_LIVE] The post page for the current FX item is materially better than recent weak world posts:
  - clear concrete fact layer;
  - a believable tension line;
  - bounded hypothesis;
  - opinion with a real stance.
- [VERIFIED_LIVE] The world post `5115d6aa-b119-4315-8b76-455da45d3cdd` still demonstrates the failure mode:
  - pasted or overlong fact blocks;
  - thin or repetitive inference;
  - low-confidence content that still reached public surface.
- [VERIFIED_LIVE] Archive quality is uneven. On `2026-04-25` and `2026-04-24`, adjacent entries show duplication-like behavior and weak topic curation, which dilutes the brand.
- [VERIFIED_LIVE] Rough cold request timings gathered from live production were approximately:
  - homepage: `738 ms`
  - post detail: `676 ms`
  - archive: `399 ms`
  This is not catastrophic, but it is not yet “fast enough to feel instant,” especially combined with visible loading copy.

# VERIFIED EXTERNAL BENCHMARKS

## Benchmark set

1. [Every](https://every.to/)  
   - [VERIFIED_EXTERNAL] Strong at packaging a clear point of view, editorial identity, and multiple product surfaces around one core promise.
   - [VERIFIED_EXTERNAL] Also publishes explicit [editorial AI guidelines](https://every.to/guides/editorial-guidelines) and a public note on [how the editorial team uses AI](https://every.to/p/this-is-how-the-every-editorial-team-uses-ai).
   - Reuse value: AI provenance, consistent editorial taste, and “authorial system, not hidden automation.”

2. [Semafor Signals](https://www.semafor.com/article/04/13/2026/new-signals-for-the-new-world-economy)  
   - [VERIFIED_EXTERNAL] Strong at explicitly separating reported material from “Ben’s view” or the author’s angle.
   - Reuse value: visible fact-vs-view scaffolding and “what is the actual signal?” packaging.

3. [The Browser](https://thebrowser.com/)  
   - [VERIFIED_EXTERNAL] Strong at calm curation, archive clarity, and recommendation-first reading posture.
   - Reuse value: less noise on landing surfaces; better “return to this later” architecture.

4. [Feedly AI](https://feedly.com/ai) + [Mute Filters](https://feedly.com/ai/models/mute-filters)  
   - [VERIFIED_EXTERNAL] Strong at operational noise removal and explicit mute filters for junk classes like digests, listicles, product reviews, opinions, tutorials, and more.
   - Reuse value: topic-specific negative filtering and better input hygiene before generation.

5. [Axios / Smart Brevity](https://www.axios.com/smart-brevity)  
   - [VERIFIED_EXTERNAL] Strong at scannable hierarchy and “why it matters” compression, even if the page itself is minimal.
   - Reuse value: hierarchy and scan-optimized packaging, not generic simplification.

6. [Stratechery](https://stratechery.com/)  
   - [VERIFIED_EXTERNAL] Strong at trust metadata and reader control: clear `About`, `Email/RSS`, `Concepts`, `Companies`, `Topics`, plus member forum.
   - Reuse value: taxonomy, archive retrieval, and durable reader trust surfaces.

7. [Not Boring](https://www.notboring.co/)  
   - [VERIFIED_EXTERNAL] Strong at author-led identity, archive discoverability, and visible engagement signals.
   - Reuse value: a stronger “best work” / “most popular” route without collapsing into generic creator culture.

8. [TLDR](https://advertise.tldr.tech/comparison/other-newsletters-vs-tldr/)  
   - [VERIFIED_EXTERNAL] Strong at segmentation: separate product lanes for Tech, AI, Dev, DevOps, Product, Fintech, etc., with clear topical promise.
   - Reuse value: sharper packaging per topic lane and click-informed editorial prioritization.

9. [Substack official product docs](https://support.substack.com/hc/en-us/articles/360039015892-How-do-I-switch-my-publication-s-homepage-to-a-different-layout)  
   - [VERIFIED_EXTERNAL] Strong at homepage hero curation, pinned posts, recommendations modules, top posts rows, and layout control.
   - Reuse value: pin the best, not merely the latest.

## External benchmark takeaways

- [VERIFIED_EXTERNAL] Best-in-class surfaces highlight their strongest entry points, not raw recency.
- [VERIFIED_EXTERNAL] Strong editorial products separate fact, view, and recommendation logic more visibly than Miro currently does.
- [VERIFIED_EXTERNAL] Noise removal is treated as a first-class product feature, not a hidden backend detail.
- [VERIFIED_EXTERNAL] Trust is built with provenance, taxonomy, and explicit editorial rules, not only with stylish copy.
- [VERIFIED_EXTERNAL] Reader loops are broader than “open site once”: subscribe, follow, revisit archive, use RSS, discover best-of, and see creator identity.

# GITHUB / OSS LEVERAGE

## READY TO REUSE

1. [Trigger.dev](https://github.com/triggerdotdev/trigger.dev)  
   - [VERIFIED_EXTERNAL] Reuse: durable AI workflows with retries, queues, observability, idempotency, and waitpoints.
   - Why relevant: current cron route still solves too much inside a short serverless request budget.

2. [Inngest](https://github.com/orgs/inngest/repositories)  
   - [VERIFIED_EXTERNAL] Reuse: durable scheduled workflows and stateful execution for serverless apps.
   - Why relevant: same structural pressure as Trigger.dev, different integration style.

3. [Langfuse](https://github.com/langfuse/langfuse)  
   - [VERIFIED_EXTERNAL] Reuse: LLM observability, prompt management, datasets, evals, traces.
   - Why relevant: Miro needs an evidence trail for weak vs strong posts, prompt versions, and latency/failure analysis.

4. [promptfoo-action](https://github.com/promptfoo/promptfoo-action) and Promptfoo ecosystem  
   - [VERIFIED_EXTERNAL] Reuse: regression testing for prompts in CI with cached evaluation.
   - Why relevant: prompt v4/v5 changes should not ship on hope.

5. [PostHog](https://github.com/posthog/posthog)  
   - [VERIFIED_EXTERNAL] Reuse: product analytics, web vitals, feature flags, session/error visibility, LLM analytics.
   - Why relevant: Miro currently has almost no reader-side learning loop.

6. [Umami](https://github.com/umami-software/umami)  
   - [VERIFIED_EXTERNAL] Reuse: privacy-focused analytics with lighter operational weight than a full product suite.
   - Why relevant: if the team wants “just enough analytics” without a heavy stack.

7. [OpenStatus](https://github.com/orgs/openstatusHQ/repositories)  
   - [VERIFIED_EXTERNAL] Reuse: public status/monitoring surface and GitHub action hooks.
   - Why relevant: production trust currently depends on private knowledge and manual checks.

8. [ntfy](https://github.com/binwiederhier/ntfy)  
   - [VERIFIED_EXTERNAL] Reuse: simple HTTP push alerts.
   - Why relevant: low-noise ops alerts without another heavyweight vendor.

## ADAPTABLE

- [VERIFIED_EXTERNAL] [Sim](https://github.com/simstudioai/sim)  
  Reuse only as inspiration for workflow inspection and operator tooling, not as a product-level dependency.

## REJECT

- [INFERRED] Heavy “visual agent builder” adoption for the core publishing flow.  
  Why reject: it adds operator theater before Miro has nailed its own editorial truth.

# PRESERVED STRENGTHS

- [VERIFIED_LOCAL][VERIFIED_LIVE] Strong non-generic concept: calm, no-politics, tension-first, private-diary tone.
- [VERIFIED_LOCAL] Clear multi-surface ambition: site + Telegram + RSS + GitHub showcase.
- [VERIFIED_LOCAL] Good foundational prompt rigor compared with average hobby AI-content projects.
- [VERIFIED_LOCAL] Explicit silence doctrine: better to skip than to spam.
- [VERIFIED_LIVE] When markets posts hit, they already feel distinct from bland AI slop.
- [VERIFIED_LOCAL] Public-facing repo packaging is already stronger than the average side project.

# KEY PROBLEMS IN PLAIN LANGUAGE

- [VERIFIED_LIVE] Миро иногда обещает умный отбор, а потом показывает слишком слабую запись. Для читателя это выглядит как потеря вкуса, а не как “редкий промах”.
- [VERIFIED_LIVE] Сайт сначала показывает ожидание, а потом уже ценность. Это делает продукт менее уверенным, чем он есть на самом деле.
- [VERIFIED_LIVE] Архив слишком равнодушен к качеству: сильные и слабые записи лежат почти на равных правах. Новый человек не понимает, с чего лучше начать.
- [VERIFIED_LIVE] Телеграм уже перестал быть совсем сломанным, но еще не стал реально острым. Он все еще ближе к “короткому анонсу”, чем к сильному углу зрения.
- [VERIFIED_LOCAL][VERIFIED_LIVE] Слой источников и уверенности есть, но он подается не так ясно, чтобы это реально работало как доверие.
- [VERIFIED_LOCAL] Команда уже много чинит в runtime, но ей почти нечем мерить редакционное качество системно. Без этого рост продукта будет идти рывками.

# PRIORITY ORDER

## DO FIRST

- [VERIFIED_LIVE][VERIFIED_LOCAL] Сделать публикационный gate намного строже для `world` и fallback-paths.
- [VERIFIED_LIVE] Убрать loading-first first impression с главной и постов.
- [VERIFIED_LIVE] Перепаковать homepage вокруг лучших записей, а не только последних.
- [VERIFIED_LOCAL][VERIFIED_EXTERNAL] Включить prompt/output observability и regression eval.

## DO NEXT

- [VERIFIED_LIVE] Улучшить Telegram как отдельный surface, а не хвост сайта.
- [VERIFIED_LIVE][VERIFIED_LOCAL] Добавить provenance/trust blocks, которые обычный читатель реально заметит.
- [VERIFIED_LOCAL][VERIFIED_EXTERNAL] Перевести cron-heavy path на durable workflow contour.
- [VERIFIED_LOCAL] Ввести архивные фильтры, topic lanes и quality-aware ranking.

## DO LATER

- [VERIFIED_EXTERNAL] Добавить reader loops: topic follows, best-of, recommendations, maybe email waitlist.
- [VERIFIED_EXTERNAL] Добавить lightweight status / ops transparency surface.
- [VERIFIED_EXTERNAL] Поднять structured discovery for AI search / metadata.

## NOT NOW

- [INFERRED] Большой visual redesign ради красоты.
- [INFERRED] Community/open-source expansion of the codebase.
- [INFERRED] Aggressive monetization layers before trust and quality are stable.

# GAP MAP BY DIMENSION

| Dimension | Verdict | Evidence |
|---|---|---|
| Value clarity | Strong but improvable | [VERIFIED_LIVE] Hero already explains promise, but weak posts dilute it |
| First impression | Under target | [VERIFIED_LIVE] visible loading-first state hurts confidence |
| Onboarding | Under target | [VERIFIED_LIVE] no guided best-entry path beyond archive/about links |
| Activation | Mixed | [VERIFIED_LIVE] reader can read instantly, but there is no strong follow/save loop |
| Navigation | Good baseline | [VERIFIED_LIVE] clear pages exist, but archive ranking is too flat |
| Core workflow | Mixed | [VERIFIED_LIVE] site reading works; content quality consistency does not |
| Microcopy / clarity | Strong on static pages, mixed in posts | [VERIFIED_LIVE] good manifesto/about, inconsistent post execution |
| Visual hierarchy | Good baseline | [VERIFIED_LIVE] homepage sections are coherent, but best work is not spotlighted enough |
| Latency / responsiveness | Acceptable, not premium | [VERIFIED_LIVE] 399–738 ms plus visible loading state |
| Trust / credibility | Promising but incomplete | [VERIFIED_LIVE][VERIFIED_LOCAL] confidence/source exist, but provenance is not productized strongly |
| Personalization / memory | Weak | [VERIFIED_LIVE] no reader memory, subscription lane, or tailored return path |
| Reporting / observability | Weak for editorial quality | [VERIFIED_LOCAL] runtime exists, but quality telemetry is fragmented |
| Edge cases / failure handling | Better than before, still narrow | [VERIFIED_LOCAL] cron route hardening exists; editorial fallback still risked quality recently |
| Accessibility | Likely decent, not fully rechecked now | [VERIFIED_LOCAL] last saved checklist reported 100, but checklist is partially stale |
| Retention / loops | Weak | [VERIFIED_LIVE] Telegram and RSS exist, but no richer loop or best-of return path |
| Extensibility | Good technical base | [VERIFIED_LOCAL] modular agent stack and prompt artifacts already exist |

# UPGRADE BACKLOG 20+

## U01
- ID: `U01`
- Title: Replace loading-first first impression with real above-the-fold content
- Type: `High Leverage`
- Surface / Dimension: `WEB / first impression / performance`
- Current Gap: Readers hit a visible “Miro is observing...” intermediate state before they get value.
- Evidence: [VERIFIED_LIVE] homepage and post pages expose loading copy before settled content.
- Benchmark / Reference: [Axios](https://www.axios.com/), [The Browser](https://thebrowser.com/), [Stratechery](https://stratechery.com/)
- Concrete Change: SSR the hero and first post lane or use cache-backed server fetch so the first view is content, not waiting.
- Why It Matters: First trust is emotional and immediate.
- Who / What It Helps: New readers, employers, returning users.
- User-Visible Result: Site feels calmer, faster, and more finished.
- Expected Effect: Higher first-read trust and lower bounce.
- Effort: `M`
- Confidence: `High`
- How To Validate: No visible loading copy on cold load of `/` and `/post/[id]`.

## U02
- ID: `U02`
- Title: Add a hard “weak world signal” kill switch
- Type: `High Leverage`
- Surface / Dimension: `Editorial quality / world topic`
- Current Gap: Weak `world` and fallback posts can still reach public surfaces.
- Evidence: [VERIFIED_LIVE] post `5115d6aa...` shows low-confidence world output that still published.
- Benchmark / Reference: [Feedly mute filters](https://feedly.com/ai/models/mute-filters)
- Concrete Change: Require minimum evidence density and tension score for `world`; otherwise skip.
- Why It Matters: One weak world post can cheapen the whole brand.
- Who / What It Helps: All readers; editorial reputation.
- User-Visible Result: Fewer strange or filler-like world entries.
- Expected Effect: Higher overall trust in the archive.
- Effort: `S`
- Confidence: `High`
- How To Validate: Fewer `world` publishes, higher avg quality on manual review.

## U03
- ID: `U03`
- Title: Add a Telegram-only lint and reject pass
- Type: `High Leverage`
- Surface / Dimension: `Telegram / teaser quality`
- Current Gap: Telegram can still degrade into polite summary instead of selling the angle.
- Evidence: [VERIFIED_LIVE] message `38` is better, but still not yet world-class sharp.
- Benchmark / Reference: [TLDR](https://advertise.tldr.tech/comparison/other-newsletters-vs-tldr/), [Axios Smart Brevity](https://www.axios.com/smart-brevity)
- Concrete Change: Score hook strength, repetition, summary leakage, and admin phrasing; reject or rewrite automatically.
- Why It Matters: Telegram is the habit loop, not a dump pipe.
- Who / What It Helps: Channel readers and click-through.
- User-Visible Result: Shorter, sharper, more distinct teasers.
- Expected Effect: Better CTR and brand identity.
- Effort: `S`
- Confidence: `High`
- How To Validate: Manual review set of 25 teasers passes defined lint rules.

## U04
- ID: `U04`
- Title: Pin best posts above recency
- Type: `High Leverage`
- Surface / Dimension: `Homepage / activation`
- Current Gap: Homepage relies too much on latest items instead of strongest items.
- Evidence: [VERIFIED_LIVE] archive and homepage reflect uneven quality because recency dominates.
- Benchmark / Reference: [Substack homepage layouts](https://support.substack.com/hc/en-us/articles/360039015892-How-do-I-switch-my-publication-s-homepage-to-a-different-layout)
- Concrete Change: Add `Editor’s picks` / `Best signals this week` rail above or beside the live feed.
- Why It Matters: New visitors judge the product by what they see first.
- Who / What It Helps: First-time visitors, recruiters, press, investors.
- User-Visible Result: Stronger opening impression and faster understanding of Miro at its best.
- Expected Effect: Better perceived quality without more content.
- Effort: `M`
- Confidence: `High`
- How To Validate: New visitors click pinned entries more than generic recency row.

## U05
- ID: `U05`
- Title: Productize provenance on every post
- Type: `Quick Win`
- Surface / Dimension: `Trust / post detail`
- Current Gap: Source, confidence, and reasoning exist but do not yet land as a strong trust layer.
- Evidence: [VERIFIED_LOCAL][VERIFIED_LIVE] trust fields are present, but packaging remains understated.
- Benchmark / Reference: [Semafor Signals](https://www.semafor.com/article/04/13/2026/new-signals-for-the-new-world-economy), [Every editorial guidelines](https://every.to/guides/editorial-guidelines)
- Concrete Change: Add a compact trust strip: source count, source names, observed vs hypothesis, confidence rationale, prompt version.
- Why It Matters: AI content is trusted only when the reader sees how it was constrained.
- Who / What It Helps: Skeptical readers, employers, AI-savvy audiences.
- User-Visible Result: Posts feel less like black-box generation.
- Expected Effect: Better credibility.
- Effort: `S`
- Confidence: `High`
- How To Validate: User testing shows higher trust comprehension after one glance.

## U06
- ID: `U06`
- Title: Introduce quality-aware archive ranking and filters
- Type: `High Leverage`
- Surface / Dimension: `Archive / discoverability`
- Current Gap: Archive is chronological but not quality-smart.
- Evidence: [VERIFIED_LIVE] weak and strong posts sit nearly as equals.
- Benchmark / Reference: [Stratechery](https://stratechery.com/), [Not Boring](https://www.notboring.co/)
- Concrete Change: Add filters by topic, confidence, mode, and a separate `best` sort.
- Why It Matters: Archive is where trust compounds.
- Who / What It Helps: Returning readers and evaluators.
- User-Visible Result: Easier path to Miro’s strongest thinking.
- Expected Effect: Higher depth of reading.
- Effort: `M`
- Confidence: `High`
- How To Validate: More archive-to-post conversions and longer session depth.

## U07
- ID: `U07`
- Title: Hide or down-rank low-confidence posts on the homepage
- Type: `Quick Win`
- Surface / Dimension: `Homepage / editorial packaging`
- Current Gap: Low-confidence entries can still occupy prime real estate.
- Evidence: [VERIFIED_LIVE] weak world posts visibly dilute the homepage/archives.
- Benchmark / Reference: [The Browser](https://thebrowser.com/)
- Concrete Change: Only show `medium/high` confidence or editorially approved posts on the main landing lane.
- Why It Matters: The landing page is not the place for borderline experiments.
- Who / What It Helps: All new readers.
- User-Visible Result: Stronger average homepage quality.
- Expected Effect: Higher perceived editorial discipline.
- Effort: `S`
- Confidence: `High`
- How To Validate: Landing page post quality review scores rise.

## U08
- ID: `U08`
- Title: Add a structured post-quality telemetry ledger
- Type: `High Leverage`
- Surface / Dimension: `Operator / observability`
- Current Gap: There is runtime telemetry, but editorial quality is not tracked like a first-class metric.
- Evidence: [VERIFIED_LOCAL] route hardening exists; [VERIFIED_LIVE] quality failures still surfaced in public.
- Benchmark / Reference: [Langfuse](https://github.com/langfuse/langfuse)
- Concrete Change: Persist per-post metadata: prompt version, topic, selection strategy, quality lint flags, fallback mode, skip reason, publish result.
- Why It Matters: What is not measured cannot be systematically improved.
- Who / What It Helps: Operator and future agent prompts.
- User-Visible Result: Indirect but large quality gain over time.
- Expected Effect: Faster diagnosis of weak themes and regressions.
- Effort: `M`
- Confidence: `High`
- How To Validate: One dashboard/query answers “why was this post published?” instantly.

## U09
- ID: `U09`
- Title: Put prompt regression tests into CI
- Type: `High Leverage`
- Surface / Dimension: `Prompt ops / reliability`
- Current Gap: Prompt upgrades are verified manually, not systematically.
- Evidence: [VERIFIED_LOCAL] prompt artifacts exist; [VERIFIED_EXTERNAL] promptfoo-action supports CI caching and evaluations.
- Benchmark / Reference: [promptfoo-action](https://github.com/promptfoo/promptfoo-action)
- Concrete Change: Add prompt regression suite for site and Telegram outputs with pass/fail assertions.
- Why It Matters: Prompt drift is product drift.
- Who / What It Helps: Editorial stability and deploy confidence.
- User-Visible Result: Fewer regressions after prompt changes.
- Expected Effect: More stable tone and structure.
- Effort: `M`
- Confidence: `High`
- How To Validate: CI fails when a prompt reintroduces banned patterns or weak structure.

## U10
- ID: `U10`
- Title: Create golden sets per topic lane
- Type: `High Leverage`
- Surface / Dimension: `Editorial training / quality`
- Current Gap: One global prompt cannot protect all topic lanes equally.
- Evidence: [VERIFIED_LIVE] markets already outperform world; [VERIFIED_LOCAL] topic discipline exists in code.
- Benchmark / Reference: [Every editorial AI workflows](https://every.to/p/this-is-how-the-every-editorial-team-uses-ai)
- Concrete Change: Curate 10–20 best-in-class Miro examples per lane and use them as eval anchors.
- Why It Matters: World-class tone is easier to preserve with lane-specific exemplars.
- Who / What It Helps: Generator quality, especially outside markets.
- User-Visible Result: More consistent tone and depth.
- Expected Effect: Reduced variance across categories.
- Effort: `M`
- Confidence: `High`
- How To Validate: Lane-level eval scores improve.

## U11
- ID: `U11`
- Title: Move cron-heavy generation into a durable workflow layer
- Type: `Strategic`
- Surface / Dimension: `Ops / resilience`
- Current Gap: Too much selection, generation, publish, and recovery still happens inside a short serverless request budget.
- Evidence: [VERIFIED_LOCAL] `maxDuration = 10`; recent history shows repeated timeout/fallback pressure.
- Benchmark / Reference: [Trigger.dev](https://github.com/triggerdotdev/trigger.dev), [Inngest](https://github.com/orgs/inngest/repositories)
- Concrete Change: Split ingest, qualify, draft, publish, and alert into durable steps with retries and observability.
- Why It Matters: Better quality and better uptime both depend on slack in the system.
- Who / What It Helps: Operator and readers.
- User-Visible Result: Fewer missing/weak posts and fewer emergency fixes.
- Expected Effect: Higher publish reliability and cleaner recovery.
- Effort: `L`
- Confidence: `High`
- How To Validate: Reduced timeout-induced fallback/skip anomalies over a week.

## U12
- ID: `U12`
- Title: Add lightweight analytics for reader behavior
- Type: `High Leverage`
- Surface / Dimension: `Learning loop / product analytics`
- Current Gap: Product has little evidence about what readers actually open, finish, or ignore.
- Evidence: [VERIFIED_LOCAL] no robust analytics layer is surfaced in repo docs.
- Benchmark / Reference: [PostHog](https://github.com/posthog/posthog), [Umami](https://github.com/umami-software/umami)
- Concrete Change: Track homepage clicks, archive filter use, post reads, Telegram outbound clicks, RSS referrals, and scroll depth.
- Why It Matters: Editorial strategy should learn from behavior, not gut feel alone.
- Who / What It Helps: Product strategy and scheduling.
- User-Visible Result: Indirect; better future content choices.
- Expected Effect: Smarter topic scheduling and homepage packaging.
- Effort: `M`
- Confidence: `High`
- How To Validate: Weekly product review can cite real usage patterns.

## U13
- ID: `U13`
- Title: Add a public or semi-public ops status surface
- Type: `Strategic`
- Surface / Dimension: `Trust / operability`
- Current Gap: Readers cannot see whether publishing is healthy or degraded.
- Evidence: [VERIFIED_LOCAL] ops truth currently lives in repo docs and manual checks.
- Benchmark / Reference: [OpenStatus](https://github.com/orgs/openstatusHQ/repositories)
- Concrete Change: Publish uptime/status for cron, feed freshness, Telegram publish health, and last successful post time.
- Why It Matters: AI media products feel less flaky when freshness is explicit.
- Who / What It Helps: Readers, maintainers, employers.
- User-Visible Result: Clearer trust surface.
- Expected Effect: Lower ambiguity around silence vs failure.
- Effort: `M`
- Confidence: `Medium`
- How To Validate: Users can distinguish “quiet by design” from “broken.”

## U14
- ID: `U14`
- Title: Clarify silence vs no-signal vs system-failure in the UI
- Type: `Quick Win`
- Surface / Dimension: `Trust / empty states`
- Current Gap: Silence is a principle, but readers still need to know whether today was quiet or broken.
- Evidence: [VERIFIED_LIVE] copy explains silence philosophy, but not operational freshness in a practical way.
- Benchmark / Reference: [OpenStatus](https://github.com/orgs/openstatusHQ/repositories)
- Concrete Change: Add last successful run time and “quiet by editorial choice” indicator.
- Why It Matters: Silence is only elegant when it is legible.
- Who / What It Helps: Regular readers.
- User-Visible Result: Less confusion during quiet windows.
- Expected Effect: More trust in intentional silence.
- Effort: `S`
- Confidence: `High`
- How To Validate: Fewer support/debug questions about missing posts.

## U15
- ID: `U15`
- Title: Add a compact “Why this signal now” line on cards
- Type: `Quick Win`
- Surface / Dimension: `Homepage / comprehension`
- Current Gap: The logic of selection is clearer on detail pages than on overview surfaces.
- Evidence: [VERIFIED_LIVE] homepage cards lean on title and snippet only.
- Benchmark / Reference: [Semafor Signals](https://www.semafor.com/article/04/13/2026/new-signals-for-the-new-world-economy)
- Concrete Change: On cards, expose one short reason: divergence, role shift, tempo break, etc.
- Why It Matters: It teaches the reader how to read Miro.
- Who / What It Helps: New readers and recruiters.
- User-Visible Result: Faster understanding of editorial taste.
- Expected Effect: Better click quality and lower confusion.
- Effort: `S`
- Confidence: `High`
- How To Validate: Higher CTR from homepage to detail pages.

## U16
- ID: `U16`
- Title: Deduplicate near-identical market posts across adjacent slots
- Type: `High Leverage`
- Surface / Dimension: `Editorial novelty`
- Current Gap: The archive still shows multiple same-lane market items that feel too close.
- Evidence: [VERIFIED_LIVE] adjacent days show repeated `крипта двинулась выборочно` / `эфириум вышел...` style packaging.
- Benchmark / Reference: [TLDR segmentation](https://advertise.tldr.tech/comparison/other-newsletters-vs-tldr/)
- Concrete Change: Add semantic novelty thresholds per lane and day, not only cooldown timing.
- Why It Matters: Repetition makes the product feel automated, not discerning.
- Who / What It Helps: Regular readers.
- User-Visible Result: More variety and sharper editorial rhythm.
- Expected Effect: Lower fatigue.
- Effort: `M`
- Confidence: `High`
- How To Validate: Fewer same-pattern titles in a 7-day archive sample.

## U17
- ID: `U17`
- Title: Add a “Best of Miro” route
- Type: `High Leverage`
- Surface / Dimension: `Onboarding / retention`
- Current Gap: There is no single page that proves the product at its best.
- Evidence: [VERIFIED_LIVE] current entry paths are homepage, archive, about, manifesto.
- Benchmark / Reference: [Not Boring](https://www.notboring.co/), [Stratechery](https://stratechery.com/)
- Concrete Change: Curate 10–20 strongest posts and link them prominently.
- Why It Matters: Great work should not be buried in chronology.
- Who / What It Helps: Employers, press, new readers.
- User-Visible Result: Faster proof of quality.
- Expected Effect: Stronger conversion from first visit to belief.
- Effort: `S`
- Confidence: `High`
- How To Validate: More deep-entry reads from showcase surfaces.

## U18
- ID: `U18`
- Title: Make the about/manifests more actionable with examples
- Type: `Quick Win`
- Surface / Dimension: `Onboarding / clarity`
- Current Gap: The philosophy pages are strong, but they remain more declarative than demonstrative.
- Evidence: [VERIFIED_LIVE] about and manifesto explain principles but do not show “good vs bad signal” examples.
- Benchmark / Reference: [Every editorial guidelines](https://every.to/guides/editorial-guidelines)
- Concrete Change: Add 2–3 before/after examples of what Miro does publish and what he rejects.
- Why It Matters: Philosophy lands better with concrete examples.
- Who / What It Helps: Curious readers and reviewers.
- User-Visible Result: Faster comprehension of the product’s taste.
- Expected Effect: Less ambiguity around category and voice.
- Effort: `S`
- Confidence: `High`
- How To Validate: Readers explain Miro’s method more accurately after reading.

## U19
- ID: `U19`
- Title: Add structured discovery metadata for AI and search surfaces
- Type: `Strategic`
- Surface / Dimension: `Discoverability / trust metadata`
- Current Gap: The product likely underuses structured data and machine-readable trust metadata.
- Evidence: [INFERRED] RSS exists and GitHub packaging is strong, but no current local evidence showed robust per-post schema strategy.
- Benchmark / Reference: [Stratechery](https://stratechery.com/), AI visibility discussions in 2026 search ecosystem
- Concrete Change: Add JSON-LD for article/entity, author/project identity, language, publication date, and confidence/provenance where appropriate.
- Why It Matters: AI and search engines increasingly need cleaner machine-readable context.
- Who / What It Helps: Discovery and citation quality.
- User-Visible Result: Mostly indirect; better discoverability and more trustworthy previews.
- Expected Effect: Stronger referral presence over time.
- Effort: `M`
- Confidence: `Medium`
- How To Validate: Search/indexing and preview surfaces improve.

## U20
- ID: `U20`
- Title: Add operator alerts for failed, weak, or skipped slot runs
- Type: `Quick Win`
- Surface / Dimension: `Ops / alerting`
- Current Gap: Problems are still learned too manually.
- Evidence: [VERIFIED_LOCAL] project history shows manual production moderation and revalidation work.
- Benchmark / Reference: [ntfy](https://github.com/binwiederhier/ntfy)
- Concrete Change: Send alerts not only on hard failures, but also on “published low confidence,” “slot skipped,” and “fallback used.”
- Why It Matters: Silent degradation is worse than loud failure.
- Who / What It Helps: Operator.
- User-Visible Result: Indirect; faster correction.
- Expected Effect: Lower time-to-detection.
- Effort: `S`
- Confidence: `High`
- How To Validate: Alert arrives for each anomalous slot event.

## U21
- ID: `U21`
- Title: Separate “quiet by design” from “editorial review needed”
- Type: `Strategic`
- Surface / Dimension: `Ops / editorial governance`
- Current Gap: There is not yet a clean middle state between publish and skip.
- Evidence: [VERIFIED_LOCAL][VERIFIED_LIVE] recent moderation deletions show some outputs deserve hold/review, not immediate publish.
- Benchmark / Reference: [Trigger.dev waitpoints](https://github.com/triggerdotdev/trigger.dev)
- Concrete Change: Add a hold state for borderline posts that require another generation or manual approval.
- Why It Matters: Not every weak signal should become a public mistake or a silent loss.
- Who / What It Helps: Operator and long-term quality.
- User-Visible Result: Fewer visibly weak posts.
- Expected Effect: Higher consistency.
- Effort: `M`
- Confidence: `High`
- How To Validate: Borderline posts stop reaching production directly.

## U22
- ID: `U22`
- Title: Build a topic performance loop and reschedule by evidence
- Type: `Strategic`
- Surface / Dimension: `Cadence / retention`
- Current Gap: The five-slot schedule is editorially reasoned, but not yet behavior-optimized.
- Evidence: [VERIFIED_LOCAL] schedule exists; [BLOCKED] full-day empirical performance still not collected.
- Benchmark / Reference: [TLDR topic segmentation](https://advertise.tldr.tech/comparison/other-newsletters-vs-tldr/)
- Concrete Change: After analytics land, tune slots by click/read/return behavior and quality pass rate.
- Why It Matters: Cadence should learn from reality, not stay static forever.
- Who / What It Helps: Readers and operator.
- User-Visible Result: Stronger rhythm over time.
- Expected Effect: Better habit formation.
- Effort: `M`
- Confidence: `Medium`
- How To Validate: Per-slot engagement and quality metrics improve over 4–6 weeks.

## U23
- ID: `U23`
- Title: Create a reader feedback / correction surface
- Type: `High Leverage`
- Surface / Dimension: `Trust / support`
- Current Gap: Readers can consume Miro, but have almost no native way to flag a dubious read.
- Evidence: [VERIFIED_LIVE] public site does not surface a reader correction path.
- Benchmark / Reference: [Every transparency surfaces](https://every.to/guides/editorial-guidelines)
- Concrete Change: Add “signal felt weak / factual concern / this was interesting” feedback controls or a simple form.
- Why It Matters: AI editorial products need a way to learn from human disagreement.
- Who / What It Helps: Readers and operator.
- User-Visible Result: More dialog, more accountability.
- Expected Effect: Better correction loop and better dataset.
- Effort: `M`
- Confidence: `Medium`
- How To Validate: Feedback arrives and correlates with known weak posts.

## U24
- ID: `U24`
- Title: Clarify ownership and automation boundaries on-site
- Type: `Quick Win`
- Surface / Dimension: `Trust / credibility`
- Current Gap: GitHub repo is explicit about closed-use and authorship, but the site itself can be clearer about who operates Miro and what is automated.
- Evidence: [VERIFIED_LOCAL][VERIFIED_LIVE] repo trust surface is stronger than site trust surface.
- Benchmark / Reference: [Every AI guidelines](https://every.to/guides/editorial-guidelines)
- Concrete Change: Add a compact site-level trust note: what is automated, what is filtered, how errors are handled, who runs the project.
- Why It Matters: The web product should not rely on GitHub for core trust.
- Who / What It Helps: Readers, employers, partners.
- User-Visible Result: More mature and legible product.
- Expected Effect: Higher credibility.
- Effort: `S`
- Confidence: `High`
- How To Validate: Reviewers can explain the operating model after one visit.

# TOP 10 HIGHEST-LEVERAGE UPGRADES

- `U02 — Hard weak-world kill switch`: stop low-evidence world posts before they hit prod; this protects the brand fastest.
- `U01 — Replace loading-first first impression`: make the site feel finished immediately, not apologetic.
- `U04 — Pin best posts above recency`: show the best work first, not just the newest.
- `U08 — Structured post-quality telemetry ledger`: make editorial quality inspectable, not mystical.
- `U09 — Prompt regression tests in CI`: stop prompt drift from leaking into public surfaces.
- `U11 — Durable workflow layer`: remove the “everything must succeed inside one short request” bottleneck.
- `U03 — Telegram-only lint and reject pass`: turn Telegram into a real angle-selling surface.
- `U06 — Quality-aware archive ranking and filters`: help people find the best Miro, not all Miro equally.
- `U12 — Lightweight analytics`: let the product learn from real reader behavior.
- `U21 — Hold state for borderline posts`: create a third path between ship and silence.

Если простым языком, здесь главный смысл такой: Миро уже почти придумал себя, но еще не научился одинаково строго защищать собственный стандарт на каждом шаге.

# QUICK WINS

- `U05 — Productize provenance on every post`: trust becomes visible, not implied.
- `U07 — Hide low-confidence posts from homepage`: landing quality rises immediately.
- `U14 — Clarify silence vs failure`: readers stop guessing whether the system is broken.
- `U15 — Add “Why this signal now” on cards`: readers learn the editorial logic faster.
- `U17 — Create a Best of Miro route`: strongest work becomes easy to review.
- `U18 — Add examples to About/Manifesto`: philosophy becomes concrete.
- `U20 — Add anomaly alerts`: operator catches degradations faster.
- `U24 — Clarify ownership and automation boundaries`: trust no longer depends on GitHub alone.

Если простым языком, здесь главный смысл такой: несколько маленьких правок способны быстро сделать продукт заметно взрослее даже без большой перестройки.

# STRATEGIC REBUILD OPPORTUNITIES

- [VERIFIED_LOCAL][VERIFIED_EXTERNAL] Replace cron-route-heavy orchestration with durable workflow execution (`U11`).
- [VERIFIED_LOCAL][VERIFIED_EXTERNAL] Build an editorial intelligence layer with telemetry, evals, and hold states (`U08`, `U09`, `U21`).
- [VERIFIED_EXTERNAL][INFERRED] Turn the reader experience from “read latest post” into “enter through best work, follow a lane, come back with purpose” (`U04`, `U06`, `U17`, `U22`).

# NOT NOW

- [INFERRED] Full visual rebrand.
- [INFERRED] Native mobile app.
- [INFERRED] Paid subscriptions or monetization funnel.
- [INFERRED] Large collaborative community layer.
- [INFERRED] Heavy no-code workflow canvas for core publishing logic.

# DO NOT DO

- [VERIFIED_LOCAL][VERIFIED_LIVE] Do not relax the “skip instead of filler” rule just to hit cadence vanity metrics.
- [VERIFIED_LIVE] Do not let weak world posts remain visible as equal first-class items on the homepage.
- [VERIFIED_EXTERNAL] Do not copy “newsletter aesthetics” without copying the underlying mechanisms of curation and trust.
- [INFERRED] Do not solve editorial weakness with more decorative UI.
- [INFERRED] Do not turn Telegram into a summary dump or admin bulletin.
- [INFERRED] Do not add heavy monetization or social mechanics before trust and quality are stable.

# UNKNOWNS / BLOCKERS

- [BLOCKED] A full 24-hour proof of all five slots publishing well has not yet been verified in this audit pass.
- [BLOCKED] Reader behavior data is not yet rich enough to prove which categories or slots create the best retention loop.
- [BLOCKED] Accessibility was previously reported strong, but that checklist file is partially stale and was not fully re-audited live in this pass.
- [BLOCKED] Search/AI-discovery performance is still partly inferred because structured metadata surfaces were not fully audited page by page.
- [BLOCKED] Telegram quality was checked via live embed and recent posts, but not over a large 30-post sample.

# FINAL UPGRADE THESIS

[VERIFIED_LOCAL][VERIFIED_LIVE][VERIFIED_EXTERNAL] Miro does not need a new personality, a new stack, or a new market story. It needs a stricter editorial membrane, a better first-screen packaging of its strongest work, and a real operator-grade feedback loop around quality. The winning move is not “publish more”; it is “make weak output rarer, make strong output easier to discover, and make the system legible to both readers and operators.” If those three moves land, Miro can cross from interesting AI artifact to a genuinely distinctive media product.

[P-WORLDCLASS-UPGRADE-CORE COMPLETE: 2026-04-28 18:45 | Surfaces: WEB, TELEGRAM, RSS, GITHUB | Live Checked: partial | Benchmarks: 9 | OSS References: 8 | Improvements: 24 | Confidence: 82/100]

WHY CONFIDENCE IS NOT 100: five-slot cadence was not observed through a full fresh day; accessibility and discovery metadata were not fully re-audited live; Telegram quality was sampled, not statistically reviewed across a large run set.
