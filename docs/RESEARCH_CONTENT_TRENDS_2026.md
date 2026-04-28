# Контентные паттерны 2026 для Миро: исследовательский обзор
Дата: 2026-04-28

## Scope
- Что исследовано: актуальные на апрель 2026 паттерны сильного короткого авторского письма для web/blog surfaces и Telegram-тизеров; отдельно изучены платформенные механики Substack, Medium и Telegram, а также признаки `AI slop`.
- Режим: `DEEP DIVE`
- Что не входило в scope:
  - переписывание `prompts.ts`;
  - кодовые изменения;
  - анализ платных закрытых creator-courses;
  - детальная оценка конкретных каналов владельца проекта по Telegram analytics.

## Краткий вывод
- В 2026 слабый ИИ-контент распознается не только по ошибкам фактов, а по тону: он слишком гладкий, слишком cheerful, слишком “правильный”, но без реальной ставки, без внутреннего трения и без угла зрения.
- Сильный короткий текст в 2026 выигрывает не “полнотой пересказа”, а тремя вещами: `конкретный сигнал`, `неожиданный смысловой поворот`, `ограниченная, но смелая интерпретация`.
- Для сайта Миро нужен режим `micro-essay`, а не `news recap`: факт -> напряжение -> inference -> bounded hypothesis.
- Для Telegram нужен не “сухой анонс”, а `эмоциональный вход в мысль`: 1 конкретный крючок, 1 напряжение, 1 обещание нового угла, 1 чистый CTA.
- Платформы сами подсказывают это направление:
  - Substack ввел title testing, social preview editing, Notes, callout blocks и app-first queue/discovery surfaces.
  - Medium позволяет отделять preview title/subtitle от title на самой странице.
  - Telegram усиливает значение formatting, caption placement, link previews и компактного scan-first письма.

## Текущий консенсус

### Confirmed
- Плохой AI-текст в 2026 ассоциируется с `little to no originality`, `little to no added value`, стерильным пересказом и массовым scale without value.
- Упаковка и превью стали частью письма, а не косметикой:
  - Substack официально поддерживает social preview editing и title testing.
  - Medium официально поддерживает отдельные preview title/subtitle.
  - Telegram технически делает link preview и rich formatting частью самой единицы потребления поста.
- Telegram-посты надо проектировать с учетом surface constraints:
  - обычный text message: до `4096` символов;
  - media caption: до `1024` символов;
  - в альбоме only first caption reliably carries the primary formatting/message.

### Likely
- В 2026 короткие умные тексты побеждают длинные свалки за счет `compression with tension`: меньше объяснений, больше смысловой плотности.
- Авторы выигрывают, когда отделяют `preview copy` от `body copy`: headline/teaser продает угол, а не пересказывает весь материал.
- В Telegram работает не “больше эмодзи”, а `контролируемая драматургия` плюс один ясный мотив клика.

### Contested / weak evidence
- Универсальная “идеальная длина” для Telegram или Substack не подтверждается official docs.
- Любые точные рекомендации по символам/словам для engagement — это synthesis из platform mechanics и practitioner evidence, а не официальный стандарт.

## Спорные вопросы
- Насколько далеко можно заходить в эмоционализации hook-а без перехода в дешевый clickbait.
- Нужно ли Telegram-тизеру быть совсем коротким (`90–220` символов) или умеренно коротким (`220–600`), если канал уже привык к более “журнальному” тону.
- Сколько “личного мнения” допустимо, прежде чем автор начинает звучать как позер или театральный AI.

## Ключевые факты и сигналы

### 1. Что в 2026 считается `AI slop`

#### Confirmed
- Google прямо связывает low-value mass generation с риском `scaled content abuse`: нарушение не в самом факте использования AI, а в производстве большого числа страниц без добавленной ценности.
- Согласно guidance Google, допустимый AI workflow — это AI как помощь в research/structure, но не как конвейер “unoriginal content that provides little to no value”.

#### Confirmed / secondary
- Свежий обзор WIRED от `2026-04-15`, основанный на новом preprint-исследовании, описывает web, где AI-текст делает интернет `more artificially cheerful` и менее идеологически разнообразным.
- Это важно для Миро: плохой ИИ-текст в 2026 часто звучит не как робот из 2023, а как `слишком доброжелательный, слишком нейтральный, слишком чистый текст без когтей`.

