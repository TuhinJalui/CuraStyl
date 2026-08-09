-- ═══════════════════════════════════════════════════════════════════
-- 🔥 FIX PAYMENTS TABLE - Make optional columns NULLABLE
-- Several columns should be NULL for plan upgrades or until payment is completed
-- ═══════════════════════════════════════════════════════════════════

-- Make booking_id nullable (NULL for plan upgrades)
DO $$ 
BEGIN
  ALTER TABLE public.payments ALTER COLUMN booking_id DROP NOT NULL;
  RAISE NOTICE '✅ booking_id is now nullable';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '⚠️  booking_id: %', SQLERRM;
END $$;

-- Make payment_method nullable (set after payment is completed)
DO $$ 
BEGIN
  ALTER TABLE public.payments ALTER COLUMN payment_method DROP NOT NULL;
  RAISE NOTICE '✅ payment_method is now nullable';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '⚠️  payment_method: %', SQLERRM;
END $$;

-- Make payment_id nullable (set after payment is completed)
DO $$ 
BEGIN
  ALTER TABLE public.payments ALTER COLUMN payment_id DROP NOT NULL;
  RAISE NOTICE '✅ payment_id is now nullable';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '⚠️  payment_id: %', SQLERRM;
END $$;

-- Add comments to explain
COMMENT ON COLUMN public.payments.booking_id IS 'Booking ID reference. NULL for plan upgrades, required for booking payments';
COMMENT ON COLUMN public.payments.payment_method IS 'Payment method (upi, card, etc). NULL until payment is completed';
COMMENT ON COLUMN public.payments.payment_id IS 'External payment ID from gateway. NULL until payment is completed';

-- Verify the changes
SELECT 
  column_name, 
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'payments' 
  AND column_name IN ('booking_id', 'payment_method', 'payment_id')
ORDER BY ordinal_position;

-- ═══════════════════════════════════════════════════════════════════
-- ✅ DONE! All nullable columns are now optional!
-- Try the upgrade button again - it should work now!
-- ═══════════════════════════════════════════════════════════════════
