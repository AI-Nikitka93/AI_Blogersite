import { buildTelegramPostText } from "../src/lib/telegram";
import type { MiroPost } from "../src/lib/agent";

const mockPost: MiroPost = {
  title: "Test Post for Telegram",
  inferred: "This is a detailed analysis of the situation.",
  observed: ["Fact 1", "Fact 2"],
  hypothesis: "This means something important.",
  cross_signal: "Other sources agree.",
  opinion: "This is Miro's take.",
  category: "World",
  source: "Reuters",
  source_url: "https://reuters.com",
  reasoning: "",
  confidence: "high"
};

const postUrl = "https://example.com/post/123";
const result = buildTelegramPostText(mockPost, postUrl);

console.log("=== Telegram Post Output ===");
console.log(result);
console.log("============================");
