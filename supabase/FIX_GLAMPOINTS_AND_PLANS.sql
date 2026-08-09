-- ════════════════════════════════════════════════════════════════
-- 🔥 FIX GLAMPOINTS REDEMPTION, COUPONS & PLAN UPGRADES
-- Run this ENTIRE file in Supabase SQL Editor
-- ════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════
-- 1. Fix Coupons Table - Add created_by column for user redemptions
-- ══════════════════════════════════════════════════════════════
ALTER TABLE public.coupons 
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add index for faster lookup of user's coupons
CREATE INDEX IF NOT EXISTS idx_coupons_created_by ON public.coupons(created_by);

-- Update RLS for coupons
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Coupons are publicly readable" ON public.coupons;
DROP POLICY IF EXISTS "Users can view own coupons" ON public.coupons;
DROP POLICY IF EXISTS "Service role can manage coupons" ON public.coupons;

-- New policies
CREATE POLICY "Anyone can view active coupons" ON public.coupons 
  FOR SELECT USING (is_active = true);

CREATE POLICY "Users can view their redeemed coupons" ON public.coupons 
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Service role can manage coupons" ON public.coupons 
  FOR ALL USING (auth.role() = 'service_role');

-- ══════════════════════════════════════════════════════════════
-- 2. Ensure profiles have correct default membership_tier
-- ══════════════════════════════════════════════════════════════

-- Fix existing profiles that might have wrong default tier
UPDATE public.profiles 
SET membership_tier = 'basic' 
WHERE membership_tier IS NULL OR membership_tier = 'premium' AND membership_expires_at IS NULL;

-- Update the trigger to set basic by default
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, role, membership_tier, glam_points, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
    'customer',
    'basic',  -- Always start with basic
    100,      -- Signup bonus: 100 GlamPoints
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ══════════════════════════════════════════════════════════════
-- 3. Add plan_tier and plan_expires_at to salons table
-- ══════════════════════════════════════════════════════════════
ALTER TABLE public.salons 
  ADD COLUMN IF NOT EXISTS plan_tier TEXT NOT NULL DEFAULT 'free' 
    CHECK (plan_tier IN ('free', 'premium', 'ultra'));
  
ALTER TABLE public.salons 
  ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ;

-- Add index
CREATE INDEX IF NOT EXISTS idx_salons_plan_tier ON public.salons(plan_tier);

-- ══════════════════════════════════════════════════════════════
-- 4. Ensure GlamPoints system is fully set up
-- ══════════════════════════════════════════════════════════════

