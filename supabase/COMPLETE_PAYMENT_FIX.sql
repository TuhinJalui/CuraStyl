-- ═══════════════════════════════════════════════════════════════════
-- 🚀 COMPLETE PAYMENT FIX - RUN THIS IN SUPABASE SQL EDITOR
-- This fixes ALL payment-related database issues in one go
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- STEP 1: Make optional columns NULLABLE in payments table
-- ─────────────────────────────────────────────────────────────────────

-- Make booking_id nullable (NULL for plan upgrades)
DO $$ 
BEGIN
  ALTER TABLE public.payments ALTER COLUMN booking_id DROP NOT NULL;
  RAISE NOTICE '✅ booking_id is now nullable';
EXCEPTION 
  WHEN undefined_column THEN
    RAISE NOTICE '⚠️  booking_id column does not exist yet';
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️  booking_id: %', SQLERRM;
END $$;

-- Make payment_method nullable (set after payment is completed)
DO $$ 
BEGIN
  ALTER TABLE public.payments ALTER COLUMN payment_method DROP NOT NULL;
  RAISE NOTICE '✅ payment_method is now nullable';
EXCEPTION 
  WHEN undefined_column THEN
    RAISE NOTICE '⚠️  payment_method column does not exist yet';
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️  payment_method: %', SQLERRM;
END $$;

-- Make payment_id nullable (set after payment is completed)
DO $$ 
BEGIN
  ALTER TABLE public.payments ALTER COLUMN payment_id DROP NOT NULL;
  RAISE NOTICE '✅ payment_id is now nullable';
EXCEPTION 
  WHEN undefined_column THEN
    RAISE NOTICE '⚠️  payment_id column does not exist yet';
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️  payment_id: %', SQLERRM;
END $$;

-- ─────────────────────────────────────────────────────────────────────
-- STEP 2: Fix status constraint to include 'created'
-- ─────────────────────────────────────────────────────────────────────

-- Drop the old constraint if it exists
DO $$ 
BEGIN
  ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;
  RAISE NOTICE '✅ Dropped old status constraint';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '⚠️  Drop constraint: %', SQLERRM;
END $$;

-- Add new constraint with all needed statuses
DO $$ 
BEGIN
  ALTER TABLE public.payments
    ADD CONSTRAINT payments_status_check 
    CHECK (status IN ('created', 'pending', 'completed', 'failed', 'cancelled', 'refunded'));
  RAISE NOTICE '✅ Added new status constraint with all statuses';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '⚠️  Add constraint: %', SQLERRM;
END $$;

-- ─────────────────────────────────────────────────────────────────────
-- STEP 3: Add columns to bookings table if missing
-- ─────────────────────────────────────────────────────────────────────

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'bookings' AND column_name = 'payment_status') THEN
    ALTER TABLE public.bookings ADD COLUMN payment_status TEXT DEFAULT 'pending';
    RAISE NOTICE '✅ Added payment_status column to bookings';
  ELSE
    RAISE NOTICE '⚠️  payment_status already exists in bookings';
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'bookings' AND column_name = 'payment_id') THEN
    ALTER TABLE public.bookings ADD COLUMN payment_id TEXT;
    RAISE NOTICE '✅ Added payment_id column to bookings';
  ELSE
    RAISE NOTICE '⚠️  payment_id already exists in bookings';
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────
-- STEP 4: Add plan columns to salons table if missing
-- ─────────────────────────────────────────────────────────────────────

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'salons' AND column_name = 'plan_tier') THEN
    ALTER TABLE public.salons ADD COLUMN plan_tier TEXT DEFAULT 'free';
    RAISE NOTICE '✅ Added plan_tier column to salons';
  ELSE
    RAISE NOTICE '⚠️  plan_tier already exists in salons';
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'salons' AND column_name = 'plan_expires_at') THEN
    ALTER TABLE public.salons ADD COLUMN plan_expires_at TIMESTAMPTZ;
    RAISE NOTICE '✅ Added plan_expires_at column to salons';
  ELSE
    RAISE NOTICE '⚠️  plan_expires_at already exists in salons';
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────
-- STEP 5: Fix membership_tier default value to 'basic'
-- ─────────────────────────────────────────────────────────────────────

DO $$ 
BEGIN
  ALTER TABLE public.profiles ALTER COLUMN membership_tier SET DEFAULT 'basic';
  RAISE NOTICE '✅ Set membership_tier default to "basic"';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '⚠️  membership_tier: %', SQLERRM;
END $$;

-- ─────────────────────────────────────────────────────────────────────
-- STEP 6: Verify all changes
-- ─────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_payments_exists BOOLEAN;
  v_booking_id_nullable TEXT;
  v_payment_method_nullable TEXT;
  v_payment_id_nullable TEXT;
  v_status_constraint TEXT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '📊 VERIFICATION REPORT';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  
  -- Check if payments table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'payments'
  ) INTO v_payments_exists;
  
  IF v_payments_exists THEN
    RAISE NOTICE '✅ payments table exists';
    
    -- Check nullable columns
    SELECT is_nullable INTO v_booking_id_nullable
    FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'booking_id';
    
    SELECT is_nullable INTO v_payment_method_nullable
    FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'payment_method';
    
    SELECT is_nullable INTO v_payment_id_nullable
    FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'payment_id';
    
    RAISE NOTICE '   - booking_id nullable: %', COALESCE(v_booking_id_nullable, 'column not found');
    RAISE NOTICE '   - payment_method nullable: %', COALESCE(v_payment_method_nullable, 'column not found');
    RAISE NOTICE '   - payment_id nullable: %', COALESCE(v_payment_id_nullable, 'column not found');
    
    -- Check status constraint
    SELECT pg_get_constraintdef(oid) INTO v_status_constraint
    FROM pg_constraint
    WHERE conrelid = 'public.payments'::regclass
      AND conname = 'payments_status_check';
    
    IF v_status_constraint IS NOT NULL THEN
      RAISE NOTICE '   - status constraint: %', v_status_constraint;
      IF v_status_constraint LIKE '%created%' THEN
        RAISE NOTICE '   ✅ "created" status is allowed';
      ELSE
        RAISE NOTICE '   ❌ "created" status is NOT in constraint!';
      END IF;
    ELSE
      RAISE NOTICE '   ⚠️  No status constraint found';
    END IF;
    
  ELSE
    RAISE NOTICE '❌ payments table does NOT exist!';
    RAISE NOTICE '   → You need to run PAYMENTS_MIGRATION.sql first!';
  END IF;
  
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- 🎉 ALL DONE!
-- ═══════════════════════════════════════════════════════════════════
-- 
-- ✅ booking_id, payment_method, payment_id are now nullable
-- ✅ status constraint includes 'created'
-- ✅ bookings table has payment columns
-- ✅ salons table has plan columns
-- ✅ membership_tier defaults to 'basic'
--
-- Now test your upgrade button!
-- ═══════════════════════════════════════════════════════════════════
