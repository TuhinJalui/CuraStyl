const fs = require('fs');
const path = require('path');

function loadEnvFiles() {
  const candidates = ['.env.local', '.env'];
  const out = {};
  for (const f of candidates) {
    const envPath = path.join(__dirname, '..', f);
    if (!fs.existsSync(envPath)) continue;
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
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
  }
  return out;
}

(async function main(){
  try {
    const env = loadEnvFiles();
    const url = (env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
    const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      console.error('MISSING_SUPABASE_KEYS');
      process.exit(2);
    }

    let fetchFn = globalThis.fetch;
    if (!fetchFn) {
      try {
        fetchFn = require('node-fetch');
      } catch (e) {
        console.error('NO_FETCH_AVAILABLE');
        process.exit(3);
      }
    }

    console.log('Using Supabase URL:', url);

    // Insert analytics row
    const analyticsRow = { event_type: 'seed_test', metadata: { source: 'seed_script', ts: new Date().toISOString() } };
    let res = await fetchFn(`${url}/rest/v1/ai_analytics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: key,
        Authorization: `Bearer ${key}`,
        Prefer: 'return=representation'
      },
      body: JSON.stringify([analyticsRow])
    });

    console.log('Analytics insert status:', res.status);
    let text = await res.text();
    console.log('Analytics insert body:', text.substring(0, 1000));

    // Query recent analytics
    res = await fetchFn(`${url}/rest/v1/ai_analytics?select=*&order=created_at.desc&limit=5`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    console.log('Analytics query status:', res.status);
    text = await res.text();
    console.log('Analytics query body (truncated):', text.substring(0, 2000));

    // Insert memory row
    const memoryRow = { user_id: null, session_id: `seed_session_${Date.now()}`, memory: { contextSummary: 'seed test' } };
    res = await fetchFn(`${url}/rest/v1/ai_memory`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: key,
        Authorization: `Bearer ${key}`,
        Prefer: 'return=representation'
      },
      body: JSON.stringify([memoryRow])
    });

    console.log('Memory insert status:', res.status);
    text = await res.text();
    console.log('Memory insert body:', text.substring(0, 1000));

    // Query memory
    res = await fetchFn(`${url}/rest/v1/ai_memory?select=*&order=updated_at.desc&limit=5`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    console.log('Memory query status:', res.status);
    text = await res.text();
    console.log('Memory query body (truncated):', text.substring(0, 2000));

    console.log('SEED_DONE');
  } catch (err) {
    console.error('SEED_ERROR', err && (err.stack || err.message || String(err)));
    process.exit(1);
  }
})();
