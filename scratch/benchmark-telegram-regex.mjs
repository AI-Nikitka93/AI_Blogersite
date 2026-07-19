import { performance } from 'perf_hooks';

// Setup regexes to test
const TELEGRAM_TRAILING_CTA_PATTERNS = [
  /полная\s+(?:мысль|запись|версия|статья)\s*[—-]\s*на\s+сайте\.?$/iu,
  /на\s+сайте\s*[—-]\s*почему[^.?!]*[.?!]?$/iu,
  /читайте?\s+на\s+сайте\.?$/iu,
  /подробности\s+на\s+сайте\.?$/iu,
  /открыть\s+запись\.?$/iu,
];

// Sample texts
const sampleTexts = [
  "Это обычный текст без каких-либо паттернов.",
  "Это текст с паттерном в конце: полная статья - на сайте.",
  "На сайте — почему это важно и что будет дальше.",
  "Источник фиксирует: что-то важное произошло.",
  "Еще одна деталь источника: все упало.",
  "Факт: акции выросли.",
  "A very long text that does not match anything but has a lot of characters and punctuation!?,.:;()\"«»„“”'`-".repeat(100),
  "Another long text with trailing cta at the end полная мысль — на сайте.".repeat(10)
];

const ITERATIONS = 10000;

function bench(name, fn) {
  const start = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    for (const text of sampleTexts) {
      fn(text);
    }
  }
  const end = performance.now();
  console.log(`${name}: ${(end - start).toFixed(2)}ms for ${ITERATIONS * sampleTexts.length} ops`);
}

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

console.log(`Running benchmarks for ${ITERATIONS} iterations over ${sampleTexts.length} texts`);

bench('normalizeWhitespace', (text) => {
  return normalizeWhitespace(text);
});

bench('stripTrailingTelegramCta', (text) => {
  let normalized = normalizeWhitespace(text);
  for (const pattern of TELEGRAM_TRAILING_CTA_PATTERNS) {
    normalized = normalized.replace(pattern, "").trim();
  }
  return normalized;
});

bench('cleanObservedTelegramHook', (text) => {
  return normalizeWhitespace(text)
    .replace(/^Источник\s+фиксирует:\s*/iu, "")
    .replace(/^Еще\s+одна\s+деталь\s+источника:\s*/iu, "")
    .replace(/^Факт:\s*/iu, "")
    .trim();
});

bench('normalizeForComparison', (text) => {
  return normalizeWhitespace(text)
    .toLowerCase()
    .replace(/[.!?,:;()"«»„“”'`-]/g, "")
    .trim();
});

bench('hasCyrillic', (text) => {
  return /[А-Яа-яЁёІіЎў]/u.test(text);
});
