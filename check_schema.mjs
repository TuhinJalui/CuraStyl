import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yqdmszzgvoehwkwiyzui.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxZG1zenpndm9laHdrd2l5enVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2ODQ2ODksImV4cCI6MjA5NzI2MDY4OX0.7VFh-ZNekSUst6qPyKBSe5uXcGJhXJ72d-b7s5G5Lu4'
);

async function check() {
  const { data, error } = await supabase.from('favorites').select('*').limit(1);
  console.log('Favorites Data:', data);
  console.log('Favorites Error:', error);
}

check();
