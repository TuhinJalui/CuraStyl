# Complete Payment System Implementation Guide

## Overview
This document covers the complete end-to-end payment system implementation for Mumbai GlamHub, including UPI payments, Razorpay integration, and automated payment processing.

## Features Implemented

### 1. **Payment Methods Supported**
- ✅ **UPI Direct Payment** (Primary Method)
  - UPI ID: `7507075722@mbk`
  - Support for Google Pay, PhonePe, Paytm, etc.
  - Manual transaction ID verification
  
- ✅ **Razorpay Gateway** (All Methods)
  - Credit/Debit Cards
  - Net Banking
  - UPI via Razorpay
  - Wallets (Paytm, PhonePe, Amazon Pay)

### 2. **Payment Types**
- **Booking Payments**: When customers book salon services
- **Plan Upgrades**: When salon owners upgrade their subscription plans

### 3. **Automated Processes**
- GlamPoints auto-award on payment (10 points per ₹100)
- Booking confirmation on successful payment
- Plan activation on successful upgrade
- Notification system for payment events
- Payment history tracking

## File Structure

```
src/
├── lib/payment/
│   └── razorpay.ts                    # Payment utility functions
├── components/payment/
│   └── PaymentModal.tsx               # Payment UI component
├── app/api/payment/
│   ├── create-order/route.ts          # Create payment order
│   └── verify/route.ts                # Verify and process payment
supabase/
└── PAYMENTS_MIGRATION.sql             # Database schema
```

## Database Schema

### Payments Table
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  order_id TEXT NOT NULL UNIQUE,
  payment_id TEXT,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'INR',
  status TEXT DEFAULT 'created',
  payment_type TEXT NOT NULL,
  payment_method TEXT,
  razorpay_signature TEXT,
  metadata JSONB DEFAULT '{}',
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Bookings Table Updates
- Added `payment_status` column (pending, paid, failed)
- Added `payment_id` column (stores transaction reference)

## Setup Instructions

### Step 1: Database Migration
Run the SQL migration to create the payments table:

```bash
# Apply to Supabase
psql -h your-supabase-url -d postgres -f supabase/PAYMENTS_MIGRATION.sql
```

Or run in Supabase SQL Editor:
```sql
-- Copy content from PAYMENTS_MIGRATION.sql
```

### Step 2: Environment Variables
Add to your `.env.local`:

```env
# Razorpay (Optional - for card/wallet payments)
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_YOUR_KEY_ID
RAZORPAY_KEY_SECRET=YOUR_KEY_SECRET

# Supabase (Should already exist)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Step 3: Install Dependencies
```bash
npm install
```

## Usage Examples

### 1. Booking Payment Integration

Update your booking component to use the payment modal:

```typescript
import PaymentModal from "@/components/payment/PaymentModal";
import { useState } from "react";

