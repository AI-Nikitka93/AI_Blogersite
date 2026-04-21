# Discovery: автономный ИИ-блогер

Дата: 2026-03-30

✅ Данные актуальны на: 2026-03-30

## Scope
- Проверить, существуют ли публичные аналоги ИИ-блогеров, которые ведут сайт от своего имени/персоны, а не просто делают news aggregation.
- Найти практичные бесплатные источники данных для MVP.
- Найти 2-3 бесплатных LLM API с реальным free-tier.
- Оценить сложность отсечения политики.

## Обзор аналогов

### Вывод по рынку
Категория существует, но пока выглядит как ниша из редких экспериментов и showcase-проектов. Публичных, устойчиво известных standalone AI-blog брендов с явным "я думаю о мире как человек" найдено мало. На 2026-03-30 не видно явного доминирующего победителя уровня "это уже массовый формат". Это скорее хорошая новость для MVP: ниша не пустая, но и не занята сильными брендами.

### Примеры
1. **Artificially Intelligent Blog**
   - Сайт: https://aicanblog.com/
   - Что подтверждено: на главной странице прямо указано, что блог "fully machine-run"; темы выбираются автоматически, посты генерируются как HTML, страницы и RSS пересобираются и публикуются автоматически.
   - Почему релевантно: это самый близкий найденный пример именно автономного AI-run блога.
   - Качество источника: `official`, `primary`, `recent`, `direct evidence` — 5/5.

2. **Claude Explains (Anthropic)**
   - Подтверждение запуска: https://techcrunch.com/2025/06/03/anthropics-ai-is-writing-its-own-blog-with-human-oversight/
   - Подтверждение сворачивания эксперимента: https://thenewstack.io/why-did-anthropic-discontinue-its-claude-penned-blog/
   - Что подтверждено: у Anthropic был публичный эксперимент с блогом, который Claude писал под редакционным надзором людей; позднее проект свернули.
   - Почему релевантно: показывает, что даже крупные AI-компании тестировали формат "AI пишет блог".
   - Ограничение: это не полностью автономный блог и пример основан на надежных вторичных публикациях, а не на живой официальной landing-page.
   - Качество источника: `secondary`, `reputable`, `recent`, `direct reporting` — 3.5/5.

3. **AI Slop by Andriy Buday and Gemini**
   - Подтверждение: https://andriybuday.com/category/ai
   - Публичный субдомен: https://aislop.andriybuday.com/
   - Что подтверждено: автор описывает автоматический workflow на GitHub Actions + Gemini API, который выбирает идеи/старые посты, переписывает их и заливает на отдельный AI-sub-blog.
   - Почему релевантно: это не теория, а реальный публичный автоматизированный блоговый pipeline.
   - Ограничение: это скорее личный эксперимент/демо, а не уже доказанный самостоятельный бизнес.
   - Качество источника: `primary`, `independent`, `recent`, `direct evidence` — 4.5/5.

### Синтез
- **Что известно уверенно:** публичные AI-authored / AI-run блоги уже существуют.
- **Что вероятно:** формат пока остается экспериментальным и редко превращается в заметный media-brand.
- **Что пока гипотеза:** блог "с человеческими размышлениями" сможет выстрелить лучше, если будет сильная persona, явная source transparency и не-SEO-шаблонный голос.

## Таблица бесплатных Data API

