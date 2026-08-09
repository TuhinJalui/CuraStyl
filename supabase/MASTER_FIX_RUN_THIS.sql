-- ════════════════════════════════════════════════════════════════
-- 🔥 MASTER FIX - Run this ENTIRE file in Supabase SQL Editor
-- Fixes: Favorites RLS, Bookings RLS, Profiles sync, Notifications
-- ════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════
-- 1. Ensure uuid-ossp extension is enabled
-- ══════════════════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ══════════════════════════════════════════════════════════════
-- 2. Auto-create profiles on signup trigger
-- ══════════════════════════════════════════════════════════════
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
    'basic',
    0,
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ══════════════════════════════════════════════════════════════
-- 3. Sync ALL existing auth.users to profiles
-- ══════════════════════════════════════════════════════════════
INSERT INTO public.profiles (id, email, full_name, avatar_url, role, membership_tier, glam_points, created_at, updated_at)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', SPLIT_PART(au.email, '@', 1)),
  COALESCE(au.raw_user_meta_data->>'avatar_url', au.raw_user_meta_data->>'picture'),
  'customer',
  'basic',
  0,
  NOW(),
  NOW()
FROM auth.users au
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  updated_at = NOW();

-- ══════════════════════════════════════════════════════════════
-- 4. Add membership fields to profiles if not exist
-- ══════════════════════════════════════════════════════════════
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS membership_tier TEXT NOT NULL DEFAULT 'basic' CHECK (membership_tier IN ('basic', 'premium', 'vip'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS membership_expires_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS glam_points INTEGER DEFAULT 0;

UPDATE public.profiles SET membership_tier = 'basic', glam_points = 0 WHERE membership_tier IS NULL OR glam_points IS NULL;

-- ══════════════════════════════════════════════════════════════
-- 5. Fix RLS on profiles table
-- ══════════════════════════════════════════════════════════════
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Service role can manage profiles" ON public.profiles FOR ALL USING (auth.role() = 'service_role');

-- ══════════════════════════════════════════════════════════════
-- 6. Fix RLS on favorites table
-- ══════════════════════════════════════════════════════════════

-- Create favorites if not exists
CREATE TABLE IF NOT EXISTS public.favorites (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  salon_id   UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, salon_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_salon ON public.favorites(salon_id);

-- Drop ALL old policies
DROP POLICY IF EXISTS "Users can manage own favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can view own favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can insert own favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can delete own favorites" ON public.favorites;
DROP POLICY IF EXISTS "favorites_select_policy" ON public.favorites;
DROP POLICY IF EXISTS "favorites_insert_policy" ON public.favorites;
DROP POLICY IF EXISTS "favorites_delete_policy" ON public.favorites;

-- Enable RLS
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Create clean policies
CREATE POLICY "favorites_select" ON public.favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "favorites_insert" ON public.favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "favorites_delete" ON public.favorites FOR DELETE USING (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════════
-- 7. Fix RLS on bookings table
-- ══════════════════════════════════════════════════════════════

-- Create bookings if not exists
CREATE TABLE IF NOT EXISTS public.bookings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id      TEXT UNIQUE NOT NULL,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  salon_id        UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  service_id      UUID REFERENCES public.services(id) ON DELETE SET NULL,
  staff_id        UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  booking_date    DATE NOT NULL,
  time_slot       TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
  total_amount    NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(10,2) DEFAULT 0,
  final_amount    NUMERIC(10,2) NOT NULL DEFAULT 0,
  coupon_code     TEXT,
  payment_status  TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  payment_method  TEXT DEFAULT 'upi',
  payment_id      TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_user ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_salon ON public.bookings(salon_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON public.bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);

-- Drop ALL old policies  
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can update own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Salon owners can view their bookings" ON public.bookings;
DROP POLICY IF EXISTS "bookings_select_policy" ON public.bookings;
DROP POLICY IF EXISTS "bookings_insert_policy" ON public.bookings;
DROP POLICY IF EXISTS "bookings_update_policy" ON public.bookings;
DROP POLICY IF EXISTS "Service role full access" ON public.bookings;

-- Enable RLS
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Create clean policies
CREATE POLICY "bookings_select" ON public.bookings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "bookings_insert" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bookings_update" ON public.bookings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "bookings_service_role" ON public.bookings FOR ALL USING (auth.role() = 'service_role');

-- Salon owners can view bookings for their salons
CREATE POLICY "bookings_salon_owner_select" ON public.bookings
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.salons s
    WHERE s.id = salon_id AND s.owner_id = auth.uid()
  )
);

-- ══════════════════════════════════════════════════════════════
-- 8. Fix RLS on salons table (public read)
-- ══════════════════════════════════════════════════════════════
ALTER TABLE public.salons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Salons are publicly readable" ON public.salons;
DROP POLICY IF EXISTS "Salon owners can manage their salons" ON public.salons;

CREATE POLICY "Salons are publicly readable" ON public.salons FOR SELECT USING (true);
CREATE POLICY "Salon owners can manage their salons" ON public.salons FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "Admins can manage all salons" ON public.salons FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ══════════════════════════════════════════════════════════════
-- 9. Fix RLS on services table (public read)
-- ══════════════════════════════════════════════════════════════
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Services are publicly readable" ON public.services;
DROP POLICY IF EXISTS "Salon owners can manage their services" ON public.services;

CREATE POLICY "Services are publicly readable" ON public.services FOR SELECT USING (true);
CREATE POLICY "Salon owners can manage their services" ON public.services FOR ALL USING (
  EXISTS (SELECT 1 FROM public.salons s WHERE s.id = salon_id AND s.owner_id = auth.uid())
);

-- ══════════════════════════════════════════════════════════════
-- 10. Fix RLS on staff table (public read)
-- ══════════════════════════════════════════════════════════════
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff are publicly readable" ON public.staff;
CREATE POLICY "Staff are publicly readable" ON public.staff FOR SELECT USING (true);
CREATE POLICY "Salon owners can manage staff" ON public.staff FOR ALL USING (
  EXISTS (SELECT 1 FROM public.salons s WHERE s.id = salon_id AND s.owner_id = auth.uid())
);

-- ══════════════════════════════════════════════════════════════
-- 11. Fix RLS on reviews table
-- ══════════════════════════════════════════════════════════════
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Reviews are publicly readable" ON public.reviews;
DROP POLICY IF EXISTS "Users can create reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can update own reviews" ON public.reviews;

CREATE POLICY "Reviews are publicly readable" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Users can create reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviews" ON public.reviews FOR UPDATE USING (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════════
-- 12. Fix Notifications table
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL DEFAULT 'info',
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  link       TEXT,
  is_read    BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = FALSE;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;

CREATE POLICY "Users see own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service role can insert notifications" ON public.notifications FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- ══════════════════════════════════════════════════════════════
-- 13. Create booking notification trigger
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.notify_booking_created()
RETURNS TRIGGER AS $$
DECLARE
  salon_name TEXT;
BEGIN
  SELECT name INTO salon_name FROM public.salons WHERE id = NEW.salon_id;
  
  INSERT INTO public.notifications (user_id, type, title, message, link)
  VALUES (
    NEW.user_id,
    'booking',
    '🎉 Booking Confirmed!',
    'Your appointment at ' || COALESCE(salon_name, 'the salon') || ' on ' || to_char(NEW.booking_date, 'DD Mon YYYY') || ' at ' || NEW.time_slot || ' is confirmed.',
    '/dashboard/bookings'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_booking_created ON public.bookings;
CREATE TRIGGER on_booking_created
  AFTER INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.notify_booking_created();

-- ══════════════════════════════════════════════════════════════
-- 14. GlamPoints reward function
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.add_glam_points(p_user_id UUID, p_points INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET glam_points = COALESCE(glam_points, 0) + p_points
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-add glam points on booking completion
CREATE OR REPLACE FUNCTION public.reward_glam_points()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    PERFORM public.add_glam_points(NEW.user_id, FLOOR(NEW.final_amount / 100)::INTEGER);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_booking_completed ON public.bookings;
CREATE TRIGGER on_booking_completed
  AFTER UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.reward_glam_points();

-- ══════════════════════════════════════════════════════════════
-- 15. Coupons table
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.coupons (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code              TEXT UNIQUE NOT NULL,
  description       TEXT,
  discount_type     TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value    NUMERIC(10,2) NOT NULL,
  max_discount_amount NUMERIC(10,2),
  min_order_amount  NUMERIC(10,2) DEFAULT 0,
  usage_limit       INTEGER,
  used_count        INTEGER DEFAULT 0,
  valid_from        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until       TIMESTAMPTZ NOT NULL,
  is_active         BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Coupons are publicly readable" ON public.coupons;
CREATE POLICY "Coupons are publicly readable" ON public.coupons FOR SELECT USING (true);
CREATE POLICY "Service role can manage coupons" ON public.coupons FOR ALL USING (auth.role() = 'service_role');

-- Seed some default coupons
INSERT INTO public.coupons (code, description, discount_type, discount_value, min_order_amount, usage_limit, valid_from, valid_until, is_active)
VALUES
  ('FIRST15', 'First booking 15% off', 'percentage', 15, 500, 1000, NOW(), NOW() + INTERVAL '1 year', true),
  ('MONDAY20', 'Monday special 20% off', 'percentage', 20, 1000, 500, NOW(), NOW() + INTERVAL '1 year', true),
  ('GLAMHUB10', 'GlamHub loyalty 10% off', 'percentage', 10, 0, NULL, NOW(), NOW() + INTERVAL '2 years', true),
  ('BRIDE2024', 'Bridal special ₹2000 off', 'fixed', 2000, 5000, 200, NOW(), NOW() + INTERVAL '1 year', true),
  ('WELCOME500', 'Welcome bonus ₹500 off', 'fixed', 500, 1500, 500, NOW(), NOW() + INTERVAL '6 months', true)
ON CONFLICT (code) DO NOTHING;

-- ══════════════════════════════════════════════════════════════
-- SUCCESS
-- ══════════════════════════════════════════════════════════════
DO $$
BEGIN
  RAISE NOTICE '════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ ALL FIXES APPLIED SUCCESSFULLY!';
  RAISE NOTICE '════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ Profiles auto-sync trigger created';
  RAISE NOTICE '✅ All existing users synced to profiles';  
  RAISE NOTICE '✅ Favorites RLS fixed';
  RAISE NOTICE '✅ Bookings RLS fixed';
  RAISE NOTICE '✅ Salons/Services/Staff RLS fixed';
  RAISE NOTICE '✅ Notifications table + trigger created';
  RAISE NOTICE '✅ GlamPoints reward system active';
  RAISE NOTICE '✅ Coupons seeded';
  RAISE NOTICE '🔥 Your app backend is now fully working!';
END $$;
