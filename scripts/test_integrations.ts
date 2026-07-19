import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createMiroChatClient } from '../src/lib/agent/clients';
import { getAdminSupabaseClient } from '../src/lib/supabase';
import { fetchHackerNewsFacts } from '../src/lib/connectors/tech';
import { fetchGdeltFacts } from '../src/lib/connectors/gdelt';
import { fetchSoccer365Facts } from '../src/lib/connectors/sports';
import { fetchRssFacts } from '../src/lib/connectors/rss';

async function main() {
    console.log("Testing Groq API...");
    try {
        const client = createMiroChatClient({ provider: 'groq' });
        const res = await client.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages: [{ role: "user", content: "Say 'Hello, World!' simply." }]
        });
        console.log("Groq Success, Choice:", JSON.stringify(res.choices?.[0]?.message?.content, null, 2));
    } catch (e: any) {
        console.error("Groq Error:", e?.message || e);
    }

    console.log("\nTesting Supabase Connection...");
    try {
        const db = getAdminSupabaseClient();
        const { data, error } = await db.from('posts').select('id, title, created_at').limit(1).order('created_at', { ascending: false });
        if (error) {
            console.error("Supabase Query Error:", error);
        } else {
            console.log("Supabase Success, most recent post:", data?.length ? (data as any[])[0].title : "No posts found");
        }
    } catch (e: any) {
        console.error("Supabase Exception:", e?.message || e);
    }

    console.log("\nTesting RSS Connectors...");
    
    try {
        console.log("Fetching HN...");
        const facts = await fetchHackerNewsFacts();
        console.log("HN Success, facts count:", facts.facts.length);
    } catch (e: any) {
        console.error("HN RSS Error:", e?.message || e);
    }

    try {
        console.log("Fetching GDELT...");
        const facts = await fetchGdeltFacts();
        console.log("GDELT Success, facts count:", facts.facts.length);
    } catch (e: any) {
        console.error("GDELT RSS Error:", e?.message || e);
    }

    try {
        console.log("Fetching Soccer365...");
        const facts = await fetchSoccer365Facts();
        console.log("Soccer365 Success, facts count:", facts.facts.length);
    } catch (e: any) {
        console.error("Soccer365 RSS Error:", e?.message || e);
    }

    try {
        console.log("Fetching TechCrunch RSS...");
        const facts = await fetchRssFacts("https://techcrunch.com/feed/", {
            sourceName: "TechCrunch",
            categoryHint: "Tech",
        });
        console.log("TechCrunch Success, facts count:", facts.facts.length);
    } catch (e: any) {
        console.error("TechCrunch RSS Error:", e?.message || e);
    }
}

main().catch(console.error);
