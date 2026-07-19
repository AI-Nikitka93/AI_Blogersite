const fs = require('fs');
const dotenv = require('dotenv');
const parsed = dotenv.parse(fs.readFileSync('.env.local'));

async function deleteTest() {
  const res = await fetch(`${parsed.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/posts?title=eq.Test`, {
    method: 'DELETE',
    headers: {
      'apikey': parsed.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${parsed.SUPABASE_SERVICE_ROLE_KEY}`
    }
  });
  console.log('Deleted:', res.status);
}
deleteTest();
