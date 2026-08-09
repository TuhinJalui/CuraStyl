-- ============================================================
-- CuraStyl – QR Verification & Notification Enhancements
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add QR verification columns to bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS qr_verified     BOOLEAN    DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS qr_scanned_at   TIMESTAMPTZ;

-- 2. Allow salon owners to UPDATE their salon's bookings
--    (needed for QR verify endpoint to flip qr_verified / status)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'bookings' AND policyname = 'Owners update salon bookings'
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

-- 3. Allow authenticated users (and service-role) to INSERT notifications
--    (booking confirmed, reminder, no-show sent from API routes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'notifications' AND policyname = 'System can insert notifications'
  ) THEN
    CREATE POLICY "System can insert notifications" ON public.notifications
      FOR INSERT
      WITH CHECK (true);  -- server-side routes use service key; anon key will be scoped per-user
  END IF;
END $$;

-- 4. Allow users to DELETE their own notifications (mark as dismissed)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'notifications' AND policyname = 'Users delete own notifications'
  ) THEN
    CREATE POLICY "Users delete own notifications" ON public.notifications
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- 5. Index for fast cron queries (confirmed, unverified, by date)
CREATE INDEX IF NOT EXISTS idx_bookings_reminder
  ON public.bookings (booking_date, time_slot)
  WHERE status = 'confirmed' AND qr_verified = FALSE;

-- Done!
SELECT 'Migration complete: QR verification & notification policies added' AS result;
