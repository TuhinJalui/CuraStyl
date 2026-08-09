# Complete System Verification Checklist

Run these commands in **Supabase SQL Editor** to verify everything is set up correctly.

## ✅ Step 1: Apply Migrations

### 1.1 GlamPoints Migration
```sql
-- Copy and paste entire content from:
-- supabase/GLAM_POINTS_MIGRATION.sql

-- Expected output:
-- "GLAM_POINTS_MIGRATION executed successfully ✅"
```

### 1.2 Payments Migration
```sql
-- Copy and paste entire content from:
-- supabase/PAYMENTS_MIGRATION.sql

-- Expected output:
-- Should create payments table without errors
```

## ✅ Step 2: Verify Database Functions Exist

```sql
-- Check if all required functions exist
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'award_glam_points',
  'increment_total_spent',
  'auto_upgrade_membership'
)
ORDER BY routine_name;

-- Expected output: Should show 3 functions
```

## ✅ Step 3: Verify Table Columns

```sql
-- Check profiles table has glam_points columns
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN ('glam_points', 'membership_tier', 'total_spent')
ORDER BY column_name;

-- Expected output: Should show 3 columns
```

```sql
-- Check payments table exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'payments'
ORDER BY ordinal_position;

-- Expected output: Should show all payment columns
```

```sql
-- Check bookings table has payment columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'bookings'
AND column_name IN ('payment_status', 'payment_id', 'payment_method')
ORDER BY column_name;

-- Expected output: Should show 3 columns
```

## ✅ Step 4: Test GlamPoints Award Function

```sql
-- Test with your actual user ID
-- Replace 'YOUR_USER_UUID_HERE' with actual user UUID from auth.users

-- Award test points
SELECT award_glam_points(
  'YOUR_USER_UUID_HERE'::uuid,
  50,                    -- 50 test points
  'earned',
  'Test points award',
  NULL
);

-- Check if points were added
SELECT 
  email,
  glam_points,
  membership_tier,
  total_spent
FROM profiles
WHERE id = 'YOUR_USER_UUID_HERE'::uuid;

-- Expected output: glam_points should increase by 50
```

## ✅ Step 5: Check GlamPoints History Table

```sql
-- View all points history for a user
SELECT 
  created_at,
  type,
  points,
  description,
  balance_after
FROM glam_points_history
WHERE user_id = 'YOUR_USER_UUID_HERE'::uuid
ORDER BY created_at DESC
LIMIT 10;

-- Expected output: Should show the test award
```

## ✅ Step 6: Verify Payment Flow

### 6.1 Check if payment API endpoints are working

Test in browser or Postman:
```bash
# 1. Create test payment order (must be authenticated)
POST /api/payment/create-order
Content-Type: application/json

{
  "amount": 500,
  "type": "booking",
  "metadata": {
    "bookingId": "TEST123",
    "salonName": "Test Salon"
  }
}

# Expected response:
{
  "orderId": "order_...",
  "amount": 500,
  "currency": "INR",
  "upiId": "7507075722@mbk",
  "key": "..."
}
```

### 6.2 Verify transaction
```bash
# 2. Verify test payment
POST /api/payment/verify
Content-Type: application/json

{
  "transaction_id": "TEST123456789",
  "razorpay_order_id": "order_from_step_1",
  "type": "booking",
  "metadata": {
    "bookingId": "TEST123",
    "orderId": "order_from_step_1"
  }
}

# Expected response:
{
  "success": true,
  "message": "Payment verified successfully",
  "paymentId": "TEST123456789"
}
```

## ✅ Step 7: Test Complete Booking Flow

### 7.1 Create a test booking with payment
```bash
POST /api/bookings
Content-Type: application/json

{
  "salonId": "YOUR_SALON_ID",
  "serviceId": "YOUR_SERVICE_ID",
  "date": "2024-12-25",
  "timeSlot": "10:00 AM",
  "paymentMethod": "upi",
  "paymentStatus": "paid",
  "paymentId": "TEST987654321"
}

# Expected: Booking created + GlamPoints awarded
```

### 7.2 Verify GlamPoints were awarded
```sql
-- Check user's points increased
SELECT 
  email,
  glam_points,
  total_spent
FROM profiles
WHERE id = 'YOUR_USER_UUID_HERE'::uuid;

-- Check history
SELECT 
  created_at,
  type,
  points,
  description,
  booking_id
FROM glam_points_history
WHERE user_id = 'YOUR_USER_UUID_HERE'::uuid
AND booking_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

-- Expected: New entry with booking_id and points earned
```

## ✅ Step 8: Test Review Notifications

### 8.1 Create a test review
```bash
POST /api/reviews
Content-Type: application/json

{
  "salon_id": "YOUR_SALON_ID",
  "rating": 5,
  "comment": "This is a test review to check if notifications work for salon owners"
}

# Expected: Review created + Notification sent to owner
```

### 8.2 Check if notification was created
```sql
-- Check salon owner's notifications
SELECT 
  created_at,
  type,
  title,
  message,
  is_read
FROM notifications
WHERE user_id = (
  SELECT owner_id FROM salons WHERE id = 'YOUR_SALON_ID'
)
AND type = 'new_review'
ORDER BY created_at DESC
LIMIT 5;

-- Expected: New notification with type='new_review'
```

