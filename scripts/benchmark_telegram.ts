import { buildTelegramPostText } from "../src/lib/telegram";

const mockPost = {
  id: "test-id",
  title: "This is a very long title about a very important topic in the world of technology and AI, let's see how it handles it.",
  category: "tech_world",
  source: "Hacker News",
  source_url: "https://news.ycombinator.com",
  observed: [
    "Fact 1: AI agents are taking over the world.",
    "Fact 2: They are writing benchmarks and optimizing code.",
    "Fact 3: The world is changing rapidly as we approach 2027.",
    "Fact 4: This is another long fact that needs to be tested for performance.",
    "Fact 5: We need at least five facts to make sure string manipulation is heavy enough.",
    "Fact 6: Let's add more text. \n\n With newlines. \n\n And more newlines."
  ],
  opinion: "This is a strong opinion about the future of AI. I think it will be amazing and we should all embrace it. Let's see how long this can get before it causes issues.",
  hypothesis: "If we do X, then Y will happen.",
  cross_signal: "Other sources agree.",
  inferred: "This is inferred text.",
  telegram_text: "Custom telegram text."
};

const ITERATIONS = 100_000;

console.log("Starting benchmark for buildTelegramPostText...");
const start = performance.now();

for (let i = 0; i < ITERATIONS; i++) {
  buildTelegramPostText(mockPost as any, "https://example.com/post/test-id");
}

const end = performance.now();
const duration = end - start;

console.log(`Executed ${ITERATIONS} iterations in ${duration.toFixed(2)} ms.`);
console.log(`Average time per iteration: ${(duration / ITERATIONS).toFixed(5)} ms.`);
