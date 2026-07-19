import { buildTelegramPostText, getPublicPostUrlBlockReason } from "./src/lib/telegram";

const runTests = async () => {
  console.log("--- QA Test 1: HTML Injection / Escaping ---");
  const post1 = {
    title: "News <b>bold</b> & <script>",
    observed: ["<fact 1>", "& fact 2"],
    source: "The <Source>",
    category: "News" as const,
    opinion: "Opinion with > and <",
    source_url: "https://example.com/a&b"
  };
  const result1 = buildTelegramPostText(post1 as any, "https://site.com/post/1");
  console.log(result1);

  console.log("\n--- QA Test 2: isRedundant Check (Escaped vs Raw) ---");
  // If source is "S&P 500"
  // facts will be "S&amp;P 500 says hello"
  // sourceName will be "S&amp;P 500"
  // sourceRaw will be "S&P 500"
  const post2 = {
    title: "Market update",
    observed: ["S&P 500 says hello", "Other fact"],
    source: "S&P 500",
    category: "Markets" as const,
  };
  const result2 = buildTelegramPostText(post2 as any, "https://site.com/post/2");
  console.log(result2);

  console.log("\n--- QA Test 3: Length Limits (> 4096 chars) ---");
  const longFact = "A".repeat(4000);
  const post3 = {
    title: "Long update",
    observed: [longFact, "B".repeat(100)],
    source: "Source",
    category: "News" as const,
  };
  const result3 = buildTelegramPostText(post3 as any, "https://site.com/post/3");
  console.log("Length of result 3:", result3.length);
  if (result3.length > 4096) {
    console.log("WARNING: Message length exceeds Telegram's 4096 limit!");
  }

  console.log("\n--- QA Test 4: Missing Fields ---");
  const post4 = {
    title: "Missing fields",
    observed: [],
    source: "",
    category: "News" as const,
  };
  const result4 = buildTelegramPostText(post4 as any, "https://site.com/post/4");
  console.log(result4);
};

runTests().catch(console.error);