## ✅ Step 9: Verify Salon Owner Sees All Bookings

```sql
-- Check if bookings query returns all dates
SELECT 
  booking_id,
  booking_date,
  status,
  created_at
FROM bookings
WHERE salon_id = 'YOUR_SALON_ID'
ORDER BY booking_date DESC
LIMIT 20;

-- Expected: Should show past, present, and future bookings
-- (Not just today's bookings)
```

## ✅ Step 10: Check Environment Variables

In your `.env.local` file, verify:

```bash
# Required for GlamPoints
SUPABASE_SERVICE_ROLE_KEY=sxxxxxxxxx

# Optional for Razorpay
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_xxx
RAZORPAY_KEY_SECRET=xxx

# Should already exist
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
```

## 🔍 Troubleshooting Guide

### Issue: "Function award_glam_points does not exist"

**Solution**:
```sql
-- Re-run the migration
-- Copy entire content from: supabase/GLAM_POINTS_MIGRATION.sql
-- Paste in SQL Editor and execute
```

### Issue: GlamPoints not awarded on booking

**Check**:
```sql
-- 1. Is paymentMethod correct?
SELECT payment_method, payment_status, final_amount
FROM bookings
WHERE booking_id = 'YOUR_BOOKING_ID';

-- Should be 'upi' or anything except 'cash_in_hand'

-- 2. Check if function was called
SELECT * FROM glam_points_history
WHERE booking_id = 'YOUR_BOOKING_ID';

-- If empty, function was not called
```

**Fix**:
- Ensure `paymentMethod` is set correctly in booking creation
- Check `SUPABASE_SERVICE_ROLE_KEY` is set in environment
- Check server logs for errors

### Issue: Payment verification fails

**Check**:
```sql
-- 1. Does payment record exist?
SELECT * FROM payments
WHERE order_id = 'YOUR_ORDER_ID';

-- 2. Check payment status
SELECT order_id, status, amount, payment_type
FROM payments
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC
LIMIT 5;
```

### Issue: Notifications not appearing

**Check**:
```sql
-- Check if notifications were created
SELECT 
  type,
  title,
  message,
  created_at,
  is_read
FROM notifications
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC
LIMIT 10;

-- Should show booking confirmations, reviews, etc.
```

## ✅ Final Verification

### Complete System Check
```sql
-- Run this comprehensive query
WITH user_stats AS (
  SELECT 
    u.id,
    u.email,
    p.glam_points,
    p.membership_tier,
    p.total_spent,
    COUNT(DISTINCT b.id) as total_bookings,
    COUNT(DISTINCT gph.id) as points_transactions,
    COUNT(DISTINCT n.id) as total_notifications
  FROM auth.users u
  JOIN profiles p ON p.id = u.id
  LEFT JOIN bookings b ON b.user_id = u.id
  LEFT JOIN glam_points_history gph ON gph.user_id = u.id
  LEFT JOIN notifications n ON n.user_id = u.id
  WHERE u.email = 'YOUR_TEST_EMAIL@example.com'
  GROUP BY u.id, u.email, p.glam_points, p.membership_tier, p.total_spent
)
SELECT * FROM user_stats;

-- Expected output:
-- Should show user with glam_points, bookings, transactions
```

## Summary Checklist

- [ ] ✅ GLAM_POINTS_MIGRATION.sql applied
- [ ] ✅ PAYMENTS_MIGRATION.sql applied
- [ ] ✅ Functions exist: award_glam_points, increment_total_spent
- [ ] ✅ Profiles table has: glam_points, membership_tier, total_spent
- [ ] ✅ Payments table created
- [ ] ✅ Bookings table has payment columns
- [ ] ✅ Test GlamPoints award works
- [ ] ✅ Payment order creation works
- [ ] ✅ Payment verification works
- [ ] ✅ Test booking awards points
- [ ] ✅ Review notifications work
- [ ] ✅ Salon owner sees all bookings
- [ ] ✅ Environment variables set

## Quick Test Script

```sql
-- Run this to test everything at once
DO $$
DECLARE
  test_user_id uuid;
  test_order_id text;
  test_points_before int;
  test_points_after int;
BEGIN
  -- Get a test user
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  
  -- Check current points
  SELECT glam_points INTO test_points_before FROM profiles WHERE id = test_user_id;
  RAISE NOTICE 'Points before: %', test_points_before;
  
  -- Award test points
  PERFORM award_glam_points(test_user_id, 100, 'earned', 'Automated test', NULL);
  
  -- Check new points
  SELECT glam_points INTO test_points_after FROM profiles WHERE id = test_user_id;
  RAISE NOTICE 'Points after: %', test_points_after;
  
  IF test_points_after = test_points_before + 100 THEN
    RAISE NOTICE '✅ GlamPoints system working!';
  ELSE
    RAISE NOTICE '❌ GlamPoints system NOT working!';
  END IF;
END $$;
```

---

**If all checks pass, your system is ready to go! 🎉**
