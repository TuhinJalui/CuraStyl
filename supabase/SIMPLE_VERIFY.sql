-- ═══════════════════════════════════════════════════════════════════
-- 🔍 SIMPLE DATABASE VERIFICATION
-- Run this in Supabase SQL Editor - No auth.uid() needed
-- ═══════════════════════════════════════════════════════════════════

-- 1. Check if payments table exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'payments' AND table_schema = 'public'
    ) THEN '✅ PAYMENTS TABLE EXISTS'
    ELSE '❌ PAYMENTS TABLE MISSING - Run PAYMENTS_MIGRATION.sql'
  END as payments_status;

-- 2. Check payments table columns
SELECT 
  column_name, 
  data_type,
  CASE WHEN is_nullable = 'YES' THEN 'NULL' ELSE 'NOT NULL' END as nullable
FROM information_schema.columns
WHERE table_name = 'payments' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check if salons table has plan_tier
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'salons' AND column_name = 'plan_tier'
    ) THEN '✅ SALONS HAS plan_tier COLUMN'
    ELSE '❌ SALONS MISSING plan_tier - Run FIX_GLAMPOINTS_AND_PLANS.sql'
  END as salons_plan_tier_status;

-- 4. Check if salons table has plan_expires_at
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'salons' AND column_name = 'plan_expires_at'
    ) THEN '✅ SALONS HAS plan_expires_at COLUMN'
    ELSE '❌ SALONS MISSING plan_expires_at - Run FIX_GLAMPOINTS_AND_PLANS.sql'
  END as salons_expires_status;

-- 5. Check if coupons table has created_by
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'coupons' AND column_name = 'created_by'
    ) THEN '✅ COUPONS HAS created_by COLUMN'
    ELSE '❌ COUPONS MISSING created_by - Run FIX_GLAMPOINTS_AND_PLANS.sql'
  END as coupons_created_by_status;

-- 6. Check if glam_points_history table exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'glam_points_history' AND table_schema = 'public'
    ) THEN '✅ GLAM_POINTS_HISTORY TABLE EXISTS'
    ELSE '❌ GLAM_POINTS_HISTORY MISSING - Run FIX_GLAMPOINTS_AND_PLANS.sql'
  END as glam_points_history_status;

-- 7. Check if profiles has total_spent
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'profiles' AND column_name = 'total_spent'
    ) THEN '✅ PROFILES HAS total_spent COLUMN'
    ELSE '❌ PROFILES MISSING total_spent - Run FIX_GLAMPOINTS_AND_PLANS.sql'
  END as profiles_total_spent_status;

-- 8. Check if award_glam_points function exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_name = 'award_glam_points' AND routine_schema = 'public'
    ) THEN '✅ AWARD_GLAM_POINTS FUNCTION EXISTS'
    ELSE '❌ AWARD_GLAM_POINTS FUNCTION MISSING - Run FIX_GLAMPOINTS_AND_PLANS.sql'
  END as award_function_status;

-- 9. Count all salons in database
SELECT COUNT(*) as total_salons FROM salons;

-- 10. Show all salons with their plan tiers (if column exists)
SELECT 
  id,
  name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'salons' AND column_name = 'plan_tier'
    ) THEN plan_tier::text
    ELSE 'column_not_exists'
  END as current_plan_tier
FROM salons
LIMIT 10;

-- ═══════════════════════════════════════════════════════════════════
-- 📊 SUMMARY: Review all results above
-- ═══════════════════════════════════════════════════════════════════
-- Look for ✅ marks - these mean OK
-- Look for ❌ marks - these need fixing by running the SQL file mentioned
-- ═══════════════════════════════════════════════════════════════════