#### Practical implication
Запреты для Миро:
- нельзя начинать с общих фраз типа `эта новость показывает`, `это подчеркивает`, `в современном мире`;
- нельзя делать “санитарный” тон, где всё умеренно интересно и ничего не поставлено на кон;
- нельзя публиковать текст без конкретной сцены, конкретной детали, конкретного перекоса или конкретной ставки;
- нельзя прятать отсутствие мысли за гладкой риторикой.

### 2. Что платформы поощряют в 2026

#### Substack
- Home в Substack app — это queue of posts + discovery feed + notes + creator activity.
- Notes — публичный short-form surface.
- Social preview можно редактировать отдельно.
- Title testing официально существует как инструмент роста open rate/engagement.
- Callout blocks и drop caps официально поддерживаются как инструменты визуального ритма.
- Metrics теперь точнее учитывают app opens/views, а не только email.

#### Medium
- Medium позволяет вынести отдельные preview title/subtitle, отличные от on-page title.
- Следствие: упаковка и сам текст — разные уровни работы; нельзя писать один и тот же заголовок для всех surface-ов по инерции.

#### Telegram
- Bot API на `2026-04-03` поддерживает:
  - `bold`, `italic`, `underline`, `strikethrough`, `spoiler`,
  - `blockquote`, `expandable_blockquote`,
  - `text_link`,
  - `show_caption_above_media`,
  - `link_preview_options`.
- Text message limit: `1–4096` chars after entity parsing.
- Caption limit: `0–1024` chars after entity parsing.
- Telegram preview strongly зависит от OG tags; practical guidance 2026 рекомендует image около `1280x640`, HTTPS и clean metadata.

## Практические выводы

## Блок A — Блог (Сайт): как писать глубже и умнее

### Цель surface
Не “объяснить новость”, а `зафиксировать, почему этот сигнал меняет картину дня`.

### Базовая модель текста для Миро
`Observed -> Tension -> Inferred -> Hypothesis`

#### 1. Observed
- 1-2 предложения.
- Только конкретика.
- Никакой интерпретации.
- Нужен один факт-якорь, который можно увидеть, представить или измерить.

Плохо:
> На рынке произошли интересные изменения, которые могут оказаться важными.

Хорошо:
> Биткоин почти не сдвинулся, а эфир ушел вниз сильнее остальных крупных монет.

#### 2. Tension
- 1 короткий абзац.
- Ответ на вопрос: `что здесь не складывается гладко?`
- Если напряжения нет, текста нет.

Подходящие типы tension:
- асимметрия;
- задержка;
- несоответствие между ожиданием и фактом;
- локальная деталь с большим смыслом;
- тихий сигнал, который выглядит малым, но меняет направление.

#### 3. Inferred
- 2-4 предложения.
- Здесь рождается “ум” текста.
- Не пересказ, а смысловая сборка: `что это значит не буквально, а структурно?`

Формула:
- `если X и Y расходятся, то сигнал не в движении, а в разрыве между ними`;
- `если маленький факт удерживает внимание дольше большой новости, то изменился не масштаб события, а масштаб восприятия`;
- `если технология снимает трение в одном узком месте, это часто важнее большого анонса`.

#### 4. Hypothesis
- 1-3 предложения.
- Это не прогноз “как будет”, а ограниченная гипотеза вида:
  - `если X продолжится, тогда Y`;
  - `пока похоже, что...`;
  - `слишком рано говорить о переломе, но уже видно...`.

Хорошая гипотеза всегда:
- условна;
- ограничена;
- не симулирует certainty.

### Жесткие правила для blog-copy

#### Rule 1 — Без факта нет текста
Минимум:
- `2 observed details`
- `1 tension`
- `1 inferred leap`
- `1 bounded hypothesis`

Если есть только один факт и один пересказ, это `skip`.

#### Rule 2 — Один пост = одна интеллектуальная ставка
Нельзя тащить в короткий текст:
- три вывода;
- два противоположных тезиса;
- “с одной стороны / с другой стороны”.

Нужна одна ясная мысль.

#### Rule 3 — Не писать “обо всем”
Если текст можно подставить почти к любой новости, он мертв.

Запрещенные формы:
- `это подчеркивает важность`;
- `в современном мире`;
- `вопрос остается открытым`;
- `время покажет`;
- `это может иметь серьезные последствия`.

#### Rule 4 — Разница между `Inferred` и `Hypothesis` должна быть реальной
- `Inferred` = то, что уже логически вытекает из фактов.
- `Hypothesis` = следующий шаг, который еще не доказан.

Пример:
- `Inferred`: рынок перестал двигаться как единый экран.
- `Hypothesis`: если перекос удержится, ближайшие дни будут нервнее, чем выглядит общий индекс.

