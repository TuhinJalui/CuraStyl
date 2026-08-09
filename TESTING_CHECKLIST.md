# ✅ Testing Checklist - Mumbai GlamHub

**Date**: June 24, 2026  
**Server**: http://localhost:3001 (Running on port 3001)  
**Status**: Ready for Testing

---

## 🎯 Quick Start

### 1. Ensure Server is Running
```bash
# Check if server is running
# Should see: ✓ Ready in 1764ms

# If not running:
npm run dev
```

### 2. Open Browser
```
URL: http://localhost:3001
```

---

## 📋 Test Scenarios

### ✅ TEST 1: AI Chat Layout (PRIORITY)

**Objective**: Verify AI messages are yellow/left, user messages are green/right

**Steps**:
1. Go to: `http://localhost:3001/ai-assistant`
2. Type: `"Show me men's hairstyles"`
3. Press Enter

**Expected Results**:
- ✅ AI message appears on the **LEFT side**
- ✅ AI avatar is **YELLOW/AMBER** gradient
- ✅ AI message bubble has **AMBER border**
- ✅ Message spans from left edge

4. Type: `"Thanks!"`
5. Press Enter

**Expected Results**:
- ✅ User message appears on the **RIGHT side**
- ✅ User avatar is **GREEN/EMERALD** gradient
- ✅ User message bubble has **GREEN gradient**
- ✅ Message aligns to right edge

---

### ✅ TEST 2: Smart Image Search

**Objective**: Verify DuckDuckGo image search with smart keywords

**Test Case 1: Variety Query**
```
Input: "Different types of women's hairstyles"

Expected:
- ✅ Should return 10 images (variety query)
- ✅ Large 400x400px carousel
- ✅ Navigation: ← Prev | 1/10 | Next →
- ✅ Diverse hairstyle types
```

**Test Case 2: Targeted Query**
```
Input: "Best curly hairstyles for round face"

Expected:
- ✅ Should return 8 images (best query)
- ✅ Images show curly hair specifically
- ✅ Suitable for round face shapes
- ✅ High-quality images only
```

**Test Case 3: Specific Style**
```
Input: "Short bob haircut"

Expected:
- ✅ Should return 6 images (standard query)
- ✅ All images show bob hairstyles
- ✅ Short length variations
- ✅ Clear image titles
```

**Test Case 4: Gender Detection**
```
Input: "Men's fade styles"

Expected:
- ✅ Detects "men" keyword
- ✅ Returns men-specific images
- ✅ Fade haircut variations
- ✅ No women's hairstyles
```

---

### ✅ TEST 3: Salon Plan Upgrade

**Objective**: Verify salon owner can upgrade plan with UPI payment

**Prerequisites**:
- Login as salon owner: `username="tapumax"`

**Steps**:
1. Go to: `http://localhost:3001/salon-owner/dashboard?tab=my-plan`
2. Scroll to plan cards
3. Click: **"Upgrade to Premium"** (₹999 button)

**Expected Results**:
- ✅ Payment modal opens
- ✅ Modal title: "Upgrade to Premium"
- ✅ Shows total amount: **₹999**
- ✅ Shows order ID (format: ORD_xxxxx)
- ✅ UPI and QR Code payment options visible
- ✅ Merchant UPI ID: `7507075722@mbk`

4. Select **"UPI"** payment method
5. Click: **"Pay with UPI App"**

**Expected Results**:
- ✅ Shows Google Pay, PhonePe, Paytm buttons
- ✅ Clicking opens respective UPI app (if installed)

6. Enter UPI ID (optional): `test@paytm`
7. Enter Transaction ID: `123456789012` (mock 12-digit)
8. Click: **"Verify Payment"**

**Expected Results**:
- ✅ Button shows "Verifying..." with spinner
- ✅ Success or appropriate error message
- ✅ Modal closes on success
- ✅ Plan status updates

**Validation Tests**:
```
Invalid UPI ID: "wrongformat"
Expected: ❌ "Invalid UPI ID format" error

Invalid UTR: "12345"
Expected: ❌ "Must be exactly 12 digits" error

Valid UTR: "123456789012"
Expected: ✅ Proceeds with verification
```

---

### ✅ TEST 4: Customer Plan Upgrade

**Objective**: Verify customer can upgrade membership

**Steps**:
1. Go to: `http://localhost:3001/upgrade`
2. View plan cards (Free, Premium, VIP)
3. Click: **"Upgrade to Premium"** (₹499)

**Expected Results**:
- ✅ Payment modal opens
- ✅ Shows ₹499 amount
- ✅ UPI payment form displayed
- ✅ Can enter transaction ID

4. Complete payment flow
5. On success:

