# API Endpoints Reference 📚

## GlamPoints & Rewards System

### 1. Get GlamPoints Balance & History
```http
GET /api/glam-points
Authorization: Required (cookie-based auth)

Response:
{
  "balance": 1500,
  "tier": "premium",
  "totalSpent": 5000,
  "history": [
    {
      "id": "uuid",
      "points": 100,
      "type": "earned",
      "description": "Earned from booking ABC123",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "rupeesValue": 150,
  "pointsToNextTier": 500,
  "nextTier": "vip"
}
```

### 2. Redeem GlamPoints for Coupon
```http
POST /api/glam-points/redeem
Authorization: Required
Content-Type: application/json

Body:
{
  "points": 500,
  "rewardId": "r1"
}

Response:
{
  "success": true,
  "pointsRedeemed": 500,
  "rupeesValue": 50,
  "newBalance": 1000,
  "coupon": {
    "code": "GLAM5F3A2B",
    "discountAmount": 50,
    "validUntil": "2024-02-15T10:30:00Z",
    "minOrderAmount": 0
  },
  "message": "✅ Redeemed 500 GlamPoints for ₹50 coupon!"
}
```

### 3. Get My Redeemed Coupons
```http
GET /api/glam-points/redeem
Authorization: Required

Response:
{
  "coupons": [
    {
      "id": "uuid",
      "code": "GLAM5F3A2B",
      "discount_type": "fixed",
      "discount_value": 50,
      "min_order_amount": 0,
      "max_discount_amount": 50,
      "usage_limit": 1,
      "used_count": 0,
      "is_active": true,
      "valid_from": "2024-01-15T10:30:00Z",
      "valid_until": "2024-02-15T10:30:00Z",
      "created_by": "user-uuid",
      "description": "Redeemed from 500 GlamPoints"
    }
  ]
}
```

---

## Coupon Management

### 4. Validate Coupon Code
```http
POST /api/bookings/validate-coupon
Authorization: Required
Content-Type: application/json

Body:
{
  "code": "GLAM5F3A2B",
  "amount": 1000
}

Success Response:
{
  "coupon": {
    "id": "uuid",
    "code": "GLAM5F3A2B",
    "discount_type": "fixed",
    "discount_value": 50,
    "max_discount_amount": 50,
    "min_order_amount": 0
  },
  "message": "Coupon applied successfully!"
}

Error Responses:
- 404: { "error": "Invalid or inactive coupon code" }
- 400: { "error": "Coupon has expired" }
- 400: { "error": "Coupon usage limit reached" }
- 400: { "error": "Minimum order amount of ₹500 required" }
```

### 5. Get Available Offers
```http
GET /api/offers

Response:
{
  "offers": [
    {
      "id": "uuid",
      "code": "FIRST15",
      "discount_type": "percentage",
      "discount_value": 15,
      "min_order_amount": 500,
      "is_active": true,
      "valid_until": "2024-12-31T23:59:59Z"
    }
  ]
}
```

---

## Plan Management

### 6. Get Customer Plans
```http
GET /api/customer/plan
Authorization: Required

Response:
{
  "current": {
    "name": "Basic",
    "price": 0,
    "tier": "basic",
    "pointsMultiplier": 1,
    "birthdayDiscount": 5,
    "perks": ["1 pt per ₹100 spent", "Birthday discount 5%"]
  },
  "plans": [/* all plans */],
  "glamPoints": 1500,
  "membershipExpiresAt": "2024-06-15T00:00:00Z"
}
```

### 7. Initiate Customer Plan Upgrade
```http
POST /api/customer/plan
Authorization: Required
Content-Type: application/json

Body:
{
  "tier": "premium"
}

Response:
{
  "orderId": "order_1234567890_abc123",
  "amount": 499,
  "currency": "INR",
  "upiId": "7507075722@mbk",
  "planName": "Premium",
  "planPrice": 499,
  "message": "Payment order created. Complete payment to upgrade."
}
```

### 8. Get Salon Owner Plans
```http
GET /api/salon-owner/plan
Authorization: Required (salon owner)

Response:
{
  "current": {
    "name": "Free",
    "price": 0,
    "tier": "free",
    "services": 5,
    "staff": 3,
    "analytics": "basic"
  },
  "plans": [/* all plans */],
  "usage": {
    "services": 3,
    "staff": 2
  },
  "planExpiresAt": null
}
```

### 9. Initiate Salon Plan Upgrade
```http
POST /api/salon-owner/plan
Authorization: Required (salon owner)
Content-Type: application/json

Body:
{
  "tier": "premium"
}

Response:
{
  "orderId": "order_1234567890_xyz789",
  "amount": 999,
  "currency": "INR",
  "upiId": "7507075722@mbk",
  "planName": "Premium",
  "planPrice": 999,
  "message": "Payment order created. Complete payment to upgrade."
}
```

---

## Payment Processing

### 10. Create Payment Order
```http
POST /api/payment/create-order
Authorization: Required
Content-Type: application/json

Body (Booking):
{
  "amount": 1000,
  "type": "booking",
  "metadata": {
    "bookingId": "BKG-123456",
    "salonName": "Salon Name",
    "serviceName": "Haircut"
  }
}

Body (Customer Plan Upgrade):
{
  "amount": 499,
  "type": "plan_upgrade_customer",
  "metadata": {
    "tier": "premium",
    "tierName": "Premium"
  }
}

Body (Salon Plan Upgrade):
{
  "amount": 999,
  "type": "plan_upgrade_salon",
  "metadata": {
    "tier": "premium",
    "tierName": "Premium",
    "salonId": "uuid"
  }
}

Response:
{
  "orderId": "order_1234567890_abc123",
  "amount": 1000,
  "currency": "INR",
  "upiId": "7507075722@mbk",
  "upiName": "Mumbai GlamHub",
  "razorpayKey": "",
  "razorpayOrderId": "order_1234567890_abc123"
}
```

