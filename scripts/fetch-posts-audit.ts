import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Load env vars from .env.local
const envContent = fs.readFileSync(".env.local", "utf8");
const envVars: Record<string, string> = {};
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
}

const supabaseUrl = envVars["NEXT_PUBLIC_SUPABASE_URL"];
const supabaseKey = envVars["SUPABASE_SERVICE_ROLE_KEY"];

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase URL or Key not found in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Fetching latest 30 posts from Supabase...");
  
  const { data: posts, error } = await supabase
    .from("posts")
    .select("created_at, category, title, source, source_url, observed, inferred, opinion, cross_signal, hypothesis, confidence")
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    console.error("Error fetching posts:", error);
    process.exit(1);
  }

  if (!posts || posts.length === 0) {
    console.log("No posts found in the database.");
    process.exit(0);
  }

  console.log(`Fetched ${posts.length} posts. Formatting to Markdown...`);

  let markdownContent = "";

  for (const post of posts) {
    // Format creation date
    const createdAt = post.created_at || "Не указана";

    // Format source and source_url
    let sourceStr = "Не указан";
    if (post.source && post.source_url) {
      sourceStr = `[${post.source}](${post.source_url})`;
    } else if (post.source) {
      sourceStr = post.source;
    } else if (post.source_url) {
      sourceStr = `[Ссылка](${post.source_url})`;
    }

    // Format observed facts
    let observedStr = "";
    if (Array.isArray(post.observed)) {
      observedStr = post.observed.map((fact: any) => `- ${fact}`).join("\n");
    } else {
      observedStr = "- Нет наблюдаемых фактов";
    }

    const category = post.category || "Без категории";
    const title = post.title || "Без заголовка";
    const confidence = post.confidence || "medium";
    const inferred = post.inferred || "";
    const opinion = post.opinion || "";
    const crossSignal = post.cross_signal || "";
    const hypothesis = post.hypothesis || "";

    markdownContent += `## [${category}] ${title}
- **Дата создания:** ${createdAt}
- **Источник:** ${sourceStr}
- **Уверенность (Confidence):** ${confidence}

### Наблюдаемые факты (Observed)
${observedStr}

### Выводы (Inferred)
${inferred}

### Мнение Miro (Opinion)
${opinion}

### Перекрестные сигналы (Cross Signal)
${crossSignal}

### Гипотеза (Hypothesis)
${hypothesis}

---\n\n`;
  }

  // Ensure scratch directory exists
  const scratchDir = path.join(process.cwd(), "scratch");
  if (!fs.existsSync(scratchDir)) {
    fs.mkdirSync(scratchDir, { recursive: true });
  }

  const outputPath = path.join(scratchDir, "posts_for_audit.md");
  fs.writeFileSync(outputPath, markdownContent.trim() + "\n", "utf8");
  console.log(`Successfully wrote posts to ${outputPath}`);
}

main().catch((err) => {
  console.error("Unhandled error in main:", err);
  process.exit(1);
});
