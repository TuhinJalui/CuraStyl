import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yqdmszzgvoehwkwiyzui.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxZG1zenpndm9laHdrd2l5enVpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTY4NDY4OSwiZXhwIjoyMDk3MjYwNjg5fQ.3Jueq-uG1dHZ2WmVOU1it_rYJzI_V2LRjgmKl_TFgaE';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
  console.log("Checking payments table...");
  const { data, error } = await supabase.from('payments').select('*').limit(1);
  console.log('Payments Data:', data);
  console.log('Payments Error:', error);

  console.log("\nChecking profiles table columns...");
  const { data: profileData, error: profileError } = await supabase.from('profiles').select('*').limit(1);
  console.log('Profile keys:', profileData ? Object.keys(profileData[0] || {}) : null);
  console.log('Profile Error:', profileError);

  console.log("\nChecking salons table columns...");
  const { data: salonData, error: salonError } = await supabase.from('salons').select('*').limit(1);
  console.log('Salon keys:', salonData ? Object.keys(salonData[0] || {}) : null);
  console.log('Salon Error:', salonError);

  console.log("\nChecking bookings table columns...");
  const { data: bookingData, error: bookingError } = await supabase.from('bookings').select('*').limit(1);
  console.log('Booking keys:', bookingData ? Object.keys(bookingData[0] || {}) : null);
  console.log('Booking Error:', bookingError);
}

check();