### 11. Verify Payment
```http
POST /api/payment/verify
Authorization: Required
Content-Type: application/json

Body (UPI Payment):
{
  "orderId": "order_1234567890_abc123",
  "paymentId": "123456789012",
  "paymentMethod": "upi",
  "transactionId": "123456789012",
  "utrNumber": "123456789012",
  "metadata": {/* from create-order */}
}

Body (Razorpay):
{
  "orderId": "order_1234567890_abc123",
  "razorpay_payment_id": "pay_xyz789",
  "razorpay_order_id": "order_1234567890_abc123",
  "razorpay_signature": "signature_hash",
  "paymentMethod": "card",
  "metadata": {/* from create-order */}
}

Response (Booking):
{
  "success": true,
  "message": "Booking confirmed successfully",
  "pointsEarned": 100,
  "bookingId": "BKG-123456"
}

Response (Plan Upgrade):
{
  "success": true,
  "message": "Membership upgraded to premium",
  "tier": "premium",
  "expiresAt": "2024-02-15T00:00:00Z"
}
```

---

## Bookings

### 12. Create Booking
```http
POST /api/bookings
Authorization: Required
Content-Type: application/json

Body:
{
  "salonId": "uuid",
  "serviceId": "uuid",
  "staffId": "uuid",
  "date": "2024-01-20",
  "timeSlot": "10:00 AM",
  "couponCode": "GLAM5F3A2B",
  "paymentMethod": "upi",
  "paymentStatus": "paid",
  "paymentId": "pay_xyz789"
}

Response:
{
  "booking": {
    "id": "uuid",
    "booking_id": "BKG-123456",
    "user_id": "uuid",
    "salon_id": "uuid",
    "service_id": "uuid",
    "booking_date": "2024-01-20",
    "time_slot": "10:00 AM",
    "status": "confirmed",
    "total_amount": 1000,
    "discount_amount": 50,
    "final_amount": 950,
    "coupon_code": "GLAM5F3A2B",
    "payment_status": "paid",
    "payment_method": "upi"
  },
  "message": "Booking confirmed!"
}
```

### 13. Get User Bookings
```http
GET /api/bookings?status=confirmed&limit=20
Authorization: Required

Response:
{
  "bookings": [
    {
      "id": "uuid",
      "booking_id": "BKG-123456",
      "booking_date": "2024-01-20",
      "time_slot": "10:00 AM",
      "status": "confirmed",
      "final_amount": 950,
      "glam_points_earned": 95,
      "salon": {
        "name": "Salon Name",
        "slug": "salon-name"
      },
      "service": {
        "name": "Haircut",
        "category": "Hair"
      },
      "staff": {
        "name": "John Doe",
        "role": "Senior Stylist"
      }
    }
  ]
}
```

---

## Error Responses

All endpoints follow this error format:

```json
{
  "error": "Error message describing what went wrong"
}
```

Common HTTP Status Codes:
- **200**: Success
- **201**: Created (successful booking/coupon creation)
- **400**: Bad Request (validation error, invalid input)
- **401**: Unauthorized (not logged in)
- **403**: Forbidden (insufficient permissions)
- **404**: Not Found (resource doesn't exist)
- **409**: Conflict (time slot taken)
- **500**: Internal Server Error

---

## Authentication

All protected endpoints require authentication via HTTP-only cookies set by Supabase Auth.

To test with cURL:
```bash
# Login first to get cookies
curl -X POST https://your-domain.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}' \
  -c cookies.txt

# Use cookies in subsequent requests
curl -X GET https://your-domain.com/api/glam-points \
  -b cookies.txt
```

---

## Rate Limiting

No rate limiting is currently implemented, but consider adding:
- Max 100 requests per minute per user
- Max 10 redemptions per hour per user
- Max 5 payment verifications per minute per user

---

## Validation Library Reference

```typescript
import { 
  validateUpiId, 
  validateTransactionId, 
  validateCardNumber, 
  validatePhoneNumber 
} from "@/lib/payment/validation";

// UPI ID validation
const result = validateUpiId("9876543210@paytm");
// { valid: true }

// Invalid UPI
const result = validateUpiId("test@fakbank");
// { valid: false, error: "Unrecognized bank handle" }

// Transaction ID validation
const result = validateTransactionId("123456789012");
// { valid: true }

// Invalid transaction
const result = validateTransactionId("123");
// { valid: false, error: "Transaction ID must be exactly 12 digits" }
```

---

## Database Functions (RPC)

### award_glam_points
```sql
SELECT award_glam_points(
  p_user_id := 'user-uuid',
  p_points := 100,
  p_type := 'earned',
  p_description := 'Earned from booking',
  p_booking_id := 'booking-uuid'
);
```

### increment_total_spent
```sql
SELECT increment_total_spent(
  p_user_id := 'user-uuid',
  p_amount := 1000
);
```

---

## Testing with Postman/Insomnia

1. Import this collection structure
2. Set base URL: `http://localhost:3000` or your production domain
3. Login first to get session cookies
4. All subsequent requests will use stored cookies automatically

---

## Webhook Events (Future)

Consider implementing webhooks for:
- `glampoints.redeemed` - User redeems points
- `coupon.created` - New coupon generated
- `coupon.used` - Coupon applied to booking
- `plan.upgraded` - User/salon upgrades plan
- `booking.confirmed` - New booking created

---

This completes the API reference for all payment, rewards, and plan management endpoints! 🎉
