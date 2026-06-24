import fs from 'fs';

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
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

async function run() {
  console.log("Testing SQL execution via REST/RPC...");
  // Let's try to query public.payments columns or run a simple statement:
  const sql = `ALTER TABLE public.payments ALTER COLUMN booking_id DROP NOT NULL;`;
  
  const resp = await fetch(`${url}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/sql',
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`
    },
    body: sql
  });

  console.log("Response Status:", resp.status);
  console.log("Response Body:", await resp.text());
}

run();
