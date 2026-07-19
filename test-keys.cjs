const fs = require('fs');
const dotenv = require('dotenv');
const parsed = dotenv.parse(fs.readFileSync('.env.local'));

async function testGroq() {
  const res = await fetch('https://api.groq.com/openai/v1/models', {
    headers: {
      'Authorization': `Bearer ${parsed.GROQ_API_KEY}`
    }
  });
  console.log('Groq status:', res.status);
  const data = await res.json();
  if (data.error) console.log('Groq error:', data.error);
}

async function testOpenRouter() {
  const res = await fetch('https://openrouter.ai/api/v1/models', {
    headers: {
      'Authorization': `Bearer ${parsed.OPENROUTER_API_KEY}`
    }
  });
  console.log('OpenRouter status:', res.status);
}

async function testSupabase() {
  const res = await fetch(`${parsed.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/posts?select=id&limit=1`, {
    headers: {
      'apikey': parsed.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${parsed.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
    }
  });
  console.log('Supabase anon status:', res.status);
  
  const res2 = await fetch(`${parsed.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/posts`, {
    method: 'POST',
    headers: {
      'apikey': parsed.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${parsed.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: "Test",
      source: "Test",
      observed: [],
      inferred: "Test",
      opinion: "Test",
      cross_signal: "Test",
      hypothesis: "Test",
      reasoning: "Test",
      category: "World"
    })
  });
  console.log('Supabase service role insert status:', res2.status);
  if (res2.status !== 201) {
      console.log('Supabase error:', await res2.text());
  }
}

async function run() {
  await testGroq();
  await testOpenRouter();
  await testSupabase();
}
run();
