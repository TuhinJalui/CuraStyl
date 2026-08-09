# 🔍 Debug Guide: Payment Order Creation Issues

## ✅ Fixes Applied

### 1. **Hydration Error Fixed**
- **Issue**: Server-rendered content didn't match client due to reading `window.location.search` during SSR
- **Fix**: Added conditional rendering - shows "Dashboard" until client mounts, then shows correct tab title
- **Result**: Hydration mismatch error should be resolved

### 2. **Comprehensive Error Logging Added**
Added detailed console logging to track payment order creation:
- User authentication status
- Request body validation
- Database insertion details
- Full error messages with codes
- Response data

## 🔍 How to Debug the Payment Error

### Step 1: Open Browser Developer Console
1. Open your application in the browser
2. Press `F12` or `Ctrl+Shift+I` to open Developer Tools
3. Go to the **Console** tab
4. Clear any existing logs

### Step 2: Try Upgrading Plan
1. Click on the **Upgrade** button for Premium or Ultra plan
2. Watch the console for log messages

### Step 3: Look for These Log Messages

You should see logs in this order:

```
[SalonOwner] Initiating plan upgrade to: premium (or ultra)
[SalonPlan] POST request - User: <user-id>
[SalonPlan] Requested tier: premium
[SalonPlan] Salon found: { id: "...", plan_tier: "free", name: "..." }
[SalonPlan] Plan details: { name: "Premium", price: 999, ... }
[SalonPlan] Creating payment order with: { amount: 999, type: "plan_upgrade_salon", ... }
[PaymentOrder] Starting payment order creation
[PaymentOrder] User authenticated: <user-id>
[PaymentOrder] Request body: { amount: 999, type: "plan_upgrade_salon", ... }
[PaymentOrder] Generated order ID: order_...
[PaymentOrder] Inserting payment record: { ... }
[PaymentOrder] Payment record created successfully: { ... }
[SalonPlan] Payment order response status: 200
[SalonPlan] Payment order created successfully: { ... }
[SalonOwner] Response status: 200
[SalonOwner] Response data: { ... }
```

### Step 4: Identify the Error Point

**If the error occurs at database insertion:**
```
[PaymentOrder] Database error creating payment:
```
This means the `payments` table might be missing or have incorrect structure.

**If the error occurs before that:**
Check which validation failed.

## 🗄️ Verify Database Setup

### Check 1: Verify SQL Migration Was Run

1. Open **Supabase Dashboard**: https://supabase.com/dashboard
2. Go to your project
3. Click **SQL Editor**
4. Run this verification query:

```sql
-- Check if payments table exists with correct columns
SELECT 
  table_name, 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'payments'
ORDER BY ordinal_position;
```

**Expected columns:**
- `id` (uuid)
- `user_id` (uuid)
- `order_id` (text)
- `amount` (integer)
- `currency` (text)
- `status` (text)
- `payment_type` (text)
- `payment_method` (text)
- `metadata` (jsonb)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### Check 2: Verify Salons Table Has plan_tier

```sql
-- Check if salons table has plan_tier column
SELECT 
  column_name, 
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'salons' 
  AND column_name IN ('plan_tier', 'plan_expires_at');
```

**Expected:**
- `plan_tier` (text) - Default: 'free'
- `plan_expires_at` (timestamp with time zone)

### Check 3: Check Your Salon Record

```sql
-- Find your salon (replace 'your-email@example.com' with your actual email)
SELECT 
  s.id,
  s.name,
  s.plan_tier,
  s.plan_expires_at,
  s.owner_id,
  p.email,
  p.full_name
FROM salons s
JOIN profiles p ON s.owner_id = p.id
WHERE p.email = 'your-email@example.com';
```

### Check 4: Test Payment Table Insert Manually

```sql
-- Test if you can insert into payments table
INSERT INTO payments (
  user_id,
  order_id,
  amount,
  currency,
  status,
  payment_type,
  metadata
) VALUES (
  auth.uid(), -- Your current user ID
  'test_order_123',
  999,
  'INR',
  'created',
  'plan_upgrade_salon',
  '{"tier": "premium"}'::jsonb
)
RETURNING *;

-- Clean up the test record
DELETE FROM payments WHERE order_id = 'test_order_123';
```

**If this fails**, it means:
- RLS policies are blocking the insert
- Required columns are missing
- You need to run the migration SQL file

## 🔧 Fix Database Issues

### Option 1: Run the Complete Migration (Recommended)

Run the entire SQL file in Supabase SQL Editor:
```
c:\Users\DELL\Downloads\Styler2\supabase\FIX_GLAMPOINTS_AND_PLANS.sql
```

### Option 2: Check if payments table exists

If the `payments` table doesn't exist, run:
```
c:\Users\DELL\Downloads\Styler2\supabase\PAYMENTS_MIGRATION.sql
```

## 📊 Common Error Scenarios

### Error: "No salon found"
**Cause**: Your user account doesn't have a salon record in the database.
**Fix**: 
1. Check if you're logged in as the correct user
2. Navigate to `/salon-owner/register` to create a salon
3. Verify salon exists with Check 3 query above

### Error: "Failed to create payment order" at database insert
**Cause**: `payments` table missing or RLS policies blocking
**Fix**: Run `PAYMENTS_MIGRATION.sql`

### Error: "Invalid plan tier"
**Cause**: Frontend sent wrong tier value
**Fix**: Check console logs to see what tier value was sent

### Error: "Authentication required"
**Cause**: Not logged in or session expired
**Fix**: Log out and log back in

## 🎯 Next Steps

1. **Open browser console** and try upgrading again
2. **Copy all console logs** that start with `[SalonOwner]`, `[SalonPlan]`, or `[PaymentOrder]`
3. **Identify where the error occurs** in the log sequence
4. **Run the database verification queries** to check your database setup
5. **Share the console logs** if you need more help

## 🧪 Test Payment Flow End-to-End

Once the error is fixed, the complete flow should be:

1. ✅ Click "Upgrade" button → Shows payment order creation
2. ✅ Payment order created with UPI ID: `7507075722@mbk`
3. ✅ User enters UPI transaction ID
4. ✅ Verification succeeds
5. ✅ Plan tier updated in database
6. ✅ Dashboard shows new plan tier

## 📞 Need Help?

If you're still stuck:
1. Share the **full console logs** from browser console
2. Share the **database verification query results**
3. Confirm which SQL file you ran (if any)