**Expected Results**:
- ✅ Success message: "Payment verified successfully! 🎉"
- ✅ Redirects to `/rewards` page
- ✅ Membership tier updated to Premium
- ✅ Expiry date set (30 days from now)

---

### ✅ TEST 5: Booking Payment Flow

**Objective**: Verify booking payments work (UPI & Cash)

**Test Case 1: UPI Payment**
1. Go to any salon page (e.g., Tapu Salon)
2. Select a service
3. Choose date and time slot
4. Click "Book Appointment"
5. At checkout, select **"UPI"** payment method
6. Enter transaction ID
7. Complete booking

**Expected Results**:
- ✅ Booking status: "confirmed"
- ✅ Payment status: "paid"
- ✅ GlamPoints awarded immediately
- ✅ Confirmation email/notification sent

**Test Case 2: Cash-in-Hand**
1. Follow steps 1-4 above
2. At checkout, select **"Cash-in-Hand"**
3. Complete booking

**Expected Results**:
- ✅ Booking status: "confirmed"
- ✅ Payment status: "pending"
- ✅ QR code generated for verification
- ✅ GlamPoints awarded after QR scan

---

### ✅ TEST 6: QR Code Verification (Salon Dashboard)

**Objective**: Verify salon owner can scan QR to confirm cash payment

**Steps**:
1. Login as salon owner
2. Go to: `http://localhost:3001/salon-owner/dashboard?tab=scan-qr`
3. Click: **"Scan QR Code"**
4. Allow camera access
5. Scan customer's booking QR code

**Expected Results**:
- ✅ QR scanner opens
- ✅ Successfully reads booking ID
- ✅ Booking status updates to "completed"
- ✅ Payment status updates to "paid"
- ✅ GlamPoints awarded to customer
- ✅ Customer receives notification

---

### ✅ TEST 7: Payment Validation

**Objective**: Verify all validation rules work correctly

**UPI ID Validation**:
```
Valid Formats:
✅ john@paytm
✅ 9876543210@ybl
✅ myname@oksbi
✅ user123@axisbank

Invalid Formats:
❌ john (no @)
❌ @paytm (no username)
❌ john@ (no bank code)
❌ john@invalid (unknown bank)
```

**Transaction ID Validation**:
```
Valid Formats:
✅ 123456789012 (exactly 12 digits)
✅ 987654321098

Invalid Formats:
❌ 12345 (too short)
❌ 1234567890123 (too long)
❌ ABC123456789 (contains letters)
❌ 12345-67890 (contains special chars)
```

---

### ✅ TEST 8: Responsive Design

**Objective**: Verify layout works on all screen sizes

**Desktop (> 1024px)**:
- ✅ Sidebar visible
- ✅ Full-width messages
- ✅ Large image carousel
- ✅ All features accessible

**Tablet (768px - 1024px)**:
- ✅ Collapsible sidebar
- ✅ Messages adapt to width
- ✅ Images scale appropriately
- ✅ Touch-friendly buttons

**Mobile (< 768px)**:
- ✅ Hamburger menu
- ✅ Full-width messages
- ✅ Single column layout
- ✅ Touch-optimized carousel
- ✅ Large tap targets

**Test on**:
- Chrome DevTools (Device Emulation)
- iPhone 14 Pro (390x844)
- Samsung Galaxy S23 (360x800)
- iPad Pro (1024x1366)

---

### ✅ TEST 9: Error Handling

**Objective**: Verify error messages are helpful and clear

**Network Errors**:
```
Simulate: Disconnect internet
Expected: "Failed to connect. Check your internet connection."
```

**Invalid Payment**:
```
Input: Wrong transaction ID format
Expected: Clear error with format example
```

**Expired Session**:
```
Simulate: Clear cookies and try to book
Expected: Redirect to login with message
```

**Database Errors**:
```
Simulate: Invalid data submission
Expected: User-friendly error (not technical stack trace)
```

---

### ✅ TEST 10: Performance

**Objective**: Verify fast loading and smooth animations

**Page Load Times**:
```
Homepage: < 2 seconds
AI Assistant: < 2 seconds
Salon Pages: < 2.5 seconds
Payment Modal: Instant
```

**Image Loading**:
```
First Image: < 1 second
Carousel Navigation: Instant
No layout shift: ✅
```

**Animations**:
```
Modal Open/Close: Smooth (300ms)
Button Hover: Instant
Message Appear: Smooth fade-in
Carousel Transition: Smooth (400ms)
```

---

## 🔴 Critical Issues to Check

### Priority 1 (Must Fix Before Launch):
- [ ] SQL migration runs successfully in Supabase
- [ ] All payment flows work end-to-end
- [ ] No console errors in browser
- [ ] Mobile layout doesn't break

