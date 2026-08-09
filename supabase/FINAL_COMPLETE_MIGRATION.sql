-- ============================================================
-- CuraStyl – FINAL COMPLETE MIGRATION
-- Run this ONCE in Supabase SQL Editor
-- All statements are idempotent (safe to re-run)
-- ============================================================

-- ── 1. bookings: add missing columns ────────────────────────
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS qr_verified      BOOLEAN     DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS qr_scanned_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_id       TEXT,
  ADD COLUMN IF NOT EXISTS reminder_sent    BOOLEAN     DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS noshow_sent      BOOLEAN     DEFAULT FALSE;

-- ── 2. salons: add missing columns ──────────────────────────
ALTER TABLE public.salons
  ADD COLUMN IF NOT EXISTS instagram           TEXT,
  ADD COLUMN IF NOT EXISTS plan_tier           TEXT NOT NULL DEFAULT 'free'
    CHECK (plan_tier IN ('free', 'premium', 'ultra')),
  ADD COLUMN IF NOT EXISTS plan_expires_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS social_links        JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS cancellation_policy TEXT,
  ADD COLUMN IF NOT EXISTS tiktok              TEXT,
  ADD COLUMN IF NOT EXISTS facebook            TEXT,
  ADD COLUMN IF NOT EXISTS booking_note        TEXT,
  ADD COLUMN IF NOT EXISTS min_booking_advance INTEGER DEFAULT 60,  -- minutes
  ADD COLUMN IF NOT EXISTS max_booking_days    INTEGER DEFAULT 30;   -- days ahead

-- ── 3. salon_plans table (plan catalog) ─────────────────────
CREATE TABLE IF NOT EXISTS public.salon_plans (
  id                   TEXT PRIMARY KEY,         -- 'free', 'premium', 'ultra'
  name                 TEXT NOT NULL,
  price                INTEGER NOT NULL,
  services_limit       INTEGER NOT NULL,          -- -1 = unlimited
  staff_limit          INTEGER NOT NULL,          -- -1 = unlimited
  photos_limit         INTEGER NOT NULL,
  analytics_access     TEXT NOT NULL,             -- 'basic', 'advanced', 'full'
  featured_listing     BOOLEAN NOT NULL DEFAULT FALSE,
  ai_recommendations   BOOLEAN NOT NULL DEFAULT FALSE,
  priority_ranking     BOOLEAN NOT NULL DEFAULT FALSE,
  custom_booking_url   BOOLEAN NOT NULL DEFAULT FALSE,
  whatsapp_reminders   BOOLEAN NOT NULL DEFAULT FALSE,
  export_reports       BOOLEAN NOT NULL DEFAULT FALSE,
  support_tier         TEXT NOT NULL,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.salon_plans ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'salon_plans'
      AND policyname = 'Salon plans are public'
  ) THEN
    CREATE POLICY "Salon plans are public" ON public.salon_plans
      FOR SELECT USING (true);
  END IF;
END $$;

-- ── 4. Seed plan catalog ─────────────────────────────────────
INSERT INTO public.salon_plans (
  id, name, price,
  services_limit, staff_limit, photos_limit,
  analytics_access, featured_listing, ai_recommendations,
  priority_ranking, custom_booking_url, whatsapp_reminders,
  export_reports, support_tier
) VALUES
  ('free',    'Free',          0,     5,  3,  3,  'basic',    FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, 'Community'),
  ('premium', 'Premium',       999,  20, 10, 10,  'advanced', TRUE,  FALSE, TRUE,  TRUE,  FALSE, FALSE, 'Email Priority'),
  ('ultra',   'Ultra Premium', 2499, -1, -1, 30,  'full',     TRUE,  TRUE,  TRUE,  TRUE,  TRUE,  TRUE,  'Priority 24/7')
ON CONFLICT (id) DO UPDATE SET
  name               = EXCLUDED.name,
  price              = EXCLUDED.price,
  services_limit     = EXCLUDED.services_limit,
  staff_limit        = EXCLUDED.staff_limit,
  photos_limit       = EXCLUDED.photos_limit,
  analytics_access   = EXCLUDED.analytics_access,
  featured_listing   = EXCLUDED.featured_listing,
  ai_recommendations = EXCLUDED.ai_recommendations,
  priority_ranking   = EXCLUDED.priority_ranking,
  custom_booking_url = EXCLUDED.custom_booking_url,
  whatsapp_reminders = EXCLUDED.whatsapp_reminders,
  export_reports     = EXCLUDED.export_reports,
  support_tier       = EXCLUDED.support_tier;

-- ── 5. RLS policies for notifications ────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notifications'
      AND policyname = 'System can insert notifications'
  ) THEN
    CREATE POLICY "System can insert notifications" ON public.notifications
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notifications'
      AND policyname = 'Users delete own notifications'
  ) THEN
    CREATE POLICY "Users delete own notifications" ON public.notifications
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── 6. RLS: salon owners can UPDATE their salon's bookings ───
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'bookings'
      AND policyname = 'Owners update salon bookings'
  ) THEN
    CREATE POLICY "Owners update salon bookings" ON public.bookings
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.salons
          WHERE salons.id = bookings.salon_id
            AND salons.owner_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ── 7. RLS: salon owners can SELECT their salon's bookings ──
