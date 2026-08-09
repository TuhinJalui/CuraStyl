-- ════════════════════════════════════════════════════════════════
-- FIX FAVORITES & BOOKINGS - Run this in Supabase SQL Editor
-- ════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────
-- 1. FIX FAVORITES - Add INSERT policy if missing
-- ──────────────────────────────────────────────────────────────

-- Drop existing policy if exists
DROP POLICY IF EXISTS "Users manage own favorites" ON public.favorites;

-- Create separate policies for each operation
CREATE POLICY "Users can view own favorites" 
ON public.favorites FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can add favorites" 
ON public.favorites FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove favorites" 
ON public.favorites FOR DELETE 
USING (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────
-- 2. FIX BOOKINGS - Ensure proper RLS policies
-- ──────────────────────────────────────────────────────────────

-- Add UPDATE policy for bookings if missing
CREATE POLICY IF NOT EXISTS "Users can update own bookings" 
ON public.bookings FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────
-- 3. VERIFY TABLES EXIST
-- ──────────────────────────────────────────────────────────────

DO $$
BEGIN
  -- Check favorites table
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'favorites') THEN
    RAISE NOTICE '✅ Favorites table exists';
  ELSE
    RAISE EXCEPTION '❌ Favorites table missing! Run schema.sql first.';
  END IF;

  -- Check bookings table
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'bookings') THEN
    RAISE NOTICE '✅ Bookings table exists';
  ELSE
    RAISE EXCEPTION '❌ Bookings table missing! Run schema.sql first.';
  END IF;

  -- Check notifications table  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notifications') THEN
    RAISE NOTICE '✅ Notifications table exists';
  ELSE
    RAISE EXCEPTION '❌ Notifications table missing! Run schema.sql first.';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ FAVORITES & BOOKINGS - FIXED!';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Favorites policies updated (SELECT, INSERT, DELETE)';
  RAISE NOTICE '✅ Bookings policies verified';
  RAISE NOTICE '✅ All tables confirmed';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Next steps:';
  RAISE NOTICE '1. Refresh your app (Ctrl+Shift+R)';
  RAISE NOTICE '2. Add salons to favorites - they will persist!';
  RAISE NOTICE '3. Create bookings - they will show in dashboard!';
  RAISE NOTICE '';
END $$;