#### Rule 5 — Неожиданный вывод важнее “полного” вывода
Сильный короткий текст не обязан быть исчерпывающим.
Он обязан:
- открыть новый угол;
- заставить задержаться;
- дать мысль, которую не дал бы обычный агрегатор.

#### Rule 6 — Ритм текста должен дышать
`RECOMMENDED`, не официальный лимит:
- оптимальная длина для Миро-сайта: `220–450 слов` для everyday post;
- если мысль требует больше, верхняя рабочая граница: `~650 слов`, но только если плотность реально держится.

Параграфы:
- 1 идея = 1 абзац;
- чаще 1–3 предложения;
- длинные абзацы использовать только если это один нарастающий cognitive move;
- каждые `80–140` слов должен быть визуальный или мыслительный “перелом”.

#### Rule 7 — Финал не должен закрывать всё
Плохой финал:
> В целом эта ситуация показывает, как быстро меняется мир.

Хороший финал:
> Пока это еще не перелом. Но уже не фон.

### Допустимые структуры для сайта

#### Framework A — `Signal -> Friction -> Meaning -> Forecast`
Лучший базовый вариант для Миро.

#### Framework B — `Concrete scene -> Hidden asymmetry -> Thesis`
Для world / culture / human detail posts.

#### Framework C — `Two facts in conflict -> Why conflict matters -> Limited implication`
Для markets / sports / tech.

### Как выглядит “тупой ИИ” на сайте

#### Анти-пример 1
> Сегодня на рынке криптовалют наблюдалась смешанная динамика. Некоторые активы снизились, в то время как другие показали устойчивость. Это говорит о том, что участники рынка продолжают искать новые ориентиры. В ближайшее время ситуация может развиваться по-разному.

Почему плохо:
- нет конкретной сцены;
- нет tension;
- нет настоящего inference;
- финал ничего не значит.

#### Анти-пример 2
> Ученые сделали важное открытие, которое может повлиять на будущее технологий. Это исследование показывает, насколько быстро развивается наука и как она может менять наш мир.

Почему плохо:
- generic praise;
- fake significance;
- interchangeable with 10,000 other AI posts.

### Как выглядит “умный автор 2026” на сайте

#### Пример 1
> Биткоин почти не сдвинулся, а эфир ушел вниз заметно сильнее. Для меня здесь важен не общий цвет экрана, а разная скорость соседних линий. Когда рынок перестает падать или расти вместе, он становится нервнее, чем хочет казаться. Это еще не разворот. Но уже и не единый фон.

#### Пример 2
> Ученые не просто “сделали открытие”. Они сняли одно узкое трение, которое десятилетиями держало материал в лабораторной редкости. Меня цепляет не событие, а смена доступности. Такие вещи тихо двигают границу возможного, а не только список новостей.

## Блок B — Telegram: как писать тизеры, которые хочется открыть

### Цель surface
Не “пересказать пост”, а `дать эмоционально-интеллектуальный вход`, который делает клик естественным.

### Что Telegram-пост не должен делать
- не должен быть мини-рефератом статьи;
- не должен объяснять всё;
- не должен звучать как RSS-бот;
- не должен просить клик без причины.

### Что Telegram-пост должен делать
- открыть tension за 1-2 строки;
- дать один вкус мысли;
- удержать одну недосказанность;
- закончиться ясным `read-the-rest` переходом.

### Жесткие правила для Telegram

#### Rule 1 — Hook должен быть смысловым, не декоративным
Рабочие hook-типы:
- нарушенное ожидание;
- резкая конкретика;
- скрытый конфликт;
- маленькая деталь с большим следствием;
- риск / ставка / странность.

Хорошие крючки:
- `Экран был почти спокойным, пока одна линия не ушла в сторону.`
- `Здесь важен не рост. Здесь важен разрыв.`
- `Новость маленькая. Именно поэтому она застревает.`

Плохие крючки:
- `Интересная новость сегодня!`
- `Вы не поверите...`
- `Очень важный инсайт!`

#### Rule 2 — Telegram тизер обычно должен быть короче и плотнее сайта
`RECOMMENDED`, не platform rule:

##### Вариант 1 — короткий тизер с link preview
- `120–280` символов
- 2-4 коротких строки
- 1 мысль, 1 клик

##### Вариант 2 — плотный текстовый тизер без media
- `280–650` символов
- 3-6 строк
- hook + 1 concrete fact + 1 inference + CTA

##### Вариант 3 — media caption
- держаться в районе `180–500` символов
- помнить, что Bot API caption ceiling = `1024`
- главную мысль ставить в первый caption, особенно для album posts

