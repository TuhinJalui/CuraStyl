import fs from 'fs';
import path from 'path';

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[key] = value.trim();
  }
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

(async ()=>{
  try {
    const sql = fs.readFileSync(path.join('supabase', 'RECREATE_PAYMENTS_TABLE.sql'), 'utf8');
    
    // We replace rest/v1/ with rest/v1/rpc/ or try to find out where the endpoint is
    console.log("URL:", url);
    const resp = await fetch(`${url.replace(/\/$/, '')}/rest/v1/rpc/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/sql',
        'apikey': key,
        'Authorization': `Bearer ${key}`
      },
      body: sql
    });

    console.log("Migration status:", resp.status);
    console.log("Migration response:", await resp.text());
  } catch (err) {
    console.error('Migration error:', err);
  }
})();
