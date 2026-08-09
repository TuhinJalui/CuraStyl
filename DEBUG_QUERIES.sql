-- ════════════════════════════════════════════════════════════════
-- 🔍 DEBUG QUERIES - Run these to check your database state
-- Copy-paste into Supabase SQL Editor to diagnose issues
-- ════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════
-- 1. CHECK USER PROFILES
-- ══════════════════════════════════════════════════════════════
SELECT 
  id,
  email,
  full_name,
  role,
  membership_tier,
  glam_points,
  total_spent,
  is_salon_owner,
  created_at
FROM profiles
ORDER BY created_at DESC
LIMIT 10;

-- Expected: membership_tier = 'basic', glam_points = 100


-- ══════════════════════════════════════════════════════════════
-- 2. CHECK SPECIFIC USER BY EMAIL
-- ══════════════════════════════════════════════════════════════
SELECT 
  id,
  email,
  membership_tier,
  glam_points,
  total_spent,
  membership_expires_at
FROM profiles
WHERE email = 'YOUR_EMAIL_HERE@example.com';

-- Replace YOUR_EMAIL_HERE with your actual email


-- ══════════════════════════════════════════════════════════════
-- 3. CHECK COUPONS TABLE STRUCTURE
-- ══════════════════════════════════════════════════════════════
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'coupons'
ORDER BY ordinal_position;

-- Must have: created_by column (uuid, nullable)


-- ══════════════════════════════════════════════════════════════
-- 4. CHECK SALONS TABLE STRUCTURE
-- ══════════════════════════════════════════════════════════════
SELECT 
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'salons' 
  AND column_name IN ('plan_tier', 'plan_expires_at')
ORDER BY ordinal_position;

-- Must have: plan_tier (text, default 'free'), plan_expires_at (timestamptz)


-- ══════════════════════════════════════════════════════════════
-- 5. CHECK GLAMPOINTS HISTORY TABLE
-- ══════════════════════════════════════════════════════════════
SELECT 
  table_name
FROM information_schema.tables
WHERE table_name = 'glam_points_history';

-- Should return: glam_points_history


-- ══════════════════════════════════════════════════════════════
-- 6. CHECK RPC FUNCTIONS EXIST
-- ══════════════════════════════════════════════════════════════
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name IN ('award_glam_points', 'increment_total_spent')
ORDER BY routine_name;

-- Should return: award_glam_points, increment_total_spent


-- ══════════════════════════════════════════════════════════════
-- 7. CHECK USER'S COUPONS
-- ══════════════════════════════════════════════════════════════
SELECT 
  c.code,
  c.discount_type,
  c.discount_value,
  c.used_count,
  c.usage_limit,
  c.is_active,
  c.valid_until,
  c.created_by,
  c.created_at
FROM coupons c
WHERE c.created_by = (
  SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL_HERE@example.com'
)
ORDER BY c.created_at DESC;

-- Shows all coupons redeemed by user


-- ══════════════════════════════════════════════════════════════
-- 8. CHECK GLAMPOINTS HISTORY
-- ══════════════════════════════════════════════════════════════
SELECT 
  type,
  points,
  description,
  balance_after,
  created_at
FROM glam_points_history
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL_HERE@example.com'
)
ORDER BY created_at DESC
LIMIT 10;

-- Shows recent point transactions


-- ══════════════════════════════════════════════════════════════
-- 9. CHECK RLS POLICIES ON COUPONS
-- ══════════════════════════════════════════════════════════════
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'coupons';

-- Should have policies for SELECT, INSERT (service_role)


-- ══════════════════════════════════════════════════════════════
-- 10. CHECK ALL ACTIVE COUPONS
-- ══════════════════════════════════════════════════════════════
SELECT 
  code,
  discount_type,
  discount_value,
  used_count,
  usage_limit,
  is_active,
  valid_from,
  valid_until,
  created_by IS NOT NULL as user_redeemed
FROM coupons
WHERE is_active = true
  AND valid_until > NOW()
ORDER BY created_at DESC
LIMIT 20;

-- Shows all active, valid coupons


-- ══════════════════════════════════════════════════════════════
-- 🔧 QUICK FIX QUERIES (if needed)
-- ══════════════════════════════════════════════════════════════

-- Give user test points
-- UPDATE profiles 
-- SET glam_points = 1000 
-- WHERE email = 'YOUR_EMAIL_HERE@example.com';

-- Reset user to basic tier
-- UPDATE profiles 
-- SET membership_tier = 'basic', 
--     membership_expires_at = NULL 
-- WHERE email = 'YOUR_EMAIL_HERE@example.com';

-- Create test coupon
-- INSERT INTO coupons (
--   code, discount_type, discount_value,
--   min_order_amount, usage_limit, used_count,
--   is_active, valid_from, valid_until,
--   created_by, description
-- ) VALUES (
--   'TEST123', 'fixed', 50,
--   0, 1, 0,
--   true, NOW(), NOW() + INTERVAL '30 days',
--   (SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL_HERE@example.com'),
--   'Test coupon'
-- );


-- ══════════════════════════════════════════════════════════════
-- 📊 SUMMARY STATS
-- ══════════════════════════════════════════════════════════════
SELECT 
  'Total Users' as metric,
  COUNT(*) as count
FROM profiles
UNION ALL
SELECT 
  'Users with GlamPoints',
  COUNT(*) 
FROM profiles 
WHERE glam_points > 0
UNION ALL
SELECT 
  'Active Coupons',
  COUNT(*) 
FROM coupons 
WHERE is_active = true AND valid_until > NOW()
UNION ALL
SELECT 
  'User-Redeemed Coupons',
  COUNT(*) 
FROM coupons 
WHERE created_by IS NOT NULL
UNION ALL
SELECT 
  'Premium Users',
  COUNT(*) 
FROM profiles 
WHERE membership_tier = 'premium'
UNION ALL
SELECT 
  'VIP Users',
  COUNT(*) 
FROM profiles 
WHERE membership_tier = 'vip';


-- ══════════════════════════════════════════════════════════════
-- ✅ VERIFICATION - ALL SHOULD RETURN TRUE
-- ══════════════════════════════════════════════════════════════
SELECT 
  EXISTS(
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'coupons' AND column_name = 'created_by'
  ) as coupons_has_created_by,
  
  EXISTS(
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'salons' AND column_name = 'plan_tier'
  ) as salons_has_plan_tier,
  
  EXISTS(
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'glam_points_history'
  ) as glam_points_history_exists,
  
  EXISTS(
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'award_glam_points'
  ) as award_glam_points_exists,
  
  EXISTS(
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'increment_total_spent'
  ) as increment_total_spent_exists,
  
  EXISTS(
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'total_spent'
  ) as profiles_has_total_spent;

-- ALL should be TRUE


-- ══════════════════════════════════════════════════════════════
-- 🎯 END OF DEBUG QUERIES
-- ══════════════════════════════════════════════════════════════
-- If anything returns FALSE or unexpected values, 
-- run: supabase/FIX_GLAMPOINTS_AND_PLANS.sql
-- ══════════════════════════════════════════════════════════════
