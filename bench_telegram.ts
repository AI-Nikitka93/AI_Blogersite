import { buildTelegramPostText, buildPublicPostUrl } from "./src/lib/telegram";

const mockPost = {
  id: "test-post-1",
  title: "Test Post for Benchmarking",
  category: "Markets" as const,
  category_hint: "Markets",
  source: "Financial Times",
  source_url: "https://ft.com",
  observed: [
    "Первый факт наблюдается здесь.",
    "Второй факт тут."
  ],
  inferred: "Тут идет анализ и выводы. Разные предложения. Еще одно.",
  hypothesis: "Возможно рынок пойдет вверх.",
  opinion: "Интересный сигнал для размышления.",
  telegram_text: "Рынки снова удивляют. Вот что происходит с рублем и долларом.",
  cross_signal: null,
  topic: "Currency",
  reasoning: "",
  confidence: "high"
};

const start = performance.now();
const iterations = 10000;
for (let i = 0; i < iterations; i++) {
  const postUrl = buildPublicPostUrl("http://localhost:3000", "test-post-1");
  buildTelegramPostText(mockPost, postUrl);
}
const end = performance.now();

console.log(`Executed ${iterations} iterations of buildTelegramPostText in ${(end - start).toFixed(2)} ms`);
console.log(`Average time per post generation: ${((end - start) / iterations).toFixed(4)} ms`);
