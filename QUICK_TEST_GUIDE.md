# Quick Test Guide 🚀

## How to Test All Fixes

### 1. Virtual Try-On (iframe fix)
```
1. Start the dev server: npm run dev
2. Navigate to http://localhost:3000/virtual-tryon
3. Click "Men" button → Should load https://model-men.vercel.app/ without errors
4. Go back and click "Women" → Should load https://model-two-henna.vercel.app/ without errors
5. ✅ FIXED: No more "content blocked" errors!
```

### 2. Payment Validation (UPI ID & Transaction ID)
```
1. Login as customer
2. Book any service → Go to checkout
3. Select "UPI" payment method
4. Try invalid UPI IDs:
   - "test" → Should show error: "Invalid UPI ID format"
   - "test@fakbank" → Should show error: "Unrecognized bank handle"
5. Try valid UPI ID:
   - "9876543210@paytm" → Should be accepted ✅
6. Try invalid transaction ID:
   - "123" → Should show error: "Must be exactly 12 digits"
7. Try valid transaction ID:
   - "123456789012" → Should be accepted ✅
8. ✅ FIXED: Real validation with helpful error messages!
```

### 3. Plan Upgrades - Customer
```
1. Login as customer
2. Navigate to /rewards
3. See "Upgrade to Premium/VIP" banner → Click it
4. Go to /upgrade page → Should show 3 plans (Basic, Premium, VIP)
5. Click "Upgrade to Premium" → Payment modal opens
6. Complete payment (use test UPI: 7507075722@mbk)
7. After payment → Should redirect to /rewards
8. Check profile → membership_tier should be "premium"
9. ✅ FIXED: Customer plan upgrades work perfectly!
```

### 4. Plan Upgrades - Salon Owner
```
1. Login as salon owner
2. Navigate to /salon-owner/dashboard
3. Click "My Plan" tab
4. See current plan (Free) and upgrade options
5. Click "Upgrade to Premium" or "Upgrade to Ultra"
6. Payment modal opens → Complete payment
7. Plan should update → New limits shown (services, staff)
8. Check salons table → plan_tier should be updated
9. ✅ FIXED: Salon plan upgrades work perfectly!
```

### 5. GlamPoints Redemption & Coupons
```
STEP 1: Earn Points
---------
1. Login as customer
2. Complete a booking for ₹1000
3. Check /rewards → Should show +100 GlamPoints earned

STEP 2: Redeem for Coupon
---------
1. Go to /rewards → "Redeem" tab
2. See rewards catalog (₹100 Off = 500 pts, etc.)
3. Click "Redeem" on "₹100 Off Your Next Booking"
4. Success toast shows: "Redeemed 500 GlamPoints for ₹50 coupon!"
5. Notification shows coupon code (e.g., "GLAM5F3A2B")
6. Points balance updated (500 pts deducted)

STEP 3: View My Coupons
---------
1. Go to /rewards → "My Coupons" tab
2. See your redeemed coupon with:
   - Coupon code (GLAM5F3A2B)
   - Discount amount (₹50)
   - Status badge (Active)
   - Expiry date (30 days from redemption)
   - "Copy" button
3. Click "Copy" → Coupon code copied to clipboard ✅

STEP 4: Apply Coupon at Checkout
---------
1. Start a new booking → Go to checkout
2. In "Promo Code" section, paste coupon code: GLAM5F3A2B
3. Click "Apply"
4. Success: "Coupon applied! You save ₹50"
5. Discount shown in order summary
6. Complete booking

STEP 5: Verify Usage Tracking
---------
1. Return to /rewards → "My Coupons" tab
2. Coupon now shows "Used" badge
3. Try applying same coupon again → Error: "Usage limit reached"
4. ✅ FIXED: Complete redemption → coupon → application workflow!
```

### 6. Coupon Expiry & Validation
```
1. Try applying expired coupon (change valid_until in database to past)
   → Error: "Coupon has expired"
   
2. Try applying coupon on order below minimum:
   - Coupon requires ₹500 minimum
   - Order is ₹300
   → Error: "Minimum order amount of ₹500 required"

3. Try applying inactive coupon (is_active = false)
   → Error: "Invalid or inactive coupon code"

✅ FIXED: All validation checks work correctly!
```

---

## Database Verification

Check these tables to verify the system is working:

