# Pre-Testing Checklist ✅

Bro, follow this step-by-step before testing:

## Step 1: Database Setup (CRITICAL!)
```
☐ Open Supabase Dashboard
☐ Go to SQL Editor
☐ Copy ENTIRE file: supabase/FIX_GLAMPOINTS_AND_PLANS.sql
☐ Paste into editor
☐ Click "Run"
☐ Wait for completion
☐ Look for ✅ success messages at the bottom
☐ If any ❌ errors, copy them and share
```

## Step 2: Verify Database
```
☐ Copy queries from: DEBUG_QUERIES.sql
☐ Run the VERIFICATION query (last one)
☐ All values should be TRUE
☐ If any FALSE, re-run FIX_GLAMPOINTS_AND_PLANS.sql
```

## Step 3: Check Environment
```
☐ Open .env file
☐ Verify these exist:
   ☐ NEXT_PUBLIC_SUPABASE_URL=https://...
   ☐ NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ☐ SUPABASE_SERVICE_ROLE_KEY=...
   ☐ NEXT_PUBLIC_SITE_URL=http://localhost:3000
☐ No typos in variable names
☐ No extra spaces
```

## Step 4: Restart Dev Server
```
☐ Stop current server (Ctrl+C in terminal)
☐ Run: npm run dev
☐ Wait for "ready" message
☐ No TypeScript errors in terminal
```

## Step 5: Test Login
```
☐ Open http://localhost:3000
☐ Login with your account
☐ Check you're logged in (see your name in navbar)
☐ Open browser DevTools (F12)
☐ Go to Console tab
☐ Clear any old errors
```

## Step 6: Test Customer Plan Upgrade
```
☐ Click on dashboard/profile
☐ See "Upgrade" button or link
☐ Click "Upgrade" → Should go to /upgrade page
☐ See 3 plans: Basic, Premium, VIP
☐ Click "Upgrade to Premium"
☐ Check browser console for errors
☐ If error, copy FULL output (status, error, data)
```

## Step 7: Test GlamPoints Redemption
```
☐ Go to /rewards page
☐ Check GlamPoints balance (should be at least 100)
☐ Go to "Redeem" tab
☐ See rewards catalog
☐ Click "Redeem" on any reward
☐ Check browser console for errors
☐ If error, copy FULL output
```

## Step 8: Verify Coupon Creation
```
☐ If redemption succeeded, toast shows coupon code
☐ Go to "My Coupons" tab
☐ See your redeemed coupon
☐ Copy coupon code
☐ Go to any salon and book
☐ At checkout, paste coupon code
☐ Click "Apply"
☐ Discount should appear
```

---

## Common Pre-Testing Mistakes

### ❌ WRONG: Skip database migration
```
"I'll test first then run SQL if it fails"
```
**✅ CORRECT:** Always run SQL first!

### ❌ WRONG: Run only part of SQL file
```
Copy first few lines → Run → Copy next lines → Run
```
**✅ CORRECT:** Copy ENTIRE file at once and run

### ❌ WRONG: Don't restart server after SQL
```
Run SQL → Immediately test → Errors
```
**✅ CORRECT:** Always restart dev server after SQL changes

### ❌ WRONG: Test without checking console
```
Click button → "It doesn't work" → No error details
```
**✅ CORRECT:** Always check console FIRST for detailed errors

### ❌ WRONG: Share vague error message
```
"It says failed to create payment order"
```
**✅ CORRECT:** Share FULL console output with status code, error, data

---

## Quick Verification Commands

### In Supabase SQL Editor:
```sql
-- Check all fixes applied
SELECT 
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'coupons' AND column_name = 'created_by') as coupons_ok,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'salons' AND column_name = 'plan_tier') as salons_ok,
  EXISTS(SELECT 1 FROM information_schema.routines WHERE routine_name = 'award_glam_points') as function_ok;

-- Should return all TRUE
```

### In Browser Console (after login):
```javascript
// Check if you're logged in
fetch('/api/customer/plan')
  .then(r => r.json())
  .then(console.log)

// Should return your plan details, not error
```

---

## What Good Output Looks Like

### Database Verification ✅
```
coupons_ok    | true
salons_ok     | true  
function_ok   | true
```

### API Test ✅
```javascript
{
  current: { name: "Basic", price: 0, tier: "basic" },
  plans: [...],
  glamPoints: 100
}
```

### Console (No Errors) ✅
```
No errors in console
or
Only warnings (yellow ⚠️) are okay
Red errors (🔴) need fixing
```

---

## What Bad Output Looks Like

### Database Verification ❌
```
coupons_ok    | false  ← PROBLEM!
salons_ok     | true
function_ok   | false  ← PROBLEM!
```
**Fix:** Re-run FIX_GLAMPOINTS_AND_PLANS.sql

### API Test ❌
```javascript
{
  error: "Profile not found"
}
```
**Fix:** Check if profile exists in database

### Console Errors ❌
```
POST /api/customer/plan 500
Error: Failed to create payment order
```
**Action:** Copy FULL error details including stack trace

---

## Emergency Fixes

### If profile doesn't exist:
```sql
-- In Supabase SQL Editor
INSERT INTO profiles (id, email, full_name, membership_tier, glam_points)
SELECT 
  id, 
  email,
  COALESCE(raw_user_meta_data->>'full_name', email),
  'basic',
  100
FROM auth.users
WHERE id = 'YOUR_USER_ID_HERE'
ON CONFLICT (id) DO NOTHING;
```

### If no GlamPoints:
```sql
UPDATE profiles 
SET glam_points = 100 
WHERE email = 'your-email@example.com';
```

### If wrong tier:
```sql
UPDATE profiles 
SET membership_tier = 'basic',
    membership_expires_at = NULL
WHERE email = 'your-email@example.com';
```

---

## Final Check Before Reporting Issues

Before saying "it's not working":

✅ Ran FIX_GLAMPOINTS_AND_PLANS.sql completely
✅ All database verifications return TRUE
✅ Restarted dev server
✅ Logged in successfully
✅ Browser console is open
✅ Copied FULL error output (not just message)
✅ Checked .env has all variables
✅ No TypeScript errors in terminal

If ALL above are checked and still not working,
then share:
1. Full console error
2. Database verification results
3. .env file (without actual keys)
4. Terminal output

---

## Success Indicators

When everything is set up correctly:

✅ Database verification: All TRUE
✅ Login: Works, see your name
✅ /upgrade page: Shows 3 plans
✅ Click upgrade: Opens modal with price
✅ /rewards page: Shows points balance
✅ Click redeem: Creates coupon
✅ My Coupons: Shows redeemed coupon
✅ Checkout: Can apply coupon

All good! 🎉

---

Now bro, follow this checklist step-by-step and share results!