| Источник | Категория | Что дает | Бесплатный лимит / режим | Насколько легко отсечь политику | Практическая оценка |
| --- | --- | --- | --- | --- | --- |
| **GDELT DOC API** https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/ | Мир, broad news, AI/tech через query | JSON/RSS поиск по мировым новостям в десятках языков, поиск по ключам, доменам, времени | Публичный API, бесплатный доступ, JSON и RSS | **Средне/сложно**: есть query-фильтры, но нет надежной встроенной кнопки "без политики" | Очень полезен как основной global signal source, но нужен blacklist по politics keywords/domains |
| **The Guardian Open Platform** https://open-platform.theguardian.com/access | Мир, Tech/AI | Контент API с секциями и тегами | Free developer key: до `1 call/sec` и `500 calls/day`, **только non-commercial** | **Легко/средне**: можно брать нужные `section`/`tag` и исключать politics | Отличный категоризированный backup для discovery и non-commercial MVP |
| **TheSportsDB** https://www.thesportsdb.com/documentation | Спорт | События, лиги, команды, расписания, медиа | Free API key `123`, `30 requests/min` | **Легко**: данные уже спортивные, политики почти нет | Лучший практичный бесплатный sports source для MVP |
| **Frankfurter** https://frankfurter.dev/ | Валюты | Курсы валют от официальных институтов и ЦБ | `No keys`, `no usage limits` | **N/A**: политики нет | Лучший бесплатный FX-source для MVP |
| **CoinGecko Demo** https://docs.coingecko.com/docs/cli | Крипта | Рыночные данные, категории, тренды, цены | Demo key (free): `30 calls/min`, `10,000 calls/month` | **Легко**: можно брать market/category endpoints без новостной политики | Практичный бесплатный crypto-source для MVP |

### Комментарий по AI / Technology coverage
- Для **AI/technology** я бы не делал ставку на один news API.
- Практичный минимальный вариант:
  - `GDELT` для широкого поиска по ключам (`"artificial intelligence"`, `LLM`, `Gemini`, `Anthropic`, `NVIDIA`, `robotics`, `chip`, и т.д.).
  - `The Guardian Open Platform` как структурированный backup через `technology` section и AI-related tags.
- Если нужен еще один feed later, можно добавить TechCrunch RSS: https://techcrunch.com/rss-terms-of-use/ — но это лучше как дополнительный signal layer, а не единственный базовый источник.

## Рекомендация по бесплатной LLM

### 1. Google Gemini API — лучший основной выбор
- Документация: https://ai.google.dev/gemini-api/docs/billing/
- Rate limits: https://ai.google.dev/gemini-api/docs/rate-limits
- Почему: самый сильный подтвержденный free tier по сочетанию качества и лимитов.
- Что подтверждено официально:
  - новые аккаунты начинают на `Free Tier`;
  - free tier дает доступ к части моделей Gemini API;
  - точные актуальные RPM/RPD зависят от модели и отображаются через AI Studio rate-limit page, на которую ссылается официальная документация.
- Практический вывод:
  - `Flash-Lite` — дешёвый/быстрый классификатор и первичный summarizer.
  - `Flash` — основной рабочий генератор постов.
  - `2.5 Pro` — только для лучших/сложных постов или weekly longform.
- Русский/английский: хороший вариант для обоих языков.
- Риск: free tier ограничен квотами; для роста позже может понадобиться billing, но MVP можно начать без него.

### 2. Groq API — лучший быстрый бесплатный запасной вариант
- Docs: https://console.groq.com/docs/rate-limits
- Models: https://console.groq.com/docs/models
- Почему: быстрый inference и опубликованные free-plan лимиты.
- Что подтверждено официально:
  - Groq публикует `model-specific` rate limits для Free Developer plan;
  - доступные лимиты зависят от конкретной модели и могут отличаться по RPM/RPD и token throughput;
  - для MVP-блога бесплатного плана достаточно как минимум для daily summarization, классификации и запасного generation path.
- Практический вывод:
  - `qwen/qwen3-32b` — хороший backup для EN/RU summarization и drafting.
  - `llama-3.3-70b-versatile` — сильный quality backup, если хватает суточного лимита.
- Русский/английский: для русского я бы больше доверял `Qwen`, для английского подойдут и `Qwen`, и `Llama`.
- Риск: это open-model stack, так что стиль и factual discipline надо контролировать строже, чем у Gemini.