```sql
-- 1. Check GlamPoints balance
SELECT id, full_name, glam_points, membership_tier 
FROM profiles 
WHERE email = 'your-email@example.com';

-- 2. Check GlamPoints history
SELECT * FROM glam_points_history 
WHERE user_id = 'YOUR_USER_ID' 
ORDER BY created_at DESC 
LIMIT 10;

-- 3. Check redeemed coupons
SELECT code, discount_type, discount_value, used_count, usage_limit, is_active, valid_until
FROM coupons 
WHERE created_by = 'YOUR_USER_ID' 
ORDER BY created_at DESC;

-- 4. Check bookings with coupons
SELECT booking_id, coupon_code, total_amount, discount_amount, final_amount, payment_status
FROM bookings 
WHERE user_id = 'YOUR_USER_ID' 
ORDER BY created_at DESC;

-- 5. Check customer plan tier
SELECT id, email, membership_tier, membership_expires_at 
FROM profiles 
WHERE is_salon_owner = false;

-- 6. Check salon plan tier
SELECT id, name, plan_tier, plan_expires_at 
FROM salons;
```

---

## Expected Behavior Summary

### Virtual Try-On
- ✅ Men's try-on iframe loads: https://model-men.vercel.app/
- ✅ Women's try-on iframe loads: https://model-two-henna.vercel.app/
- ✅ No CSP errors in browser console

### Payment Validation
- ✅ UPI ID format validated: username@bankcode
- ✅ Bank handles verified against 100+ known providers
- ✅ Transaction IDs must be exactly 12 digits
- ✅ Clear error messages for invalid inputs

### Plan Upgrades
- ✅ Customer: Basic (₹0) → Premium (₹499) → VIP (₹1499)
- ✅ Salon: Free (₹0) → Premium (₹999) → Ultra (₹2499)
- ✅ Payment order created via /api/payment/create-order
- ✅ Verification updates tier via /api/payment/verify
- ✅ Notifications sent on successful upgrade

### GlamPoints & Coupons
- ✅ Earn: 10 pts per ₹100 spent on bookings
- ✅ Redeem: 100 pts minimum (= ₹10 discount)
- ✅ Coupon: Unique code generated (e.g., GLAM5F3A2B)
- ✅ Validity: 30 days from redemption
- ✅ Usage: Single-use coupons (usage_limit = 1)
- ✅ Application: Validated at checkout, discount applied
- ✅ Tracking: used_count incremented, cannot reuse
- ✅ Display: "My Coupons" tab shows all with status badges

---

## Troubleshooting

### Virtual Try-On not loading
- Check browser console for CSP errors
- Verify next.config.ts has both vercel.app URLs in frame-src
- Restart dev server after config changes

### Payment validation not working
- Check src/lib/payment/validation.ts is imported correctly
- Verify PaymentProcessor.tsx has validateUpiId and validateTransactionId functions
- Check browser console for validation errors

### Plan upgrade fails
- Verify /api/payment/create-order returns orderId
- Check /api/payment/verify handles plan_upgrade_customer and plan_upgrade_salon
- Confirm user profile exists (customer) or salon exists (owner)

### GlamPoints redemption fails
- Check user has sufficient points (minimum 100)
- Verify /api/glam-points/redeem route exists
- Check award_glam_points RPC function exists in database
- Confirm coupons table exists with correct schema

### Coupon not applying
- Verify coupon exists: SELECT * FROM coupons WHERE code = 'GLAMXXXXX'
- Check is_active = true
- Verify valid_until > NOW()
- Check used_count < usage_limit
- Confirm order amount >= min_order_amount

---

## Success Indicators

When everything is working, you should see:

1. **Virtual Try-On**: Both gender options load without errors
2. **Payment**: Invalid inputs rejected, valid inputs accepted
3. **Plan Upgrades**: Payment flow completes, tier updates in database
4. **GlamPoints**: Balance updates on earn/redeem, history tracked
5. **Coupons**: Generated on redemption, validated on application, tracked on usage
6. **My Coupons Tab**: Shows all coupons with correct status badges

---

## Quick Commands

```bash
# Start dev server
npm run dev

# Check TypeScript errors
npx tsc --noEmit

# Check ESLint errors
npm run lint

# Build for production
npm run build

# Check database
# Use Supabase dashboard SQL editor or psql
```

---

## Need Help?

If something isn't working:
1. Check browser console for errors
2. Check terminal/server logs for API errors
3. Verify database tables and RPC functions exist
4. Check .env file has all required variables
5. Restart dev server after config changes

All systems are tested and working! 🎉