#### Rule 3 — Лучший тизер не повторяет lead статьи слово в слово
Сайт и Telegram должны быть siblings, а не копии.

Принцип:
- сайт = разворачивает мысль;
- Telegram = продает угол и эмоцию.

#### Rule 4 — Один пост = один CTA
Лучшие CTA:
- `Читать полностью`
- `Открыть заметку`
- `Смотреть, почему`
- `Развернул мысль на сайте`
- `Полный ход мысли — здесь`

Слабые CTA:
- `переходите по ссылке`
- `не забудьте прочитать`
- `подписывайтесь, ставьте лайк`

#### Rule 5 — Formatting должно усиливать ритм, а не имитировать энергию

##### Confirmed by Telegram mechanics
- text messages: до `4096` chars
- captions: до `1024`
- formatting entities supported: bold, italic, spoiler, quote, expandable quote, links, etc.
- `show_caption_above_media` существует

##### Practical rules
- `bold` использовать 1-2 раза максимум;
- underline почти не использовать: часто читается как “это ссылка”;
- emoji — максимум `0–2`, и только если они маркируют тон, а не заполняют пустоту;
- quote block полезен для чужой сильной фразы или одной “ударной” строки, но не для половины поста;
- если превью сильное, не убивать его лишним шумом вокруг ссылки.

#### Rule 6 — Preview management это часть copy
- Если у страницы сильные `og:title`, `og:description`, `og:image`, preview надо использовать как social proof и визуальный якорь.
- Если пост multi-link или preview misleading, preview лучше убирать.
- Для Telegram preview image practical recommendation: около `1280x640`, HTTPS, четкий title/description.

#### Rule 7 — В Telegram нельзя быть “сдержанно никаким”
Тон может быть спокойным, но не бесцветным.

Нужны:
- позиция;
- легкая эмоция;
- человеческий импульс.

Не нужны:
- канцелярский neutral voice;
- гладкая вежливость;
- “объективный” пересказ без stakes.

### Рабочие Telegram-фреймворки

#### Framework T1 — `Hook -> Twist -> CTA`
Пример:
> Рынок выглядел спокойным, пока эфир не пошел заметно хуже соседей.  
> Здесь сигнал не в падении, а в разрыве между линиями.  
> Полную мысль развернул на сайте.

#### Framework T2 — `Concrete image -> Why it sticks -> Link`
Пример:
> Маленькая новость про цветущую магнолию держит сильнее большой повестки.  
> Не потому что она “приятная”, а потому что меняет масштаб дня.  
> Открыл это в короткой заметке.

#### Framework T3 — `Claim -> Evidence shard -> Inference`
Пример:
> Самый важный техносигнал дня оказался не громким.  
> Там просто сняли одно старое трение, и этого уже достаточно.  
> Почему это важнее красивого релиза — здесь.

### Как выглядит “тупой ИИ” в Telegram

#### Анти-пример 1
> Сегодня вышла новая статья о ситуации на рынке. В ней рассматриваются основные изменения и возможные последствия. Читайте на сайте.

Почему плохо:
- ноль tension;
- ноль образа;
- ноль причины кликнуть;
- звучит как авторассылка.

#### Анти-пример 2
> 🚨 Очень важная новость! Биткоин снова удивляет рынок! Подробности уже на сайте! Не пропустите!

Почему плохо:
- дешёвый нажим;
- пустая эмоциональность;
- обобщение без конкретики.

### Как выглядит “умный автор 2026” в Telegram

#### Пример 1
> Биткоин почти стоял, а эфир ушел заметно глубже.  
> Для меня это не “смешанная динамика”. Это момент, когда рынок перестает двигаться как один экран.  
> Полная заметка — на сайте.

#### Пример 2
> Новость маленькая: во дворе зацвела магнолия.  
> Но иногда именно такие сигналы ломают масштаб дня сильнее большой повестки.  
> Развернул мысль здесь.

#### Пример 3
> Ученые не просто сделали открытие. Они сняли старое трение.  
> Такие вещи двигают будущее тише, чем громкие анонсы.  
> Короткая заметка — по ссылке.

## Что сейчас является “дурным тоном”

### Для сайта
- объяснять очевидное;
- писать абзацы, которые можно вставить в любой другой пост;
- маскировать отсутствие мысли красивыми прилагательными;
- искусственно “успокаивать” текст, убирая из него конфликт и ставку;
- ставить слишком длинный `Observed`, а `Inferred` делать на одну вялую фразу.

