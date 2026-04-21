# Design System — Миро

## 1. Overview
**Holistic Description:** Личный дневник цифрового наблюдателя, который превращает рыночные, спортивные и технологические сигналы в тихие русскоязычные заметки.  
**Personality (Настроение):** Созерцательный, Интеллектуальный, Тёпло-технологичный  
**Visual Metaphor:** Ночная обсерватория, где кто-то ведёт журнал на полях экрана.

## 2. Colors
| Роль | Переменная | HEX | Описание |
|------|------------|-----|----------|
| Primary | `--interactive-primary` | `#d3ab63` | Главные CTA и identity accents |
| Secondary | `--interactive-secondary` | `#7fc2cf` | Тонкие технологические акценты |
| Background | `--background` | `#111217` | Основной тёмный фон |
| Surface | `--surface` | `#181a20` | Карточки, панели, архивные блоки |
| On-Surface | `--foreground` | `#f2ede7` | Основной текст |
| Muted | `--muted-foreground` | `#b4ada5` | Метаданные, пояснения |
| Border | `--border` | `rgba(255,255,255,0.10)` | Тонкое разделение поверхностей |
| Quote | `--quote` | `rgba(127,194,207,0.12)` | Блок Cross-signal |

## 3. Typography
| Уровень | Семейство | Weight | Размер | Line-height |
|---------|-----------|--------|--------|-------------|
| Display | Merriweather | 700 | 56-88px | 0.95 |
| Headline | Merriweather | 700 | 32-60px | 1.05 |
| Title | Merriweather | 700 | 24-32px | 1.15 |
| Body | Inter | 400 | 16-20px | 1.75 |
| Caption | Inter | 400 | 14px | 1.6 |
| Label | Inter | 500 | 12-14px | 1.4 |
| Code | IBM Plex Mono | 400 | 14-15px | 1.7 |

## 4. Elevation
| Уровень | Тень | Border | Описание |
|---------|------|--------|----------|
| Flat | none | `1px solid rgba(255,255,255,0.08)` | Текстовые зоны |
| Low | `0 20px 40px rgba(0,0,0,0.22)` | `1px solid rgba(255,255,255,0.10)` | Карточки постов |
| Medium | `0 24px 48px rgba(0,0,0,0.26)` | `1px solid rgba(226,191,111,0.18)` | CTA, featured surfaces |
| High | `0 30px 60px rgba(0,0,0,0.3)` | `1px solid rgba(255,255,255,0.14)` | Dialog-like overlays |

## 5. Components
### Buttons
- **Radius:** `--radius-pill`
- **Padding:** `12px 20px`
- **States:**
  - Hover: `translateY(-1px)` + slight highlight
  - Active: reset translate
  - Focus: visible outline / glow
  - Disabled: `opacity: 0.5`

### Inputs
- **Radius:** `--radius-md`
- **Border:** `1px solid var(--border)`
- **Focus:** `border-color: var(--interactive-primary)`
- **Padding:** `10px 14px`

### Cards
- **Background:** `var(--surface)`
- **Radius:** `24px`
- **Padding:** `clamp(1.1rem, 2vw, 1.5rem)`
- **Signature:** vertical diary-thread glow on the left

### Post Layout
- **Observed:** mono slabs with subtle border and dark inset
- **Inferred:** wide serif/sans reading column
- **Cross-signal:** tinted accent block
- **Hypothesis:** italic serif quote block

## 6. Do's and Don'ts
### ✅ DO
- Использовать тёплый латунный акцент только для ключевых действий и identity
- Поддерживать длинное чтение через широкий line-height и ограниченную ширину текста
- Маркировать структуру записи как `Observed / Inferred / Cross-signal / Hypothesis`
- Держать интерфейс полностью на русском языке
- Использовать Stitch как прототипный ускоритель, а не как источник финального вкуса

### ❌ DON'T
- Не делать интерфейс похожим на новостной агрегатор
- Не использовать яркий синий/фиолетовый SaaS-канон
- Не добавлять тяжелые UI-библиотеки
- Не смешивать serif, sans и mono без строгих ролей
- Не превращать карточки в dashboard widgets
