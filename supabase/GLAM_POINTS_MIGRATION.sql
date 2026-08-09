-- ============================================================
-- CuraStyl – GlamPoints System Migration
-- Run in Supabase SQL Editor (safe to re-run)
-- ============================================================

-- 1. Ensure glam_points column exists on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS glam_points      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS membership_tier  TEXT    NOT NULL DEFAULT 'basic'
    CHECK (membership_tier IN ('basic', 'premium', 'vip')),
  ADD COLUMN IF NOT EXISTS total_spent      INTEGER NOT NULL DEFAULT 0;  -- lifetime spend in paise

-- 2. GlamPoints history table (full audit trail)
CREATE TABLE IF NOT EXISTS public.glam_points_history (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  booking_id    TEXT,                          -- null for redemptions / manual credits
  type          TEXT        NOT NULL,          -- 'earned' | 'redeemed' | 'expired' | 'bonus'
  points        INTEGER     NOT NULL,          -- positive = earned, negative = redeemed
  description   TEXT        NOT NULL,
  balance_after INTEGER     NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. RLS on glam_points_history
ALTER TABLE public.glam_points_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'glam_points_history'
    AND policyname = 'Users see own glam points history') THEN
    CREATE POLICY "Users see own glam points history" ON public.glam_points_history
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'glam_points_history'
    AND policyname = 'System can insert glam points history') THEN
    CREATE POLICY "System can insert glam points history" ON public.glam_points_history
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- 4. Function: Award GlamPoints atomically
-- Ensures glam_points never goes negative and records history entry.
CREATE OR REPLACE FUNCTION public.award_glam_points(
  p_user_id     UUID,
  p_points      INTEGER,  -- positive = earn, negative = spend
  p_type        TEXT,     -- 'earned' | 'redeemed' | 'bonus'
  p_description TEXT,
  p_booking_id  TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  -- Atomically update balance (cannot go below 0)
  UPDATE public.profiles
    SET glam_points = GREATEST(0, glam_points + p_points),
        updated_at  = NOW()
  WHERE id = p_user_id
  RETURNING glam_points INTO v_new_balance;

  -- Insert history record
  INSERT INTO public.glam_points_history (user_id, booking_id, type, points, description, balance_after)
  VALUES (p_user_id, p_booking_id, p_type, p_points, p_description, v_new_balance);

  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql;

-- 5. Membership tier auto-upgrade based on glam_points
-- Trigger runs after every glam_points update on profiles
CREATE OR REPLACE FUNCTION public.auto_upgrade_membership()
RETURNS TRIGGER AS $$
BEGIN
  NEW.membership_tier := CASE
    WHEN NEW.glam_points >= 5000 THEN 'vip'
    WHEN NEW.glam_points >= 1000 THEN 'premium'
    ELSE 'basic'
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_upgrade_membership ON public.profiles;
CREATE TRIGGER trigger_auto_upgrade_membership
  BEFORE UPDATE OF glam_points ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_upgrade_membership();

-- 6. Index for fast point history queries
CREATE INDEX IF NOT EXISTS idx_glam_points_history_user
  ON public.glam_points_history (user_id, created_at DESC);

-- 7. Function: Increment total_spent atomically
-- Updates the lifetime spending tracker for the user
CREATE OR REPLACE FUNCTION public.increment_total_spent(
  p_user_id UUID,
  p_amount  INTEGER  -- amount in rupees
)
RETURNS INTEGER AS $$
DECLARE
  v_new_total INTEGER;
BEGIN
  UPDATE public.profiles
    SET total_spent = total_spent + p_amount,
        updated_at = NOW()
  WHERE id = p_user_id
  RETURNING total_spent INTO v_new_total;
  
  RETURN v_new_total;
END;
$$ LANGUAGE plpgsql;

SELECT 'GLAM_POINTS_MIGRATION executed successfully ✅' AS result;
