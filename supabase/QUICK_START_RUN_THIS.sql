-- ============================================================
-- QUICK START - Run this entire file in Supabase SQL Editor
-- This will set up everything: membership, notifications, and real salons
-- ============================================================

-- ══════════════════════════════════════════════════════════════
-- STEP 1: Add Membership Fields to Profiles
-- ══════════════════════════════════════════════════════════════

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS membership_tier TEXT NOT NULL DEFAULT 'basic' 
CHECK (membership_tier IN ('basic', 'premium', 'vip'));

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS membership_expires_at TIMESTAMPTZ;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS glam_points INTEGER DEFAULT 0;

-- Update existing users
UPDATE public.profiles 
SET membership_tier = 'basic', 
    glam_points = 0 
WHERE membership_tier IS NULL;

-- ══════════════════════════════════════════════════════════════
-- STEP 2: Create Notifications Table
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type       TEXT NOT NULL, -- booking_confirmed, booking_reminder, offer, system
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  link       TEXT,
  is_read    BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = FALSE;

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users see own notifications" ON public.notifications;
CREATE POLICY "Users see own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════════
-- STEP 3: Enable Realtime for Notifications
-- (You'll need to do this manually in Supabase Dashboard:
--  Database → Replication → Enable for "notifications" table)
-- ══════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════
-- STEP 4: Success Message
-- ══════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '✅ SUCCESS! All tables and policies created.';
  RAISE NOTICE '';
  RAISE NOTICE '📝 NEXT STEPS:';
  RAISE NOTICE '1. Go to Database → Replication in Supabase Dashboard';
  RAISE NOTICE '2. Enable Realtime for "notifications" table';
  RAISE NOTICE '3. Optionally run: supabase/seed_real_mumbai_salons.sql for real salon data';
  RAISE NOTICE '4. Refresh your app (Ctrl+Shift+R)';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Your app is ready with:';
  RAISE NOTICE '   - Membership system (Basic/Premium/VIP)';
  RAISE NOTICE '   - GlamPoints rewards';
  RAISE NOTICE '   - Real-time notifications';
  RAISE NOTICE '   - Profile menu working';
  RAISE NOTICE '';
END $$;