### Priority 2 (Should Fix Soon):
- [ ] Image loading times optimized
- [ ] Payment verification works with real bank data
- [ ] Email notifications sent correctly
- [ ] GlamPoints calculation accurate

### Priority 3 (Nice to Have):
- [ ] Better error messages
- [ ] Loading states for all async operations
- [ ] Offline support (show cached data)
- [ ] PWA features (install prompt)

---

## 🛠️ Debugging Tools

### Browser Console Commands:
```javascript
// Check current auth status
console.log(JSON.parse(localStorage.getItem('auth_data')))

// Check Gemini API status
fetch('/api/ai/gemini-status').then(r => r.json()).then(console.log)

// Check payment configuration
console.log(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID)

// Clear localStorage (logout)
localStorage.clear()

// Check session storage
console.log(Object.keys(sessionStorage))
```

### Network Tab Monitoring:
```
Filter: XHR/Fetch
Watch for:
- /api/ai/chat (AI responses)
- /api/payment/verify (payment verification)
- /api/bookings (booking creation)
- Status codes (200 = OK, 401 = Unauthorized, 500 = Server Error)
```

---

## 📊 Success Criteria

### All Tests Pass:
- ✅ AI chat layout correct (yellow left, green right)
- ✅ Image search returns relevant results
- ✅ Payment modals open correctly
- ✅ UPI validation works
- ✅ Transaction ID validation works
- ✅ Salon plan upgrades work
- ✅ Customer plan upgrades work
- ✅ Booking payments work (UPI & Cash)
- ✅ QR verification works
- ✅ Responsive on all devices
- ✅ No console errors
- ✅ Fast page loads
- ✅ Smooth animations

### Performance Metrics:
- ✅ Build time: < 120 seconds
- ✅ Page load: < 3 seconds
- ✅ API response: < 1 second
- ✅ Image load: < 2 seconds

---

## 🐛 Known Issues (If Any)

### Current Issues:
*None identified in latest build*

### Previously Fixed:
- ✅ TypeScript error: `today` variable undefined → Fixed
- ✅ PaymentModal type mismatch → Fixed
- ✅ Syntax error at line 1542 → Fixed (structure correct)

---

## 📞 Support & Resources

### Documentation:
- `ALL_FIXES_COMPLETE.md` - Complete implementation details
- `COMPLETE_IMPLEMENTATION_STATUS.md` - Status of all tasks
- `VISUAL_CHANGES_SUMMARY.md` - Visual design changes
- `BOOKING_PAYMENT_SYSTEM.md` - Payment system documentation

### SQL Files (Run in Supabase):
- `supabase/COMPLETE_PAYMENT_FIX.sql` - Main fix (RUN THIS)
- `supabase/FIX_PAYMENTS_TABLE.sql` - Partial fix
- `supabase/FIX_PAYMENTS_STATUS.sql` - Partial fix

### API Endpoints:
```
POST /api/ai/chat - AI responses
POST /api/payment/verify - Payment verification
POST /api/customer/plan - Customer plan upgrade
POST /api/salon-owner/plan - Salon plan upgrade
POST /api/bookings - Create booking
POST /api/bookings/[id]/verify-qr - QR verification
GET  /api/ai/gemini-status - Check AI status
```

---

## ✅ Final Checklist

Before marking complete, verify:

### Code Quality:
- [ ] No TypeScript errors (`npm run build` passes)
- [ ] No console errors in browser
- [ ] All imports resolved
- [ ] No unused variables

### Functionality:
- [ ] All payment flows work
- [ ] AI chat displays correctly
- [ ] Image search returns results
- [ ] Validation catches errors
- [ ] Success messages show

### Design:
- [ ] Colors match specification (yellow/green)
- [ ] Layout responsive on mobile
- [ ] Images load and display
- [ ] Animations smooth
- [ ] Typography consistent

### Performance:
- [ ] Build completes successfully
- [ ] Server starts without errors
- [ ] Pages load quickly
- [ ] No memory leaks

### Documentation:
- [ ] All markdown files created
- [ ] SQL migration files provided
- [ ] Testing steps documented
- [ ] Known issues listed

---

## 🚀 Ready for Launch?

When all tests pass:

1. ✅ Run SQL migration in Supabase
2. ✅ Verify production environment variables
3. ✅ Test on staging environment
4. ✅ Perform security audit
5. ✅ Check HTTPS certificates
6. ✅ Enable error monitoring
7. ✅ Set up backup schedule
8. 🚀 **DEPLOY TO PRODUCTION!**

---

**Testing Started**: _______________  
**Testing Completed**: _______________  
**Tested By**: _______________  
**Status**: ⬜ In Progress / ✅ Passed / ❌ Failed

---

*Last Updated: June 24, 2026*  
*Version: 1.0.0*  
*Build: PASSING ✅*