function BookingWidget() {
  const [showPayment, setShowPayment] = useState(false);
  const [bookingData, setBookingData] = useState(null);

  const handleBooking = async () => {
    // Create booking first
    const booking = await createBooking(/* booking details */);
    setBookingData(booking);
    setShowPayment(true);
  };

  const handlePaymentSuccess = (paymentId: string) => {
    // Payment successful, booking confirmed
    toast.success("Booking confirmed!");
    router.push("/dashboard/bookings");
  };

  return (
    <>
      <Button onClick={handleBooking}>Book Now</Button>
      
      {showPayment && bookingData && (
        <PaymentModal
          isOpen={showPayment}
          onClose={() => setShowPayment(false)}
          amount={bookingData.finalAmount}
          type="booking"
          metadata={{
            userName: user.name,
            userEmail: user.email,
            userPhone: user.phone,
            bookingId: bookingData.id,
            salonName: salon.name,
          }}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </>
  );
}
```

### 2. Plan Upgrade Payment Integration

Update salon owner plan upgrade:

```typescript
import PaymentModal from "@/components/payment/PaymentModal";

function PlanUpgradeSection() {
  const [showPayment, setShowPayment] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  const handleUpgrade = (plan: any) => {
    setSelectedPlan(plan);
    setShowPayment(true);
  };

  const handlePaymentSuccess = () => {
    toast.success("Plan upgraded successfully!");
    router.refresh();
  };

  return (
    <>
      <Button onClick={() => handleUpgrade(premiumPlan)}>
        Upgrade to Premium
      </Button>

      {showPayment && selectedPlan && (
        <PaymentModal
          isOpen={showPayment}
          onClose={() => setShowPayment(false)}
          amount={selectedPlan.price}
          type="plan_upgrade"
          metadata={{
            userName: user.name,
            userEmail: user.email,
            salonId: salon.id,
            planName: selectedPlan.name,
          }}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </>
  );
}
```

## Payment Flow

### UPI Payment Flow:
```
1. User clicks "Pay Now"
2. Payment modal opens
3. User selects "UPI Payment"
4. Modal shows UPI ID: 7507075722@mbk
5. User copies UPI ID or clicks "Open UPI App"
6. User makes payment via their UPI app
7. User enters Transaction ID in modal
8. System verifies payment
9. System processes booking/upgrade
10. System awards GlamPoints
11. System sends confirmation notification
12. Payment complete ✅
```

### Razorpay Payment Flow:
```
1. User clicks "Pay Now"
2. Payment modal opens
3. User selects "Card/Wallet/UPI"
4. Razorpay checkout opens
5. User selects payment method
6. User completes payment
7. Razorpay sends callback
8. System verifies signature
9. System processes booking/upgrade
10. System awards GlamPoints
11. System sends confirmation notification
12. Payment complete ✅
```

## GlamPoints Integration

The system automatically awards GlamPoints for all online payments:

**Formula**: 10 points per ₹100 spent

```typescript
// Automatically calculated and awarded
const pointsToAward = Math.floor(amount / 100) * 10;

// Examples:
// ₹500 booking = 50 GlamPoints
// ₹999 plan = 90 GlamPoints  
// ₹2499 plan = 240 GlamPoints
```

## Notification System

Automated notifications are sent for:

1. **Payment Success (Customer)**
   - Title: "Payment Successful!"
   - Message: Booking/Plan confirmation details
   - Link: Dashboard page

2. **Plan Upgrade (Salon Owner)**
   - Title: "{Plan Name} Plan Activated!"
   - Message: Expiry date and features
   - Link: My Plan tab

## Testing

### Test UPI Payment:
1. Use test UPI ID: `7507075722@mbk`
2. Make test payment
3. Use transaction ID: `TEST123456789012` (for testing)
4. Verify payment gets processed

### Test Razorpay Payment:
1. Use Razorpay test mode
2. Test card: `4111 1111 1111 1111`
3. CVV: Any 3 digits
4. Expiry: Any future date
5. OTP: `123456`

## Security Features

✅ **User Authentication**: All payment endpoints require authentication  
✅ **User Authorization**: Users can only pay for their own bookings  
✅ **Payment Verification**: Double verification of transaction IDs  
✅ **Secure Keys**: Razorpay keys stored in environment variables  
✅ **RLS Policies**: Database-level security on payments table  
✅ **Transaction Logging**: All payments logged with full audit trail

## Troubleshooting

### Payment Not Verified
- Check transaction ID is correct (12 digits)
- Ensure payment was made to correct UPI ID
- Check payment amount matches booking amount

### GlamPoints Not Awarded
- Check `award_glam_points` function exists in database
- Run `GLAM_POINTS_MIGRATION.sql` if missing
- Check user profile has `glam_points` column

### Booking Not Confirmed
- Check `payments` table has record
- Verify `payment_status` in bookings table
- Check notification was created

## Next Steps

To complete integration in your existing booking flow:

1. **Update BookingWidget Component**:
   - Import `PaymentModal`
   - Add payment modal state
   - Trigger modal after booking creation
   - Handle payment success callback

2. **Update Plan Upgrade UI**:
   - Add payment modal to each plan card
   - Pass plan details to modal
   - Handle upgrade success

3. **Test End-to-End**:
   - Create test booking
   - Complete payment
   - Verify GlamPoints awarded
   - Check notification received
   - Confirm booking status updated

## Support

For payment-related issues:
- Check browser console for errors
- Verify all environment variables are set
- Check Supabase logs for database errors
- Test with Razorpay test mode first

## Production Checklist

Before going live:
- [ ] Apply database migration to production
- [ ] Set production Razorpay keys
- [ ] Verify UPI ID is correct: `7507075722@mbk`
- [ ] Test real UPI payment
- [ ] Test real card payment (Razorpay)
- [ ] Verify GlamPoints are awarded
- [ ] Test notification delivery
- [ ] Check payment logs and history
- [ ] Set up payment monitoring/alerts
