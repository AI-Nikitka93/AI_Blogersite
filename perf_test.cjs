const { performance } = require('perf_hooks');

const MIXED_CYRILLIC_HOMOGLYPHS = {
  A: "А", B: "В", C: "С", E: "Е", H: "Н", K: "К", M: "М", O: "О", P: "Р", T: "Т", X: "Х", Y: "У",
  a: "а", c: "с", e: "е", o: "о", p: "р", x: "х", y: "у",
};

function normalizeMixedCyrillicHomoglyphs(value) {
  return value.replace(/[A-Za-zА-Яа-яЁёІіЎў]+/gu, (token) => {
    if (!/[A-Za-z]/.test(token) || !/[А-Яа-яЁёІіЎў]/u.test(token)) {
      return token;
    }
    return token.replace(
      /[ABCEHKMOPTXYaceopxy]/g,
      (char) => MIXED_CYRILLIC_HOMOGLYPHS[char] ?? char,
    );
  });
}

function sanitizeText(value) {
  return typeof value === "string"
    ? normalizeMixedCyrillicHomoglyphs(value.trim())
    : "";
}

function normalizeQualityText(value) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function generateSampleText(length, type = 'normal') {
    let result = '';
    const normalWords = ["Bitcoin", "Биткоин", "AI-agent", "ИИ-агенты", "market", "рынок", "growth", "рост"];
    const mixedWords = ["Bіtcoin", "Биткоiн", "AІ-agent", "ИИ-aгенты", "mаrket", "рyнок", "grоwth", "рoст"];
    
    for (let i = 0; i < length; i++) {
        if (type === 'normal') {
            result += normalWords[Math.floor(Math.random() * normalWords.length)] + " ";
        } else if (type === 'mixed') {
            result += mixedWords[Math.floor(Math.random() * mixedWords.length)] + " ";
        } else if (type === 'pathological') {
            result += "aБ".repeat(50) + " ";
        }
    }
    return result;
}

function runBenchmark(name, fn, text, iterations = 1000) {
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
        fn(text);
    }
    const end = performance.now();
    console.log(`[${name}] Time for ${iterations} iterations: ${(end - start).toFixed(2)} ms. Average: ${((end - start)/iterations).toFixed(4)} ms`);
}

console.log("=== PERFORMANCE OVERHEAD ANALYSIS (July 2026) ===");
const normalText = generateSampleText(100, 'normal');
const mixedText = generateSampleText(100, 'mixed');
const pathologicalText = generateSampleText(100, 'pathological');

console.log(`Text length: ~${normalText.length} chars`);
runBenchmark("sanitizeText - Normal", sanitizeText, normalText);
runBenchmark("sanitizeText - Mixed (Homoglyphs)", sanitizeText, mixedText);
runBenchmark("sanitizeText - Pathological", sanitizeText, pathologicalText);

runBenchmark("normalizeQualityText - Normal", normalizeQualityText, normalText);
runBenchmark("normalizeQualityText - Mixed", normalizeQualityText, mixedText);
runBenchmark("normalizeQualityText - Pathological", normalizeQualityText, pathologicalText);

