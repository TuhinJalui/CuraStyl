-- ═══════════════════════════════════════════════════════════════════
-- 🔥 FIX PAYMENTS STATUS CHECK CONSTRAINT
-- The status 'created' is not in the allowed values
-- ═══════════════════════════════════════════════════════════════════

-- First, let's see what constraint exists
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.payments'::regclass
  AND conname LIKE '%status%';

-- Drop the old constraint
ALTER TABLE public.payments 
  DROP CONSTRAINT IF EXISTS payments_status_check;

-- Add new constraint with all needed statuses
ALTER TABLE public.payments
  ADD CONSTRAINT payments_status_check 
  CHECK (status IN ('created', 'pending', 'completed', 'failed', 'cancelled', 'refunded'));

-- Verify
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.payments'::regclass
  AND conname LIKE '%status%';

-- ═══════════════════════════════════════════════════════════════════
-- ✅ DONE! Status values are now: created, pending, completed, failed, cancelled, refunded
-- Try the upgrade button again!
-- ═══════════════════════════════════════════════════════════════════
