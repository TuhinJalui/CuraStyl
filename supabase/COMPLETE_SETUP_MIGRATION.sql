-- =====================================================================
-- CURASTYL — COMPLETE PAYMENT & GLAM POINTS SETUP
-- Run this entire script in your Supabase SQL Editor
-- =====================================================================

-- ─── 1. PAYMENTS TABLE ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.payments (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id      TEXT        NOT NULL UNIQUE,
  payment_id    TEXT,                              -- UTR number after verification
  amount        INTEGER     NOT NULL,              -- in rupees (integer)
  currency      TEXT        NOT NULL DEFAULT 'INR',
  status        TEXT        NOT NULL DEFAULT 'created', -- created | completed | failed
  payment_type  TEXT        NOT NULL,              -- booking | plan_upgrade
  payment_method TEXT,                             -- upi | cash_in_hand
  metadata      JSONB       DEFAULT '{}'::jsonb,   -- booking params / plan info
  verified_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payments_user_id    ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id   ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status     ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_type       ON public.payments(payment_type);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at DESC);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Users can view own payments"   ON public.payments;
DROP POLICY IF EXISTS "Users can insert own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can update own payments" ON public.payments;

-- RLS Policies (service role bypasses these automatically)
CREATE POLICY "Users can view own payments"
  ON public.payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payments"
  ON public.payments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payments"
  ON public.payments FOR UPDATE
  USING (auth.uid() = user_id);

-- Allow service role full access (needed for server-side writes)
CREATE POLICY "Service role full access to payments"
  ON public.payments FOR ALL
  USING (true)
  WITH CHECK (true);

-- Updated_at trigger
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

-- ─── 2. BOOKINGS TABLE — add missing columns ──────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='payment_status') THEN
    ALTER TABLE public.bookings ADD COLUMN payment_status TEXT DEFAULT 'pending';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='payment_id') THEN
    ALTER TABLE public.bookings ADD COLUMN payment_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='payment_method') THEN
    ALTER TABLE public.bookings ADD COLUMN payment_method TEXT DEFAULT 'upi';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='qr_verified') THEN
    ALTER TABLE public.bookings ADD COLUMN qr_verified BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='qr_scanned_at') THEN
    ALTER TABLE public.bookings ADD COLUMN qr_scanned_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='coupon_code') THEN
    ALTER TABLE public.bookings ADD COLUMN coupon_code TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='discount_amount') THEN
    ALTER TABLE public.bookings ADD COLUMN discount_amount INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='final_amount') THEN
    ALTER TABLE public.bookings ADD COLUMN final_amount INTEGER;
  END IF;
END $$;

-- ─── 3. SALONS TABLE — plan columns ───────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='salons' AND column_name='plan_tier') THEN
    ALTER TABLE public.salons ADD COLUMN plan_tier TEXT DEFAULT 'free';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='salons' AND column_name='plan_expires_at') THEN
    ALTER TABLE public.salons ADD COLUMN plan_expires_at TIMESTAMPTZ;
  END IF;
END $$;

-- ─── 4. NOTIFICATIONS TABLE ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       TEXT        NOT NULL,
  title      TEXT        NOT NULL,
  message    TEXT        NOT NULL,
  link       TEXT,
  is_read    BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id    ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read    ON public.notifications(user_id, is_read);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications"   ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Service role all notifications"     ON public.notifications;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role all notifications"
  ON public.notifications FOR ALL USING (true) WITH CHECK (true);

-- ─── 5. GLAM POINTS TABLE ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.glam_points_history (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points         INTEGER     NOT NULL,            -- positive=earned, negative=redeemed
  type           TEXT        NOT NULL,            -- earned | redeemed | bonus | expired
  description    TEXT        NOT NULL,
  booking_id     TEXT,
  balance_after  INTEGER     NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_glam_points_user_id    ON public.glam_points_history(user_id);
CREATE INDEX IF NOT EXISTS idx_glam_points_created_at ON public.glam_points_history(created_at DESC);

ALTER TABLE public.glam_points_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own glam points" ON public.glam_points_history;
CREATE POLICY "Users can view own glam points"
  ON public.glam_points_history FOR SELECT USING (auth.uid() = user_id);

-- Service role access for glam points writes
DROP POLICY IF EXISTS "Service role all glam points" ON public.glam_points_history;
CREATE POLICY "Service role all glam points"
  ON public.glam_points_history FOR ALL USING (true) WITH CHECK (true);

-- ─── 6. PROFILES TABLE — glam_points column ───────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='glam_points') THEN
    ALTER TABLE public.profiles ADD COLUMN glam_points INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='membership_tier') THEN
    ALTER TABLE public.profiles ADD COLUMN membership_tier TEXT DEFAULT 'basic';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='total_spent') THEN
    ALTER TABLE public.profiles ADD COLUMN total_spent INTEGER DEFAULT 0;
  END IF;
END $$;

-- ─── 7. AWARD GLAM POINTS FUNCTION ────────────────────────────────────

CREATE OR REPLACE FUNCTION public.award_glam_points(
  p_user_id    UUID,
  p_points     INTEGER,
  p_type       TEXT DEFAULT 'earned',
  p_description TEXT DEFAULT '',
  p_booking_id  TEXT DEFAULT NULL
)
RETURNS INTEGER  -- returns new balance
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance     INTEGER;
BEGIN
  -- Get current balance (with row lock)
  SELECT COALESCE(glam_points, 0) INTO v_current_balance
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  -- For redemption, check sufficient balance
  IF p_points < 0 AND v_current_balance + p_points < 0 THEN
    RAISE EXCEPTION 'Insufficient GlamPoints balance. Have: %, Need: %', v_current_balance, ABS(p_points);
  END IF;

  v_new_balance := v_current_balance + p_points;

  -- Update profile balance
  UPDATE public.profiles
  SET glam_points = v_new_balance,
      membership_tier = CASE
        WHEN v_new_balance >= 5000 THEN 'vip'
        WHEN v_new_balance >= 1000 THEN 'premium'
        ELSE 'basic'
      END
  WHERE id = p_user_id;

  -- Log the transaction
  INSERT INTO public.glam_points_history
    (user_id, points, type, description, booking_id, balance_after)
  VALUES
    (p_user_id, p_points, p_type, p_description, p_booking_id, v_new_balance);

  RETURN v_new_balance;
END;
$$;

-- ─── 8. INCREMENT TOTAL SPENT FUNCTION ────────────────────────────────

CREATE OR REPLACE FUNCTION public.increment_total_spent(
  p_user_id UUID,
  p_amount  INTEGER
)
RETURNS INTEGER  -- returns new total_spent
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_total INTEGER;
BEGIN
  UPDATE public.profiles
  SET total_spent = COALESCE(total_spent, 0) + p_amount
  WHERE id = p_user_id
  RETURNING total_spent INTO v_new_total;

  RETURN v_new_total;
END;
$$;

-- ─── Done ─────────────────────────────────────────────────────────────
-- Run this script once in Supabase SQL Editor.
-- All tables use "Service role full access" policies so the
-- Next.js server (using SUPABASE_SERVICE_ROLE_KEY) can write freely.
