import { buildTelegramPostText } from "./src/lib/telegram";
import type { MiroPost } from "./src/lib/agent";

const mockPost = {
  title: "Test Title for Telegram",
  observed: ["Факт 1", "Факт 2"],
  inferred: "Test inferred",
  hypothesis: "Test hypothesis",
  opinion: "Интересный сигнал для размышления.",
  category: "Technology",
  source: "Reuters",
  source_url: "https://reuters.com/test",
  telegram_text: "Этот текст должен быть в Телеграме. Почему это важно: потому что.",
  cross_signal: null
} as unknown as MiroPost;

const text = buildTelegramPostText(mockPost, "https://ai-blogersite.com/post/123");
console.log("=== TELEGRAM OUTPUT ===");
console.log(text);
console.log("=======================");
