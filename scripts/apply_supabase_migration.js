const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

(async ()=>{
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env');
      process.exit(2);
    }

    const sql = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'ai_tables.sql'), 'utf8');

    const resp = await fetch(`${url.replace(/\/$/, '')}/rest/v1/rpc/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/sql',
        'apikey': key,
        'Authorization': `Bearer ${key}`
      },
      body: sql
    });

    if (!resp.ok) {
      const txt = await resp.text();
      console.error('Migration failed:', resp.status, txt);
      process.exit(3);
    }

    console.log('Migration applied successfully.');
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
})();
