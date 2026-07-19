import { performance } from "node:perf_hooks";

function escapeTelegramHtmlRegex(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeTelegramHtmlReplaceAll(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

const testStrings = [
  "Hello World!",
  "A string with <some> tags & symbols 'like' \"this\".",
  "&".repeat(1000) + "<".repeat(1000) + ">".repeat(1000), // Heavy escaping
  "Just a normal long string ".repeat(500)
];

console.log("=== Node.js Benchmark: Regex vs ReplaceAll ===");
const iterations = 100000;

for (const [index, testStr] of testStrings.entries()) {
  console.log(`\nTest String ${index + 1} Length: ${testStr.length}`);
  
  // Warmup
  for (let i = 0; i < 1000; i++) {
    escapeTelegramHtmlRegex(testStr);
    escapeTelegramHtmlReplaceAll(testStr);
  }

  // Regex test
  const startRegex = performance.now();
  for (let i = 0; i < iterations; i++) {
    escapeTelegramHtmlRegex(testStr);
  }
  const endRegex = performance.now();
  
  // ReplaceAll test
  const startReplaceAll = performance.now();
  for (let i = 0; i < iterations; i++) {
    escapeTelegramHtmlReplaceAll(testStr);
  }
  const endReplaceAll = performance.now();

  console.log(`Regex: ${(endRegex - startRegex).toFixed(2)}ms`);
  console.log(`ReplaceAll: ${(endReplaceAll - startReplaceAll).toFixed(2)}ms`);
}
