# 🔐 Route Protection & Authentication Guide

Complete guide to route guarding and authentication in the CuraStyl platform.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Route Types](#route-types)
3. [Middleware Protection](#middleware-protection)
4. [API Route Protection](#api-route-protection)
5. [Client Component Protection](#client-component-protection)
6. [Usage Examples](#usage-examples)
7. [Testing Authentication](#testing-authentication)

---

## 🎯 Overview

The platform uses a **3-layer security model**:

1. **Middleware** - Server-side route protection (Next.js middleware)
2. **API Guards** - Reusable auth helpers for API routes
3. **Client Guards** - React components for client-side protection

### User Roles

- **`customer`** - Regular users who book appointments
- **`salon_owner`** - Salon owners managing their business
- **`admin`** - Platform administrators with full access

---

## 🗺️ Route Types

### ✅ Public Routes (No Auth Required)

```
/                    - Home page
/landing             - Landing page
/salons              - Browse salons (list & detail pages)
/salons/[slug]       - Individual salon pages
/offers              - View offers
/debug-auth          - Debug authentication (dev only)
```

### 🔓 Auth Routes (Redirect if Logged In)

```
/auth/login          - Login page
/auth/register       - Registration page
/auth/salon-owner-login  - Salon owner login
/auth/forgot-password    - Password recovery
/auth/reset-password     - Reset password
```

### 🔒 Protected Routes (Requires Auth)

```
/dashboard           - User dashboard
/profile             - User profile
/checkout            - Booking checkout
/rewards             - GlamPoints & rewards
/ai-assistant        - AI chat assistant
/virtual-tryon       - Virtual try-on feature
/upgrade             - Plan upgrades
```

### 👔 Salon Owner Routes (Requires `salon_owner` or `admin`)

```
/salon-owner/dashboard   - Salon management dashboard
/salon-owner/register    - Register new salon
```

### 👑 Admin Routes (Requires `admin`)

```
/admin               - Admin dashboard
/admin/*             - All admin pages
```

### 🔌 API Route Protection

#### Public APIs (No Auth)
```
GET  /api/salons                    - List salons
GET  /api/salons/[id]               - Salon details
GET  /api/salons/[id]/slots         - Available time slots
GET  /api/salons/[id]/services      - Salon services
GET  /api/offers                    - Browse offers
GET  /api/reviews                   - Read reviews
GET  /api/ai/gemini-status          - Check API status
```

#### Authenticated APIs (Any User)
```
GET    /api/bookings                - User's bookings
POST   /api/bookings                - Create booking
PATCH  /api/bookings/[id]           - Update booking
GET    /api/favorites               - User favorites
POST   /api/favorites               - Toggle favorite
GET    /api/glam-points             - Points balance
POST   /api/glam-points/redeem      - Redeem points
GET    /api/notifications           - User notifications
PATCH  /api/notifications           - Mark as read
POST   /api/reviews                 - Submit review
PATCH  /api/reviews                 - Helpful vote
POST   /api/payment/create-order    - Create payment
POST   /api/payment/verify          - Verify payment
GET    /api/customer/plan           - Customer plan
POST   /api/customer/plan           - Upgrade plan
POST   /api/ai/chat                 - AI chat
POST   /api/ai/generate-image       - Generate images
POST   /api/ai/image-analyze        - Analyze images
```

#### Salon Owner APIs (Requires `salon_owner` or `admin`)
```
GET    /api/salon-owner/salon       - Owner's salon data
PATCH  /api/salon-owner/salon       - Update salon
GET    /api/salon-owner/services    - Manage services
POST   /api/salon-owner/services    - Add service
PATCH  /api/salon-owner/services    - Edit service
DELETE /api/salon-owner/services    - Delete service
GET    /api/salon-owner/staff       - Manage staff
POST   /api/salon-owner/staff       - Add staff
PATCH  /api/salon-owner/staff       - Edit staff
DELETE /api/salon-owner/staff       - Delete staff
GET    /api/salon-owner/reviews     - Salon reviews
GET    /api/salon-owner/plan        - Salon plan
POST   /api/salon-owner/plan        - Upgrade salon plan
GET    /api/salons/[id]/bookings    - Salon bookings
PATCH  /api/salons/[id]/bookings    - Update booking status
POST   /api/salons/[id]/staff       - Salon-specific staff ops
DELETE /api/salons/[id]/staff       - Remove staff
POST   /api/salons/[id]/services    - Salon-specific service ops
PUT    /api/salons/[id]/services    - Update service
DELETE /api/salons/[id]/services    - Delete service
POST   /api/bookings/[id]/verify-qr - Verify customer QR code
```

#### Admin APIs (Requires `admin`)
```
GET    /api/admin/users             - List all users
PATCH  /api/admin/users             - Update user roles
GET    /api/admin/salons            - Manage salons
POST   /api/admin/salons            - Approve salons
PATCH  /api/admin/salons            - Update salons
DELETE /api/admin/salons            - Delete salons
GET    /api/admin/reviews           - Moderate reviews
DELETE /api/admin/reviews           - Delete reviews
```

#### Internal/System APIs (Special Auth)
```
GET    /api/cron/booking-reminders  - Cron job (requires CRON_SECRET)
```

---

## 🛡️ Middleware Protection

The middleware (`middleware.ts`) runs on **every request** and handles:

1. **Authentication check** - Verifies JWT token
2. **Route classification** - Determines access requirements
3. **Role verification** - Checks user role from database
4. **Redirects** - Sends users to appropriate pages

### How It Works

```typescript
// 1. Check if user is authenticated
const { data: { user } } = await supabase.auth.getUser();

// 2. Classify the route
const isPublic = PUBLIC_ROUTES.some(r => pathname.startsWith(r));
const isProtected = PROTECTED_ROUTES.some(r => pathname.startsWith(r));
const isOwnerRoute = OWNER_ROUTES.some(r => pathname.startsWith(r));
const isAdminRoute = ADMIN_ROUTES.some(r => pathname.startsWith(r));

// 3. Apply protection logic
if (!user && isProtected) {
  redirect("/auth/login?next=" + pathname);
}

if (user && isOwnerRoute) {
  // Check role from database
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
    
  if (!["salon_owner", "admin"].includes(profile?.role)) {
    redirect("/?error=access_denied");
  }
}
```

### Middleware Runs On

✅ All routes **except**:
- Static files (`_next/static`)
- Images (`_next/image`)
- Favicon
- Media files (`.svg`, `.png`, `.jpg`, etc.)

---

## 🔧 API Route Protection

Use the **reusable guards** from `src/lib/auth/route-guards.ts`:

### Basic Auth (Any User)

```typescript
import { withAuth } from "@/lib/auth/route-guards";

export const GET = withAuth(async (req, { user, supabase }) => {
  // user is guaranteed to exist here
  const { data } = await supabase
    .from("bookings")
    .select("*")
    .eq("user_id", user.id);
    
  return NextResponse.json({ data });
});
```

### Role-Based Auth

```typescript
import { withRole } from "@/lib/auth/route-guards";

// Require specific role
export const POST = withRole("salon_owner", async (req, { user, supabase }) => {
  // Only salon_owner can access
  return NextResponse.json({ success: true });
});

// Allow multiple roles
export const PATCH = withRole(["salon_owner", "admin"], async (req, { user, supabase }) => {
  // salon_owner OR admin can access
  return NextResponse.json({ role: user.role });
});
```

### Admin-Only Routes

```typescript
import { withAdmin } from "@/lib/auth/route-guards";

export const DELETE = withAdmin(async (req, { user, supabase }) => {
  // Only admin can access
  return NextResponse.json({ deleted: true });
});
```

### Salon Owner Routes

```typescript
import { withSalonOwner } from "@/lib/auth/route-guards";

export const GET = withSalonOwner(async (req, { user, supabase }) => {
  // salon_owner or admin can access
  return NextResponse.json({ salon: data });
});
```

### Manual Auth Check

```typescript
import { requireAuth, requireRole, authErrorResponse } from "@/lib/auth/route-guards";

export async function POST(req: NextRequest) {
  // Manual auth check
  const authResult = await requireAuth();
  
  if (!authResult.user) {
    return authErrorResponse(authResult);
  }
  
  const { user, supabase } = authResult;
  
  // Continue with logic...
}
```

### Ownership Verification

```typescript
import { verifySalonOwnership, forbiddenResponse } from "@/lib/auth/route-guards";

export const PATCH = withAuth(async (req, { user, supabase, params }) => {
  const salonId = params.id;
  
  // Check if user owns this salon
  const isOwner = await verifySalonOwnership(supabase, user.id, salonId);
  
  if (!isOwner) {
    return forbiddenResponse("You don't own this salon");
  }
  
  // Proceed with update...
});
```

---

## ⚛️ Client Component Protection

Use `RouteGuard` component for client-side protection:

### Basic Usage

```typescript
import RouteGuard from "@/components/auth/RouteGuard";

export default function DashboardPage() {
  return (
    <RouteGuard requireAuth>
      <DashboardContent />
    </RouteGuard>
  );
}
```

### Role-Based Protection

```typescript
<RouteGuard requiredRole="admin">
  <AdminPanel />
</RouteGuard>

<RouteGuard requiredRole={["salon_owner", "admin"]}>
  <SalonManagement />
</RouteGuard>
```

### Custom Fallback

```typescript
<RouteGuard 
  requireAuth 
  fallback={<CustomLoadingScreen />}
>
  <ProtectedContent />
</RouteGuard>
```

### HOC Pattern

```typescript
import { withRouteGuard } from "@/components/auth/RouteGuard";

function AdminDashboard() {
  return <div>Admin Panel</div>;
}

export default withRouteGuard(AdminDashboard, { 
  requiredRole: "admin" 
});
```

---

## 📝 Usage Examples

### Example 1: Protected Customer Dashboard

```typescript
// src/app/(main)/dashboard/page.tsx
import RouteGuard from "@/components/auth/RouteGuard";
import DashboardClient from "./DashboardClient";

export default function DashboardPage() {
  return (
    <RouteGuard requireAuth>
      <DashboardClient />
    </RouteGuard>
  );
}
```

### Example 2: Protected Booking API

```typescript
// src/app/api/bookings/route.ts
import { withAuth } from "@/lib/auth/route-guards";
import { NextResponse } from "next/server";

export const GET = withAuth(async (req, { user, supabase }) => {
  const { data: bookings } = await supabase
    .from("bookings")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ bookings });
});

export const POST = withAuth(async (req, { user, supabase }) => {
  const body = await req.json();
  
  const { data: booking, error } = await supabase
    .from("bookings")
    .insert({ ...body, user_id: user.id })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ booking }, { status: 201 });
});
```

### Example 3: Admin User Management

```typescript
// src/app/api/admin/users/route.ts
import { withAdmin } from "@/lib/auth/route-guards";
import { NextResponse } from "next/server";

export const GET = withAdmin(async (req, { supabase }) => {
  const { data: users } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  return NextResponse.json({ users });
});

export const PATCH = withAdmin(async (req, { supabase }) => {
  const { userId, role } = await req.json();
  
  const { data: user, error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ user });
});
```

### Example 4: Salon Owner Dashboard

```typescript
// src/app/(main)/salon-owner/dashboard/page.tsx
import RouteGuard from "@/components/auth/RouteGuard";
import SalonOwnerDashboard from "./SalonOwnerDashboard";

export default function SalonOwnerPage() {
  return (
    <RouteGuard requiredRole={["salon_owner", "admin"]}>
      <SalonOwnerDashboard />
    </RouteGuard>
  );
}
```

---

## 🧪 Testing Authentication

### Test User Accounts

Create test users with different roles:

```sql
-- Customer
INSERT INTO profiles (id, role, full_name, email)
VALUES ('user-id-1', 'customer', 'Test Customer', 'customer@test.com');

-- Salon Owner
INSERT INTO profiles (id, role, full_name, email)
VALUES ('user-id-2', 'salon_owner', 'Test Owner', 'owner@test.com');

-- Admin
INSERT INTO profiles (id, role, full_name, email)
VALUES ('user-id-3', 'admin', 'Test Admin', 'admin@test.com');
```

### Testing Checklist

- [ ] **Public routes** accessible without login
- [ ] **Auth routes** redirect logged-in users away
- [ ] **Protected routes** redirect to login when not authenticated
- [ ] **Dashboard** accessible only to authenticated users
- [ ] **Salon owner routes** blocked for customers
- [ ] **Admin routes** blocked for non-admins
- [ ] **API endpoints** return 401 for unauthenticated requests
- [ ] **API endpoints** return 403 for unauthorized roles
- [ ] **Role changes** in database immediately affect access
- [ ] **Logout** clears session and redirects properly

### Manual Testing

```bash
# Test unauthenticated access
curl http://localhost:3000/api/bookings
# Should return 401

# Test with auth (get token from browser)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/bookings
# Should return data

# Test admin route as customer
curl -H "Authorization: Bearer CUSTOMER_TOKEN" http://localhost:3000/api/admin/users
# Should return 403
```

---

## 🚨 Security Best Practices

1. **Always use `getUser()` not `getSession()`** on the server
2. **Verify roles from database**, not from JWT claims
3. **Check ownership** for resource-specific operations
4. **Use middleware** for page routes
5. **Use guards** for API routes
6. **Never trust client-side** role checks alone
7. **Log security events** for monitoring
8. **Rate limit** sensitive endpoints
9. **Validate input** on all API routes
10. **Use HTTPS** in production

---

## 📚 File Reference

- **Middleware**: `middleware.ts`
- **API Guards**: `src/lib/auth/route-guards.ts`
- **Client Guard**: `src/components/auth/RouteGuard.tsx`
- **Supabase Client**: `src/lib/supabase/server.ts`

---

## ✅ Implementation Status

### ✅ Completed

- [x] Middleware route protection
- [x] API route guard helpers
- [x] Client-side RouteGuard component
- [x] Role-based access control
- [x] Ownership verification helpers
- [x] Public/Protected/Auth route classification
- [x] Comprehensive documentation

### 🎯 Next Steps

- [ ] Refactor existing API routes to use guards
- [ ] Add rate limiting to sensitive endpoints
- [ ] Implement audit logging for admin actions
- [ ] Add 2FA for admin accounts
- [ ] Set up session management policies

---

**Last Updated**: December 2024
**Maintained By**: CuraStyl Development Team