-- (already exists but adding with guard)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'bookings'
      AND policyname = 'Owners see salon bookings'
  ) THEN
    CREATE POLICY "Owners see salon bookings" ON public.bookings
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.salons
          WHERE salons.id = bookings.salon_id
            AND salons.owner_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ── 8. Indexes ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_bookings_reminder
  ON public.bookings (booking_date, time_slot)
  WHERE status = 'confirmed' AND qr_verified = FALSE;

CREATE INDEX IF NOT EXISTS idx_bookings_reminder_sent
  ON public.bookings (booking_date, reminder_sent, noshow_sent)
  WHERE status = 'confirmed';

CREATE INDEX IF NOT EXISTS idx_salons_plan
  ON public.salons (plan_tier);

-- ── 9. Trigger: Auto-notify salon owner on new booking ───────
CREATE OR REPLACE FUNCTION public.notify_salon_owner_on_booking()
RETURNS TRIGGER AS $$
DECLARE
  v_owner_id      UUID;
  v_salon_name    TEXT;
  v_service_name  TEXT;
  v_customer_name TEXT;
  v_customer_phone TEXT;
  v_staff_name    TEXT := 'Any available';
  v_booking_date_fmt TEXT;
  v_payment_label TEXT;
  v_final_amount  INTEGER;
BEGIN
  -- Get owner_id and salon name
  SELECT owner_id, name INTO v_owner_id, v_salon_name
  FROM public.salons WHERE id = NEW.salon_id;

  -- Get service name
  SELECT name INTO v_service_name
  FROM public.services WHERE id = NEW.service_id;

  -- Get customer name + phone
  SELECT full_name, phone INTO v_customer_name, v_customer_phone
  FROM public.profiles WHERE id = NEW.user_id;

  -- Get staff name if any
  IF NEW.staff_id IS NOT NULL THEN
    SELECT name INTO v_staff_name
    FROM public.staff WHERE id = NEW.staff_id;
  END IF;

  v_booking_date_fmt := to_char(NEW.booking_date, 'Dy, DD Mon YYYY');

  v_payment_label := CASE
    WHEN NEW.payment_method = 'cash_in_hand' THEN 'Cash in Hand 💵'
    WHEN NEW.payment_method = 'upi' THEN 'UPI'
    WHEN NEW.payment_method = 'card' THEN 'Card'
    ELSE COALESCE(NEW.payment_method, 'Online')
  END;

  v_final_amount := COALESCE(NEW.final_amount, NEW.total_amount, 0);

  -- Insert notification for salon owner
  IF v_owner_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, link, is_read)
    VALUES (
      v_owner_id,
      'new_booking',
      '📅 New Booking: ' || COALESCE(v_customer_name, 'Customer'),
      COALESCE(v_customer_name, 'Customer') ||
        CASE WHEN v_customer_phone IS NOT NULL THEN ' (' || v_customer_phone || ')' ELSE '' END ||
        ' booked ' || COALESCE(v_service_name, 'a service') ||
        ' on ' || v_booking_date_fmt ||
        ' at ' || NEW.time_slot ||
        ' with ' || v_staff_name ||
        '. Amount: ₹' || v_final_amount ||
        ' via ' || v_payment_label ||
        '. Booking ID: ' || NEW.booking_id,
      '/salon-owner/dashboard',
      FALSE
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_salon_owner ON public.bookings;
CREATE TRIGGER trigger_notify_salon_owner
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_salon_owner_on_booking();

-- ── 10. Staff RLS ────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'staff'
      AND policyname = 'Staff are public'
  ) THEN
    CREATE POLICY "Staff are public" ON public.staff
      FOR SELECT USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'staff'
      AND policyname = 'Salon owners manage staff'
  ) THEN
    CREATE POLICY "Salon owners manage staff" ON public.staff
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.salons
          WHERE salons.id = staff.salon_id
            AND salons.owner_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ── 11. Salons: allow all active salons to be selected ───────
-- Fix: Allow owners to also select their inactive salon
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'salons'
      AND policyname = 'Owners can select own salon'
  ) THEN
    CREATE POLICY "Owners can select own salon" ON public.salons
      FOR SELECT
      USING (auth.uid() = owner_id);
  END IF;
END $$;

-- ── 12. Payments table RLS ───────────────────────────────────
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'payments'
      AND policyname = 'Users see own payments'
  ) THEN
    CREATE POLICY "Users see own payments" ON public.payments
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'payments'
      AND policyname = 'Users insert own payments'
  ) THEN
    CREATE POLICY "Users insert own payments" ON public.payments
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ── Done ─────────────────────────────────────────────────────
SELECT 'FINAL_COMPLETE_MIGRATION executed successfully ✅' AS result;