-- Ensure glam_points_history table exists
CREATE TABLE IF NOT EXISTS public.glam_points_history (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id    TEXT,
  type          TEXT        NOT NULL,
  points        INTEGER     NOT NULL,
  description   TEXT        NOT NULL,
  balance_after INTEGER     NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_glam_points_history_user 
  ON public.glam_points_history (user_id, created_at DESC);

-- RLS for glam_points_history
ALTER TABLE public.glam_points_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own glam points history" ON public.glam_points_history;
DROP POLICY IF EXISTS "System can insert glam points history" ON public.glam_points_history;

CREATE POLICY "Users see own glam points history" ON public.glam_points_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage glam points history" ON public.glam_points_history
  FOR ALL USING (auth.role() = 'service_role');

-- ══════════════════════════════════════════════════════════════
-- 5. Award GlamPoints Function (recreate to ensure it exists)
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.award_glam_points(
  p_user_id     UUID,
  p_points      INTEGER,
  p_type        TEXT,
  p_description TEXT,
  p_booking_id  TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  -- Atomically update balance
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

-- ══════════════════════════════════════════════════════════════
-- 6. Increment Total Spent Function
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.increment_total_spent(
  p_user_id UUID,
  p_amount  INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  v_new_total INTEGER;
BEGIN
  -- Ensure total_spent column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'total_spent'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN total_spent INTEGER DEFAULT 0;
  END IF;

  UPDATE public.profiles
    SET total_spent = COALESCE(total_spent, 0) + p_amount,
        updated_at = NOW()
  WHERE id = p_user_id
  RETURNING COALESCE(total_spent, 0) INTO v_new_total;
  
  RETURN v_new_total;
END;
$$ LANGUAGE plpgsql;

-- ══════════════════════════════════════════════════════════════
-- 7. Ensure total_spent column exists on profiles
-- ══════════════════════════════════════════════════════════════
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS total_spent INTEGER NOT NULL DEFAULT 0;

-- ══════════════════════════════════════════════════════════════
-- 8. Ensure is_salon_owner column exists for role checking
-- ══════════════════════════════════════════════════════════════
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS is_salon_owner BOOLEAN DEFAULT FALSE;

-- Update existing salon owners
UPDATE public.profiles 
SET is_salon_owner = TRUE 
WHERE id IN (SELECT DISTINCT owner_id FROM public.salons);

-- ══════════════════════════════════════════════════════════════
-- 9. Give all existing users 100 signup bonus if they have 0 points
-- ══════════════════════════════════════════════════════════════
UPDATE public.profiles 
SET glam_points = 100 
WHERE glam_points = 0 OR glam_points IS NULL;

-- ══════════════════════════════════════════════════════════════
-- 10. Grant necessary permissions
-- ══════════════════════════════════════════════════════════════
GRANT ALL ON public.coupons TO authenticated;
GRANT ALL ON public.glam_points_history TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.salons TO authenticated;

GRANT EXECUTE ON FUNCTION public.award_glam_points TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_total_spent TO authenticated;

-- ══════════════════════════════════════════════════════════════
-- 11. Create a view for user dashboard stats (optional)
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW public.user_dashboard_stats AS
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.membership_tier,
  p.glam_points,
  p.total_spent,
  COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'completed') as completed_bookings,
  COUNT(DISTINCT f.id) as favorite_salons,
  COUNT(DISTINCT r.id) as reviews_written
FROM public.profiles p
LEFT JOIN public.bookings b ON p.id = b.user_id
LEFT JOIN public.favorites f ON p.id = f.user_id
LEFT JOIN public.reviews r ON p.id = r.user_id
GROUP BY p.id, p.email, p.full_name, p.membership_tier, p.glam_points, p.total_spent;

GRANT SELECT ON public.user_dashboard_stats TO authenticated;

-- ══════════════════════════════════════════════════════════════
-- ✅ VERIFICATION QUERIES
-- ══════════════════════════════════════════════════════════════
DO $$
BEGIN
  -- Check coupons table
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'coupons' AND column_name = 'created_by'
  ) THEN
    RAISE NOTICE '✅ Coupons table has created_by column';
  ELSE
    RAISE EXCEPTION '❌ Coupons table missing created_by column';
  END IF;

  -- Check profiles membership_tier default
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
      AND column_name = 'membership_tier' 
      AND column_default LIKE '%basic%'
  ) THEN
    RAISE NOTICE '✅ Profiles default membership_tier is basic';
  END IF;

  -- Check salons plan_tier column
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'salons' AND column_name = 'plan_tier'
  ) THEN
    RAISE NOTICE '✅ Salons table has plan_tier column';
  ELSE
    RAISE EXCEPTION '❌ Salons table missing plan_tier column';
  END IF;

  -- Check glam_points_history table
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'glam_points_history'
  ) THEN
    RAISE NOTICE '✅ glam_points_history table exists';
  ELSE
    RAISE EXCEPTION '❌ glam_points_history table missing';
  END IF;

  -- Check award_glam_points function
  IF EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'award_glam_points'
  ) THEN
    RAISE NOTICE '✅ award_glam_points function exists';
  ELSE
    RAISE EXCEPTION '❌ award_glam_points function missing';
  END IF;

  RAISE NOTICE '════════════════════════════════════════════';
  RAISE NOTICE '✅ ALL FIXES APPLIED SUCCESSFULLY!';
  RAISE NOTICE '════════════════════════════════════════════';
  RAISE NOTICE 'You can now:';
  RAISE NOTICE '1. Redeem GlamPoints for coupons';
  RAISE NOTICE '2. Upgrade customer plans (Basic → Premium → VIP)';
  RAISE NOTICE '3. Upgrade salon plans (Free → Premium → Ultra)';
  RAISE NOTICE '4. Apply redeemed coupons at checkout';
  RAISE NOTICE '════════════════════════════════════════════';
END $$;
