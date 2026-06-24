-- =====================================================================
-- CURASTYL — RECREATE PAYMENTS TABLE WITH CORRECT SCHEMA
-- Run this script in your Supabase SQL Editor to fix the 500 errors.
-- =====================================================================

-- 1. Drop existing payments table (safe since it is empty)
DROP TABLE IF EXISTS public.payments CASCADE;

-- 2. Create payments table with correct column nullable settings and check constraints
CREATE TABLE public.payments (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id       TEXT        NOT NULL UNIQUE,
  booking_id     UUID        REFERENCES public.bookings(id) ON DELETE SET NULL, -- Nullable to allow plan upgrades!
  payment_id     TEXT,                              -- UTR number after verification
  amount         INTEGER     NOT NULL,              -- in rupees
  currency       TEXT        NOT NULL DEFAULT 'INR',
  status         TEXT        NOT NULL DEFAULT 'created' 
                              CHECK (status IN ('created', 'pending', 'completed', 'failed', 'success', 'refunded')),
  payment_type   TEXT        NOT NULL,              -- booking | plan_upgrade
  payment_method TEXT,                             -- upi | cash_in_hand
  metadata       JSONB       DEFAULT '{}'::jsonb,   -- booking params / plan info
  verified_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Add Indexes
CREATE INDEX IF NOT EXISTS idx_payments_user_id    ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id   ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status     ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_type       ON public.payments(payment_type);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at DESC);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies (allows user access to own records, service role bypasses automatically)
CREATE POLICY "Users can view own payments"
  ON public.payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payments"
  ON public.payments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payments"
  ON public.payments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to payments"
  ON public.payments FOR ALL
  USING (true)
  WITH CHECK (true);

-- 6. Trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_payments_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_payments_timestamp ON public.payments;
CREATE TRIGGER update_payments_timestamp
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_payments_updated_at();

-- Comment for table
COMMENT ON TABLE public.payments IS 'Stores all payment transactions for bookings and plan upgrades';
