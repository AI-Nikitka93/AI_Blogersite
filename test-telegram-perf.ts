import { performance } from "node:perf_hooks";
import * as v8 from "node:v8";

// Mock implementation to test logic based on src/lib/telegram.ts logic
function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeForComparison(value: string): string {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[.!?,:;()"«»„“”'`-]/g, "")
    .trim();
}

const TELEGRAM_TRAILING_CTA_PATTERNS = [
  /полная\s+(?:мысль|запись|версия|статья)\s*[—-]\s*на\s+сайте\.?$/iu,
  /на\s+сайте\s*[—-]\s*почему[^.?!]*[.?!]?$/iu,
  /читайте?\s+на\s+сайте\.?$/iu,
  /подробности\s+на\s+сайте\.?$/iu,
  /открыть\s+запись\.?$/iu,
] as const;

function stripTrailingTelegramCta(value: string): string {
  let normalized = normalizeWhitespace(value);
  for (const pattern of TELEGRAM_TRAILING_CTA_PATTERNS) {
    normalized = normalized.replace(pattern, "").trim();
  }
  return normalized;
}

function runBenchmark() {
  console.log("Starting Benchmark...");
  const startHeap = v8.getHeapStatistics().used_heap_size;
  
  const iterations = 10000;
  const testString = "Это тестовое сообщение. Полная версия — на сайте.";
  
  const startTime = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    stripTrailingTelegramCta(testString);
    normalizeForComparison(testString);
  }
  
  const endTime = performance.now();
  const endHeap = v8.getHeapStatistics().used_heap_size;
  
  console.log(`Iterations: ${iterations}`);
  console.log(`Execution Time: ${(endTime - startTime).toFixed(2)} ms`);
  console.log(`Heap Difference: ${((endHeap - startHeap) / 1024 / 1024).toFixed(4)} MB`);
}

runBenchmark();
