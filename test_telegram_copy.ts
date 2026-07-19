import { buildTelegramPostText, buildPublicPostUrl } from "./src/lib/telegram";
import type { MiroPost } from "./src/lib/agent";

const mockPost: any = {
  title: "Test Post for Telegram",
  source: "Reuters",
  source_url: "https://reuters.com/test",
  category: "World",
  category_hint: "news",
  language: "ru",
  timestamp: Date.now(),
  observed: ["Факт 1", "Факт 2"],
  inferred: "Суть происходящего.",
  hypothesis: "Гипотеза.",
  opinion: "Мнение Миро.",
  cross_signal: "Дополнительно.",
  telegram_text: "Этот текст должен быть в Телеграме.",
};

const url = buildPublicPostUrl("http://localhost:3000", "test_id_123");
console.log("Post URL:", url);

const text = buildTelegramPostText(mockPost as any, url);
console.log("--- Telegram Text ---");
console.log(text);
console.log("---------------------");