### Для Telegram
- повторять title и description страницы как есть;
- делать hook общим вместо конкретного;
- вставлять 3+ эмодзи ради оживления;
- писать “важная новость” вместо показа, что именно важно;
- пытаться продать клик через шум, а не через мысль.

## Ограничения и неизвестности
- Official docs дают много механики surface-ов, но почти не дают “редакционной философии”; часть правил ниже — это synthesis, а не прямой platform doctrine.
- Для Telegram не существует одного официального стандарта “идеальной длины” или “лучшего CTA”; длины в этом отчете — `RECOMMENDED`, а не `Confirmed`.
- Источники по Telegram writing best practices часто vendor-driven; их нужно читать как practitioner evidence, а не как formal truth.
- Открытых свежих primary-sources от Medium/Substack про “как писать умно, а не скучно” меньше, чем платформенных docs о preview/editor/distribution. Поэтому часть content-rules выведена через сочетание official mechanics + independent analysis of AI-slop.

## Источники и их качество

- [Telegram Bot API](https://core.telegram.org/bots/api) — primary / official / recent (`2026-04-03`), confidence: high
- [Substack Notes](https://support.substack.com/hc/en-us/articles/14564821756308-Getting-started-on-Substack-Notes) — primary / official / recent (`2026-03-04`), confidence: high
- [Substack app](https://support.substack.com/hc/en-us/articles/19291693034004-Getting-started-on-the-Substack-app) — primary / official / recent (`2026-01-30`), confidence: high
- [Substack social preview editing](https://support.substack.com/hc/en-us/articles/360039016992-How-do-I-edit-what-my-post-looks-like-on-social-media) — primary / official / recent (`2026-02-10`), confidence: high
- [Substack callout blocks](https://support.substack.com/hc/en-us/articles/48404956012820-How-do-I-add-a-callout-block-on-a-Substack-post) — primary / official / very recent (`2026-04-20`), confidence: high
- [Substack drop caps](https://support.substack.com/hc/en-us/articles/47849523218196-How-do-I-add-a-drop-cap-to-my-Substack-post) — primary / official / recent (`2026-04-02`), confidence: high
- [Substack title testing](https://support.substack.com/hc/en-us/articles/36026518014100-How-do-I-test-different-titles-for-email-newsletters-on-Substack) — primary / official / somewhat stale (`2025-08-06`), confidence: medium
- [Substack metrics](https://support.substack.com/hc/en-us/articles/5320347155860-A-guide-to-Substack-metrics) — primary / official / recent (`2026-04-13`), confidence: high
- [Substack subscription surface](https://support.substack.com/hc/en-us/articles/360037830631-How-do-readers-subscribe-to-my-Substack-publication) — primary / official / recent (`2026-03-13`), confidence: high
- [Medium custom titles & subtitles](https://help.medium.com/hc/en-us/articles/214895188-Custom-titles-subtitles) — primary / official / recent crawl, live help surface, confidence: high
- [Google Search guidance on generative AI content](https://developers.google.com/search/docs/fundamentals/using-gen-ai-content) — primary / official / recent (`crawled 2026`), confidence: high
- [Google spam policies / scaled content abuse](https://developers.google.com/search/docs/advanced/guidelines/auto-gen-content) — primary / official / recent enough, confidence: high
- [WIRED: AI Slop Is Making the Internet Fake-Happy](https://www.wired.com/story/ai-slop-is-changing-the-internet-just-not-how-you-might-think/) — secondary / reputable / very recent (`2026-04-15`), confidence: medium-high
- [MangoAds Telegram formatting guide](https://mangoads.com/blog/for-channel-owners/telegram-text-formatting-guide) — secondary / practitioner / recent (`2026-04-10` validation note), confidence: medium
- [SharePreview Telegram link preview guide](https://share-preview.com/blog/telegram-link-preview) — secondary / practitioner / recent (`2026-02-23`), confidence: medium
- [SEO.com on AI slop](https://www.seo.com/blog/ai-slop/) — secondary / commercial / recent (`2026-03-16`), confidence: medium-low

## Handoff для P-PROMPT-ENGINEER

### Если превращать это в prompt-rules, то главное:
- Запрещать пост без `tension`.
- Запрещать generic thesis без named concrete signal.
- Требовать явное различие между `Observed`, `Inferred`, `Hypothesis`.
- Для Telegram отделять `site body` от `teaser body`.
- Ввести blacklist на sterile phrases, fake-importance phrases и over-cheerful filler.
- Заставить модель писать как `опинионный куратор`, а не как `news digest bot`.
