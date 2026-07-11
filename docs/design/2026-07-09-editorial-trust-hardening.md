# Editorial Trust Hardening — 2026-07-09

## Цель

Сделать Миро не «генератором уверенных пересказов», а коротким русскоязычным редакционным журналом с проверяемой границей между источником, фактом и выводом.

## Что изменено

- Удалён временный bypass novelty gate в cron; повторный source URL теперь блокирует публикацию даже при других заголовке и формулировке.
- URL нормализуется перед сравнением: UTM и другие tracking-параметры не создают новую «историю».
- Single-fact режим ограничен компактной заметкой; новые лаборатории, репозитории, продукты и механизмы вне факта блокируются.
- Review prompt теперь выбирает честный skip вместо необоснованного расширения сюжета.
- Political/geopolitical framing и шаблонные эмоциональные открытия блокируются до insert и на public reader surface.
- Главная получила handcrafted SVG-компонент `EvidenceChain`: источник → факт → предел вывода. Это заменяет абстрактный декоративный паттерн конкретным редакционным сигналом.

## Reference decisions

Проверено 2026-07-09:

- [The Browser](https://thebrowser.com/welcome/) показывает ценность кураторского продукта через компактную, читаемую редакционную капсулу, а не через избыток интерфейсных метрик.
- [404 Media](https://www.404media.co/) строит ленту вокруг ясной авторской позиции, категории и датировки материала.
- [The Markup](https://themarkup.org/) выносит методологию и проверяемость данных в сам продукт; его [style guide](https://design.themarkup.org/) подчёркивает ясность data-viz над украшением.
- [Awwwards: Magazine / Newspaper / Blog](https://www.awwwards.com/websites/blogs/) использован как отрицательный фильтр: не переносить в рабочую ленту тяжёлый showcase-motion, который мешает чтению.

Решения, видимые в реализации:

1. Первый экран объясняет способ доверия через `EvidenceChain`, а не через общий AI-образ.
2. Карточка продолжает показывать источник, дату и confidence; основной trust signal — проверяемая опора, не «мнение модели».
3. Mobile не получает отдельную урезанную логику: доказательный контур остаётся компактным и читаемым в одной колонке.

## Workshop sweep

| Зона | Решение | Причина |
|---|---|---|
| WEB_ANIMATION | use | Custom SVG trust-asset и browser QA для editorial UI. |
| INTERACTIVE | skip | WebGL/Canvas добавил бы шум и не усилил проверяемость постов. |
| IMAGEN / ComfyUI / VIDEO / 3D | skip | У Миро нет честного предмета для генерации; псевдодокументальная иллюстрация снизила бы доверие. |
| ZVUK / MUSIK / Speak | skip | Аудио не относится к основному сценарию чтения. |
| API / LLM lab | skip | Провайдеры не менялись; задача решается качественными ограничениями существующего контура. |

## Asset manifest

| Asset | Тип | Путь | QA |
|---|---|---|---|
| EvidenceChain | Handcrafted inline SVG + semantic HTML | `src/components/miro/evidence-chain.tsx` | Desktop/mobile browser smoke, reduced-motion neutral. |

## Acceptance checks

- `npm run typecheck`
- `npm run test:agent-quality`
- `npm run test:public-post-quality`
- `npm run test:source-filters`
- `npm run check`
- Local browser desktop/mobile screenshots, no overflow, console inspection.

## Known boundary

Эти правила предотвращают новые слабые публикации и скрывают запрещённую public copy. Они не переписывают уже сохранённые строки в Supabase: для этого нужен отдельный, подтверждённый пользователем repair/regeneration batch.