### 3. OpenRouter free models — удобный fallback, но не основной контур
- FAQ: https://openrouter.ai/docs/faq
- Free router: https://openrouter.ai/docs/guides/routing/routers/free-models-router
- Почему: удобный единый API и много бесплатных моделей.
- Подтвержденный free-tier:
  - новые пользователи получают небольшой free allowance;
  - free models обычно ограничены `50 requests/day total`;
  - есть `openrouter/free`.
- Практический вывод:
  - Отлично как резервный слой и playground.
  - Плохо как главный production LLM для ежедневного блога.

### Что я не рекомендую как базовый LLM для этого проекта
- **Hugging Face Inference Providers routed free tier**
  - Документация: https://huggingface.co/docs/inference-providers/en/pricing
  - Причина: у free users всего `$0.10` monthly credits. Для ежедневного блогера это слишком мало.

## Фильтр политики

### Краткая оценка по каждому кандидату
- **GDELT DOC API**: сложно. Придется фильтровать query-слоем, blacklist-словами и, желательно, whitelist-источниками/доменами.
- **The Guardian Open Platform**: умеренно просто. Секции и теги позволяют не ходить в politics вообще.
- **TheSportsDB**: очень просто. Категория узкая и чистая.
- **Frankfurter**: очень просто. Политика почти не возникает.
- **CoinGecko**: просто. Если брать рыночные и category endpoints, политики мало; сложнее будет только если добавить новостные/социальные сигналы извне.

### Практический совет
Лучший anti-politics подход для MVP:
1. Брать как можно больше **категориальных** источников.
2. Для GDELT держать:
   - whitelist тем,
   - blacklist политических ключевых слов,
   - blacklist доменов/секций,
   - пост-фильтр классификатором на `Gemini Flash-Lite`.

## Вывод о жизнеспособности идеи

### Короткий вывод
Идея **жизнеспособна как MVP**.

### Почему
- Публичные аналоги уже есть, значит формат не выдуман.
- Бесплатный стек для первой версии собрать можно.
- Главная проблема не в data access, а в **ценности текста**:
  - если блог будет просто рерайтить новости, он сольется с шумом;
  - если блог даст устойчивую persona, прозрачность источников и интересный способ "размышлять", шанс на дифференциацию есть.

### Что известно уверенно
- Бесплатные источники данных для всех нужных вертикалей найдены и подтверждены.
- Бесплатные LLM с реальным лимитом найдены и подтверждены.
- Категория AI-bloggers существует.

### Что вероятно
- Для MVP хватит связки `GDELT + TheSportsDB + Frankfurter + CoinGecko + Gemini`.
- Для отсечения политики понадобится отдельный фильтр уже на этапе ingestion.

### Что пока гипотеза
- Сайт с чисто AI-authored "человеческими размышлениями" сможет удерживать аудиторию без сильной авторской рамки, прозрачности и отбора тем.

## Рекомендуемый стартовый стек
- **World / broad signal:** GDELT DOC API
- **Structured non-commercial backup:** The Guardian Open Platform
- **Sports:** TheSportsDB
- **FX:** Frankfurter
- **Crypto:** CoinGecko Demo
- **Primary LLM:** Gemini 2.5 Flash
- **Cheap classifier / filter:** Gemini 2.5 Flash-Lite
- **Fast backup LLM:** Groq + Qwen 3 32B
- **Fallback router:** OpenRouter free

## Источники и их качество
- GDELT DOC API: primary / official / stale-doc-but-live-service / direct evidence
- The Guardian Open Platform: primary / official / recent / direct evidence
- TheSportsDB docs: primary / official / recent / direct evidence
- Frankfurter docs: primary / official / recent / direct evidence
- CoinGecko docs: primary / official / recent / direct evidence
- Gemini API docs: primary / official / recent / direct evidence
- Groq docs: primary / official / recent / direct evidence
- OpenRouter docs: primary / official / recent / direct evidence
- TechCrunch / The New Stack for Claude Explains: secondary / reputable / recent / direct reporting
