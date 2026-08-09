# Fixes and Testing Guide 🔧

## Critical Fixes Applied

### 1. Database Schema Fixes
**File**: `supabase/FIX_GLAMPOINTS_AND_PLANS.sql`

**What it does:**
- ✅ Adds `created_by` column to `coupons` table (required for user redemptions)
- ✅ Fixes default `membership_tier` to 'basic' for all new users
- ✅ Adds `plan_tier` and `plan_expires_at` to `salons` table
- ✅ Ensures `glam_points_history` table exists
- ✅ Recreates `award_glam_points()` RPC function
- ✅ Recreates `increment_total_spent()` RPC function
- ✅ Adds `total_spent` column to profiles
- ✅ Gives all users 100 signup bonus GlamPoints
- ✅ Sets up proper RLS policies for all tables

**HOW TO RUN:**
```sql
-- Copy ENTIRE contents of supabase/FIX_GLAMPOINTS_AND_PLANS.sql
-- Paste into Supabase SQL Editor
-- Click "Run"
-- Should see success messages
```

### 2. Frontend Fixes

**Upgrade Button Fixed** (`AuthenticatedHome.tsx`):
- ✅ Upgrade buttons now link to `/upgrade` page
- ✅ "Current Plan" button is disabled
- ✅ Basic plan shows "Downgrade" (disabled)

**Better Error Logging** (`upgrade/page.tsx` and `rewards/page.tsx`):
- ✅ Added detailed console logging for API errors
- ✅ Shows full error response with status codes
- ✅ Helps debug exactly what's failing

---

## Testing Steps

### Step 1: Run the SQL Migration
```
1. Open Supabase Dashboard → SQL Editor
2. Paste ENTIRE contents of FIX_GLAMPOINTS_AND_PLANS.sql
3. Click "Run"
4. Look for success messages (green checkmarks ✅)
5. If any errors, copy the error message and share it
```

### Step 2: Verify Database Schema
```sql
-- Check coupons table has created_by
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'coupons' AND column_name = 'created_by';
-- Should return: created_by | uuid

-- Check profiles have basic tier by default
SELECT id, email, membership_tier, glam_points 
FROM profiles 
LIMIT 5;
-- membership_tier should be 'basic', glam_points should be 100

-- Check salons have plan_tier
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'salons' AND column_name = 'plan_tier';
-- Should return: plan_tier | text

-- Check award_glam_points function exists
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'award_glam_points';
-- Should return: award_glam_points
```

### Step 3: Test Customer Plan Upgrade
```
1. Login as customer
2. Go to http://localhost:3000/upgrade (or click Upgrade button from dashboard)
3. Click "Upgrade to Premium"
4. Check browser console for errors
5. If error, copy the FULL console output

Expected console log format:
{
  status: 500,
  statusText: "Internal Server Error",
  error: "Actual error message here",
  data: { ... }
}
```

### Step 4: Test GlamPoints Redemption
```
1. Login as customer
2. Go to /rewards
3. Go to "Redeem" tab
4. Click "Redeem" on any reward
5. Check browser console for errors
6. If error, copy the FULL console output
```

---

## Common Issues & Solutions

### Issue 1: "Failed to create payment order"
**Possible Causes:**
- Missing `.env` variables
- `NEXT_PUBLIC_SITE_URL` not set
- Profile not found

**Solution:**
```bash
# Check .env file has:
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

**Test the API directly:**
```bash
# In browser console or Postman
fetch('/api/customer/plan', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ tier: 'premium' })
})
.then(r => r.json())
.then(console.log)
```

### Issue 2: "Failed to create coupon"
**Possible Causes:**
- `coupons` table missing `created_by` column
- RLS policies blocking insert
- `award_glam_points` function doesn't exist

**Solution:**
1. Run the SQL migration (Step 1 above)
2. Check if `created_by` column exists:
```sql
SELECT * FROM information_schema.columns 
WHERE table_name = 'coupons' AND column_name = 'created_by';
```

3. Check RLS policies allow service role:
```sql
SELECT * FROM pg_policies WHERE tablename = 'coupons';
```

### Issue 3: "Insufficient GlamPoints"
**Possible Causes:**
- User doesn't have enough points
- `glam_points` column is NULL

**Solution:**
```sql
-- Give user some test points
UPDATE profiles 
SET glam_points = 1000 
WHERE email = 'your-email@example.com';
```

---

## Debug Checklist

Before reporting an issue, check ALL of these:

### Database
- [ ] Ran `FIX_GLAMPOINTS_AND_PLANS.sql` successfully
- [ ] `coupons.created_by` column exists
- [ ] `salons.plan_tier` column exists
- [ ] `glam_points_history` table exists
- [ ] `award_glam_points()` function exists
- [ ] Profile has `membership_tier = 'basic'` by default
- [ ] Profile has `glam_points >= 100`

### Environment
- [ ] `.env` file has all required variables
- [ ] `NEXT_PUBLIC_SITE_URL` is set correctly
- [ ] Supabase credentials are correct
- [ ] Dev server is running (`npm run dev`)

### Frontend
- [ ] No TypeScript errors in terminal
- [ ] Browser console shows detailed error logs
- [ ] Network tab shows API request/response
- [ ] User is logged in (session exists)

### API Routes
- [ ] `/api/customer/plan` (GET) returns current plan
- [ ] `/api/customer/plan` (POST) creates payment order
- [ ] `/api/glam-points/redeem` (POST) creates coupon
- [ ] `/api/payment/create-order` (POST) creates order

---

## Testing API Routes Directly

### Test GET Customer Plan
```javascript
// In browser console (must be logged in)
fetch('/api/customer/plan')
  .then(r => r.json())
  .then(console.log)

