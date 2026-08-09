-- ============================================================
-- Mumbai GlamHub – Advanced Features Migration
-- Run this after schema.sql
-- ============================================================

-- ── Notifications ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,  -- 'booking_confirmed', 'booking_cancelled', 'review_reply', 'promotion', 'points_earned'
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  link       TEXT,
  is_read    BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = FALSE;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service can create notifications" ON public.notifications FOR INSERT WITH CHECK (true);

-- ── GlamPoints Ledger ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.glam_points (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  booking_id  UUID REFERENCES public.bookings(id),
  points      INTEGER NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('earned', 'redeemed', 'bonus', 'expired')),
  description TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_glam_points_user ON public.glam_points(user_id);

ALTER TABLE public.glam_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own points" ON public.glam_points FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service can manage points" ON public.glam_points FOR ALL WITH CHECK (true);

-- ── Payments table RLS (was missing) ─────────────────────────
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own payments" ON public.payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service can create payments" ON public.payments FOR INSERT WITH CHECK (true);

-- ── Coupons RLS ──────────────────────────────────────────────
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coupons are public" ON public.coupons FOR SELECT USING (is_active = true);
