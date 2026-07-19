import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in environment");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Checking run_history...");
  const { data: runs, error: runErr } = await supabase
    .from("run_history")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  if (runErr) console.error("run_history error:", runErr);
  else console.log(JSON.stringify(runs, null, 2));

  console.log("Checking posts...");
  const { data: posts, error: postErr } = await supabase
    .from("posts")
    .select("id, created_at, title, category, source")
    .order("created_at", { ascending: false })
    .limit(5);

  if (postErr) console.error("posts error:", postErr);
  else console.log(JSON.stringify(posts, null, 2));

  console.log("Checking quality_events...");
  const { data: events, error: evErr } = await supabase
    .from("quality_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  if (evErr) console.error("quality_events error:", evErr);
  else console.log(JSON.stringify(events, null, 2));
}

main().catch(console.error);
