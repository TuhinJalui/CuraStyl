-- ============================================================
-- CuraStyl – Complete Salon Owner System SQL Migration
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add new columns to public.salons
ALTER TABLE public.salons
  ADD COLUMN IF NOT EXISTS instagram            TEXT,
  ADD COLUMN IF NOT EXISTS plan_tier            TEXT NOT NULL DEFAULT 'free' CHECK (plan_tier IN ('free', 'premium', 'ultra')),
  ADD COLUMN IF NOT EXISTS plan_expires_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS social_links         JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS cancellation_policy  TEXT;

-- 2. Create public.salon_plans table
CREATE TABLE IF NOT EXISTS public.salon_plans (
  id                 TEXT PRIMARY KEY, -- 'free', 'premium', 'ultra'
  name               TEXT NOT NULL,
  price              INTEGER NOT NULL,
  services_limit     INTEGER NOT NULL, -- -1 for unlimited
  staff_limit        INTEGER NOT NULL,  -- -1 for unlimited
  photos_limit       INTEGER NOT NULL,
  analytics_access   TEXT NOT NULL,    -- 'basic', 'advanced', 'full'
  featured_listing   BOOLEAN NOT NULL DEFAULT FALSE,
  ai_recommendations BOOLEAN NOT NULL DEFAULT FALSE,
  support_tier       TEXT NOT NULL,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on salon_plans
ALTER TABLE public.salon_plans ENABLE ROW LEVEL SECURITY;

-- Allow public read access to plans
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'salon_plans' AND policyname = 'Salon plans are public'
  ) THEN
    CREATE POLICY "Salon plans are public" ON public.salon_plans
      FOR SELECT USING (true);
  END IF;
END $$;

-- 3. Seed data into salon_plans
INSERT INTO public.salon_plans (id, name, price, services_limit, staff_limit, photos_limit, analytics_access, featured_listing, ai_recommendations, support_tier)
VALUES
  ('free', 'Free', 0, 5, 3, 3, 'basic', FALSE, FALSE, 'Community'),
  ('premium', 'Premium', 999, 20, 10, 10, 'advanced', TRUE, FALSE, 'Email'),
  ('ultra', 'Ultra Premium', 2499, -1, -1, 30, 'full', TRUE, TRUE, 'Priority 24/7')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  services_limit = EXCLUDED.services_limit,
  staff_limit = EXCLUDED.staff_limit,
  photos_limit = EXCLUDED.photos_limit,
  analytics_access = EXCLUDED.analytics_access,
  featured_listing = EXCLUDED.featured_listing,
  ai_recommendations = EXCLUDED.ai_recommendations,
  support_tier = EXCLUDED.support_tier;

-- 4. Check policy on notifications table (fix for INSERT policy)
--    If ADD_QR_AND_NOTIFICATIONS.sql was run, "System can insert notifications" exists.
--    We also want to ensure that salon owners/system can insert notifications.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'notifications' AND policyname = 'System can insert notifications'
  ) THEN
    CREATE POLICY "System can insert notifications" ON public.notifications
      FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

-- 5. Trigger for owner notification on new bookings (optional but useful fail-safe/automation,
--    even though API handles it, trigger guarantees coverage)
CREATE OR REPLACE FUNCTION public.notify_salon_owner_on_booking()
RETURNS TRIGGER AS $$
DECLARE
  v_owner_id      UUID;
  v_salon_name    TEXT;
  v_service_name  TEXT;
  v_customer_name TEXT;
  v_staff_name    TEXT := 'Any available';
  v_booking_date_fmt TEXT;
  v_payment_label TEXT;
BEGIN
  -- Get owner_id and salon name
  SELECT owner_id, name INTO v_owner_id, v_salon_name
  FROM public.salons
  WHERE id = NEW.salon_id;

  -- Get service name
  SELECT name INTO v_service_name
  FROM public.services
  WHERE id = NEW.service_id;

  -- Get customer name
  SELECT full_name INTO v_customer_name
  FROM public.profiles
  WHERE id = NEW.user_id;

  -- Get staff name if any
  IF NEW.staff_id IS NOT NULL THEN
    SELECT name INTO v_staff_name
    FROM public.staff
    WHERE id = NEW.staff_id;
  END IF;

  v_booking_date_fmt := to_char(NEW.booking_date, 'Day, DD Month');
  v_payment_label := COALESCE(NEW.payment_method, 'Online');

  -- Insert notification for salon owner
  IF v_owner_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, link, is_read)
    VALUES (
      v_owner_id,
      'new_booking',
      '📅 New Booking: ' || COALESCE(v_customer_name, 'Customer'),
      COALESCE(v_customer_name, 'Customer') || ' booked ' || v_service_name || ' on ' || v_booking_date_fmt || ' at ' || NEW.time_slot || ' with ' || v_staff_name || '. Amount: ₹' || NEW.final_amount || ' (' || v_payment_label || '). ID: ' || NEW.booking_id,
      '/salon-owner/dashboard',
      FALSE
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create/Replace Trigger
DROP TRIGGER IF EXISTS trigger_notify_salon_owner ON public.bookings;
CREATE TRIGGER trigger_notify_salon_owner
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_salon_owner_on_booking();

SELECT 'Migration COMPLETE_SALON_OWNER_SYSTEM executed successfully' AS result;
