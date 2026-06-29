import { createClient } from "@supabase/supabase-js";
import fs from "fs";

// Load env vars from .env.local in the workspace directory
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
  console.log("=== LATEST 10 POSTS ===");
  const { data: posts, error } = await supabase
    .from("posts")
    .select("created_at, title, category, source_url")
    .order("created_at", { ascending: false })
    .limit(10);
    
  if (error) {
    console.error("Error fetching posts:", error);
  } else {
    for (const post of posts ?? []) {
      console.log(`[${post.created_at}] [${post.category}] ${post.title}`);
      console.log(`  URL: ${post.source_url}`);
      console.log("-".repeat(50));
    }
  }
}

main().catch(console.error);
