import { buildTelegramPostText } from './src/lib/telegram';

const maliciousPost = {
  title: "Hack </b> <script>alert(1)</script>",
  observed: ["Fact 1 <img src=x onerror=alert(1)>", "Fact 2 &lt;b&gt;bold&lt;/b&gt;"],
  opinion: "Opinion with < and > and &",
  telegram_text: "Telegram text with <a href='javascript:alert(1)'>Link</a>",
  source: "Hacker News <b>bold</b>",
  source_url: "javascript:alert(1)",
  category: "Tech",
  hypothesis: "",
  inferred: "",
  cross_signal: ""
};

console.log("=== TELEGRAM INJECTION TEST ===");
const output = buildTelegramPostText(maliciousPost as any, "https://example.com/post");
console.log(output);
console.log("===============================");
