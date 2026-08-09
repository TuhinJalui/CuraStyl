const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return {};
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  const out = {};
  for (let l of lines) {
    l = l.trim();
    if (!l || l.startsWith('#')) continue;
    const eq = l.indexOf('=');
    if (eq === -1) continue;
    const k = l.slice(0, eq).trim();
    let v = l.slice(eq + 1).trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    out[k] = v;
  }
  return out;
}

(async ()=>{
  try {
    const env = loadEnv();
    const url = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      process.exit(2);
    }

    const aiMemoryUrl = `${url.replace(/\/$/, '')}/rest/v1/ai_memory?select=*&limit=1`;
    const aiAnalyticsUrl = `${url.replace(/\/$/, '')}/rest/v1/ai_analytics?select=*&limit=1`;

    async function check(u) {
      const res = await fetch(u, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
      if (res.status === 200) {
        const json = await res.json();
        console.log(`${u} -> 200 OK (table exists). Example row count: ${Array.isArray(json) ? json.length : 'unknown'}`);
        return true;
      } else {
        const txt = await res.text();
        console.log(`${u} -> ${res.status} ${res.statusText} \n${txt}`);
        return false;
      }
    }

    const memExists = await check(aiMemoryUrl);
    const analyticsExists = await check(aiAnalyticsUrl);

    if (memExists && analyticsExists) console.log('Both tables exist.');
    else if (memExists) console.log('ai_memory exists; ai_analytics missing.');
    else if (analyticsExists) console.log('ai_analytics exists; ai_memory missing.');
    else console.log('Neither table exists.');
  } catch (err) {
    console.error('Check failed:', err);
    process.exit(1);
  }
})();