// Expected response:
{
  current: { name: "Basic", price: 0, tier: "basic", ... },
  plans: [ ... ],
  glamPoints: 100,
  membershipExpiresAt: null
}
```

### Test POST Customer Plan Upgrade
```javascript
// In browser console (must be logged in)
fetch('/api/customer/plan', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ tier: 'premium' })
})
.then(async r => ({ status: r.status, data: await r.json() }))
.then(console.log)

// Expected response:
{
  status: 200,
  data: {
    orderId: "order_...",
    amount: 499,
    planName: "Premium",
    planPrice: 499,
    ...
  }
}

// If error:
{
  status: 500,
  data: { error: "Actual error message" }
}
```

### Test GlamPoints Redemption
```javascript
// In browser console (must be logged in)
fetch('/api/glam-points/redeem', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ points: 500, rewardId: 'r1' })
})
.then(async r => ({ status: r.status, data: await r.json() }))
.then(console.log)

// Expected response:
{
  status: 200,
  data: {
    success: true,
    pointsRedeemed: 500,
    rupeesValue: 50,
    newBalance: 500,
    coupon: {
      code: "GLAM5F3A2B",
      discountAmount: 50,
      ...
    }
  }
}
```

---

## Server-Side Debugging

### Check API Route Logs
```bash
# Terminal running npm run dev should show:
POST /api/customer/plan 200 in 123ms
# or
POST /api/customer/plan 500 in 45ms
# (look for 500 errors)
```

### Add Debug Logging to API Routes

**In `/api/customer/plan/route.ts`:**
```typescript
export async function POST(req: NextRequest) {
  console.log("🔷 POST /api/customer/plan called");
  
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  console.log("🔷 User:", user?.id, user?.email);
  
  const { tier } = await req.json();
  console.log("🔷 Tier:", tier);
  
  const { data: profile } = await supabase
    .from("profiles")
    .select("membership_tier, full_name")
    .eq("id", user.id)
    .single();
  console.log("🔷 Profile:", profile);
  
  // ... rest of code
}
```

### Check Supabase Logs
```
1. Go to Supabase Dashboard
2. Click "Logs" in sidebar
3. Select "Database" or "API"
4. Look for errors around the time you tested
5. Copy any error messages
```

---

## What to Share if Still Not Working

If after all this, it's still not working, share:

1. **Full console error output** (from browser DevTools Console)
2. **Network tab** screenshot (showing failed request details)
3. **Terminal output** (from `npm run dev` showing API errors)
4. **SQL migration results** (success/failure messages)
5. **Database verification** queries results (from Step 2)

Example format:
```
Issue: Failed to create payment order

Browser Console:
{
  status: 500,
  error: "Profile not found",
  data: { ... }
}

Terminal:
POST /api/customer/plan 500 in 67ms
Error: Profile not found
    at /api/customer/plan/route.ts:42

Database Check:
SELECT * FROM profiles WHERE email = 'test@test.com';
-- Returns: 0 rows (ISSUE: profile doesn't exist!)
```

---

## Quick Fixes

### Give User Test Points
```sql
UPDATE profiles 
SET glam_points = 1000 
WHERE email = 'your-email@example.com';
```

### Reset User to Basic Tier
```sql
UPDATE profiles 
SET membership_tier = 'basic', 
    membership_expires_at = NULL 
WHERE email = 'your-email@example.com';
```

### Create Test Coupon Manually
```sql
INSERT INTO coupons (
  code, discount_type, discount_value, 
  min_order_amount, usage_limit, used_count,
  is_active, valid_from, valid_until,
  created_by, description
) VALUES (
  'TEST123', 'fixed', 50,
  0, 1, 0,
  true, NOW(), NOW() + INTERVAL '30 days',
  (SELECT id FROM auth.users LIMIT 1),
  'Test coupon'
);
```

---

## Success Indicators

When everything works, you should see:

✅ **Customer Dashboard**: Shows "Upgrade to Premium" button
✅ **Upgrade Page**: Shows 3 plans (Basic, Premium, VIP)
✅ **Click Upgrade**: Opens payment modal with amount ₹499
✅ **Rewards Page**: Shows current GlamPoints balance
✅ **Click Redeem**: Success toast with coupon code
✅ **My Coupons Tab**: Shows redeemed coupon with status
✅ **Checkout**: Can apply coupon code successfully

All good! 🎉
