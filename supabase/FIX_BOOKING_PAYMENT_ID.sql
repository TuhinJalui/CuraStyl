-- ============================================================
-- FIX BOOKING SCHEMA: ADD payment_id AND RELOAD SCHEMA CACHE
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================

-- 1. Add payment_id column if it does not exist
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_id TEXT;

-- 2. Dynamically find and drop any old check constraints on payment_status
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT tc.constraint_name 
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_name = 'bookings' 
          AND ccu.column_name = 'payment_status'
          AND tc.constraint_type = 'CHECK'
    LOOP
        EXECUTE 'ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
    END LOOP;
END $$;

-- 3. Add the updated check constraint supporting 'failed' and 'refunded'
ALTER TABLE public.bookings ADD CONSTRAINT bookings_payment_status_check 
  CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));

-- 4. Reload the PostgREST schema cache so the API recognizes the new column
NOTIFY pgrst, 'reload schema';
