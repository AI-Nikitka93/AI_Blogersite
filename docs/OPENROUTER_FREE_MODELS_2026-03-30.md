# OpenRouter Free Models Review

Дата: 2026-03-30

✅ Данные актуальны на: 2026-03-30

## Что подтверждено официально
- Через официальный `https://openrouter.ai/api/v1/models` на момент проверки виден `25` бесплатных моделей/роутов.
- На странице [Free Models Router](https://openrouter.ai/openrouter/free) подтверждено, что `openrouter/free` — это роутер, который выбирает бесплатные модели случайным образом и фильтрует их по нужным capabilities.
- Через OpenRouter docs search подтверждены текущие free-tier ограничения: `50 free model API requests per day` и `20 requests per minute`.
- Через OpenRouter docs search подтверждено наличие `25+ free models` и `4 free providers`.

## Полный актуальный список free models / routers

| ID | Контекст | Полезные capabilities |
| --- | ---: | --- |
| `arcee-ai/trinity-large-preview:free` | 131000 | `response_format`, `structured_outputs` |
| `arcee-ai/trinity-mini:free` | 131072 | `response_format`, `structured_outputs`, `reasoning` |
| `cognitivecomputations/dolphin-mistral-24b-venice-edition:free` | 32768 | `response_format`, `structured_outputs` |
| `google/gemma-3-12b-it:free` | 32768 | `vision` |
| `google/gemma-3-27b-it:free` | 131072 | `response_format`, `vision` |
| `google/gemma-3-4b-it:free` | 32768 | `response_format`, `vision` |
| `google/gemma-3n-e2b-it:free` | 8192 | `response_format` |
| `google/gemma-3n-e4b-it:free` | 8192 | `response_format` |
| `liquid/lfm-2.5-1.2b-instruct:free` | 32768 | — |
| `liquid/lfm-2.5-1.2b-thinking:free` | 32768 | `reasoning` |
| `meta-llama/llama-3.2-3b-instruct:free` | 131072 | — |
| `meta-llama/llama-3.3-70b-instruct:free` | 65536 | — |
| `minimax/minimax-m2.5:free` | 196608 | `response_format`, `reasoning` |
| `nousresearch/hermes-3-llama-3.1-405b:free` | 131072 | — |
| `nvidia/nemotron-3-nano-30b-a3b:free` | 256000 | `reasoning` |
| `nvidia/nemotron-3-super-120b-a12b:free` | 262144 | `response_format`, `structured_outputs`, `reasoning` |
| `nvidia/nemotron-nano-12b-v2-vl:free` | 128000 | `reasoning`, `vision` |
| `nvidia/nemotron-nano-9b-v2:free` | 128000 | `response_format`, `structured_outputs`, `reasoning` |
| `openai/gpt-oss-120b:free` | 131072 | `reasoning` |
| `openai/gpt-oss-20b:free` | 131072 | `reasoning` |
| `openrouter/free` | 200000 | `response_format`, `structured_outputs`, `reasoning`, `vision` |
| `qwen/qwen3-coder:free` | 262000 | — |
| `qwen/qwen3-next-80b-a3b-instruct:free` | 262144 | `response_format`, `structured_outputs` |
| `stepfun/step-3.5-flash:free` | 256000 | `reasoning` |
| `z-ai/glm-4.5-air:free` | 131072 | `reasoning` |

## Лучшие free models на сегодня для проекта "Миро"

### 1. `qwen/qwen3-next-80b-a3b-instruct:free`
Почему сильный кандидат:
- В официальном описании OpenRouter модель прямо позиционируется как оптимизированная для `fast, stable responses without "thinking" traces`.
- Подходит для `consistent final answers`, `multilingual use`, `long-context task solving`.
- Поддерживает `response_format` и `structured_outputs`.

Вердикт:
- **Лучший бесплатный pinned candidate для основного post generator на OpenRouter.**

### 2. `nvidia/nemotron-3-super-120b-a12b:free`
Почему сильный кандидат:
- Огромный контекст `262144`.
- Поддерживает `response_format`, `structured_outputs`, `reasoning`.
- В описании акцент на `complex multi-agent applications`, `cross-document reasoning`, `multi-step task planning`.

Вердикт:
- **Лучший reasoning-heavy free candidate**, особенно если нужен строгий JSON и длинный контекст.

### 3. `arcee-ai/trinity-large-preview:free`
Почему сильный кандидат:
- В официальном описании выделены `creative writing`, `storytelling`, `role-play`, `chat scenarios`.
- Поддерживает `response_format` и `structured_outputs`.
- Это лучший fit именно под голос Миро как цифрового дневниковеда.

Вердикт:
- **Лучший free candidate для более “живого” и литературного тона**, если качество JSON держится на вашей стороне в runtime.

### 4. `nvidia/nemotron-nano-9b-v2:free`
Почему сильный кандидат:
- Поддерживает `response_format`, `structured_outputs`, `reasoning`.
- Меньший размер делает его естественным кандидатом для дешевого фильтра.

Вердикт:
- **Лучший free candidate для anti-politics gatekeeper на OpenRouter.**

### 5. `openrouter/free`
Почему полезен:
- Официально маршрутизирует только бесплатные модели и умеет подбирать их по capabilities, включая `structured_outputs`.

Почему не лучший основной вариант:
- Это роутер, а не закрепленная модель.
- Поведение и качество будут плавать вместе с составом free-пула.

Вердикт:
- **Лучший fallback / playground**, но не лучший pinned production model.

## Наблюдаемые сильные, но не лучшие для вашего кейса

### `stepfun/step-3.5-flash:free`
- Судя по странице activity у `openrouter/free`, сейчас это самый заметный по usage free-кандидат.
- Но в официальном API-списке capabilities не видно `structured_outputs`, поэтому для строгого JSON-контракта он менее удобен, чем `Qwen3 Next` или `Nemotron`.

### `meta-llama/llama-3.3-70b-instruct:free`
- Сильный зрелый generalist.
- Но в текущем списке capabilities на OpenRouter у free-варианта не отмечены `response_format` и `structured_outputs`.
- Для Миро это хороший запасной prose model, но не лучший JSON-first candidate.

### `nousresearch/hermes-3-llama-3.1-405b:free`
- Очень мощный generalist и historically интересен для steering/roleplay.
- Но текущий free-вариант на OpenRouter не отмечен capability-флагами для structured output.

### `openai/gpt-oss-120b:free`
- Выглядит сильным для reasoning/agentic use.
- Но в текущем OpenRouter capability-списке free-варианта не видно `response_format` или `structured_outputs`.

### `google/gemma-3-27b-it:free`
- Хороший мультимодальный и multilingual кандидат.
- Для чисто текстового `Миро` есть более подходящие text-specialist free-модели.

## Практическая рекомендация для проекта

### Если вы остаетесь на Groq как основном стеке
- Основной стек не меняется.
- OpenRouter использовать как:
  - `fallback writer`;
  - sandbox для prompt A/B;
  - резервный post generator, если Groq-model повел себя нестабильно.

### Если вы хотите реальный OpenRouter fallback layer
- **Pinned writer:** `qwen/qwen3-next-80b-a3b-instruct:free`
- **Pinned gatekeeper:** `nvidia/nemotron-nano-9b-v2:free`
- **Creative variant for longform tests:** `arcee-ai/trinity-large-preview:free`
- **Emergency router fallback:** `openrouter/free`

## Почему OpenRouter все еще не лучший основной production path
- `50 requests/day` — слишком мало для уверенного production-loop с генерацией, ретраями, smoke-тестами и background jobs.
- `openrouter/free` как роутер нестабилен по качеству и воспроизводимости.
- Бесплатный каталог у них живой и может меняться довольно быстро.

## Итог
- **Да, OpenRouter free сегодня стоит изучать всерьез.**
- **Нет, он все еще не лучший single primary provider для MVP блога**, если нужен предсказуемый daily pipeline.
- **Да, как второй слой он стал заметно интереснее**, чем выглядел в нашем первом грубом обзоре.
