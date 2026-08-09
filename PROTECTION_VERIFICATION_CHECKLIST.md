# ✅ Route Protection Verification Checklist

Use this checklist to verify that all route protection is working correctly.

---

## 🎯 Quick Test Guide

### 1. Test as Guest (Not Logged In)

#### ✅ Should Work (Public Routes)
- [ ] Visit `/` (home page) - Should load
- [ ] Visit `/salons` - Should load salon list
- [ ] Visit `/salons/[any-slug]` - Should load salon detail
- [ ] Visit `/offers` - Should load offers page
- [ ] Visit `/landing` - Should load landing page

#### 🔐 Should Redirect to Login
- [ ] Visit `/dashboard` → Should redirect to `/auth/login?next=/dashboard`
- [ ] Visit `/profile` → Should redirect to `/auth/login?next=/profile`
- [ ] Visit `/checkout` → Should redirect to `/auth/login?next=/checkout`
- [ ] Visit `/rewards` → Should redirect to `/auth/login?next=/rewards`
- [ ] Visit `/ai-assistant` → Should redirect to `/auth/login?next=/ai-assistant`
- [ ] Visit `/virtual-tryon` → Should redirect to `/auth/login?next=/virtual-tryon`
- [ ] Visit `/upgrade` → Should redirect to `/auth/login?next=/upgrade`
- [ ] Visit `/salon-owner/dashboard` → Should redirect to `/auth/login`
- [ ] Visit `/admin` → Should redirect to `/auth/login`

#### 🔓 Auth Pages Should Load
- [ ] Visit `/auth/login` - Should load login form
- [ ] Visit `/auth/register` - Should load registration form
- [ ] Visit `/auth/salon-owner-login` - Should load owner login
- [ ] Visit `/auth/forgot-password` - Should load password recovery

---

### 2. Test as Customer (Regular User)

**Setup**: Login as user with `role = 'customer'`

#### ✅ Should Work
- [ ] Visit `/` - Should load
- [ ] Visit `/dashboard` - Should load customer dashboard
- [ ] Visit `/profile` - Should load profile page
- [ ] Visit `/checkout` - Should load checkout page
- [ ] Visit `/rewards` - Should load rewards page
- [ ] Visit `/ai-assistant` - Should load AI chat
- [ ] Visit `/virtual-tryon` - Should load virtual try-on
- [ ] Visit `/salons` - Should load salon list
- [ ] Visit `/offers` - Should load offers

#### 🚫 Should Block/Redirect
- [ ] Visit `/salon-owner/dashboard` → Should redirect to `/?error=owner_access_required`
- [ ] Visit `/salon-owner/register` → Should redirect to `/?error=owner_access_required`
- [ ] Visit `/admin` → Should redirect to `/?error=admin_required`

#### 🔓 Auth Pages Should Redirect Away
- [ ] Visit `/auth/login` → Should redirect to `/` (already logged in)
- [ ] Visit `/auth/register` → Should redirect to `/`
- [ ] Visit `/auth/salon-owner-login` → Should redirect to `/`

#### 🔌 API Calls Should Work
```bash
# Get bookings
curl -b cookies.txt http://localhost:3000/api/bookings
# Should return: 200 with bookings data

# Get favorites
curl -b cookies.txt http://localhost:3000/api/favorites
# Should return: 200 with favorites

# Get glam points
curl -b cookies.txt http://localhost:3000/api/glam-points
# Should return: 200 with points balance

# Get notifications
curl -b cookies.txt http://localhost:3000/api/notifications
# Should return: 200 with notifications
```

#### 🚫 API Calls Should Fail
```bash
# Try to access admin users endpoint
curl -b cookies.txt http://localhost:3000/api/admin/users
# Should return: 403 Forbidden

# Try to access salon owner endpoint
curl -b cookies.txt http://localhost:3000/api/salon-owner/salon
# Should return: 403 Forbidden
```

---

### 3. Test as Salon Owner

**Setup**: Login as user with `role = 'salon_owner'`

#### ✅ Should Work
- [ ] Visit `/` - Should load
- [ ] Visit `/profile` - Should load profile (with salon info)
- [ ] Visit `/salon-owner/dashboard` - Should load salon dashboard
- [ ] Visit `/salon-owner/register` - Should load salon registration
- [ ] Visit `/dashboard` - Should load
- [ ] Visit `/salons` - Should load salon list

#### 🚫 Should Block/Redirect
- [ ] Visit `/admin` → Should redirect to `/?error=admin_required`
- [ ] Visit `/rewards` - Should work or redirect (depends on business logic)

#### 🔓 Auth Pages Should Redirect Away
- [ ] Visit `/auth/login` → Should redirect to `/`
- [ ] Visit `/auth/salon-owner-login` → Should redirect to `/`

#### 🔌 API Calls Should Work
```bash
# Get salon data
curl -b cookies.txt http://localhost:3000/api/salon-owner/salon
# Should return: 200 with salon data

# Get salon services
curl -b cookies.txt http://localhost:3000/api/salon-owner/services
# Should return: 200 with services

# Get salon staff
curl -b cookies.txt http://localhost:3000/api/salon-owner/staff
# Should return: 200 with staff

# Get salon bookings
curl -b cookies.txt http://localhost:3000/api/salon-owner/reviews
# Should return: 200 with reviews
```

#### 🚫 API Calls Should Fail
```bash
# Try to access admin endpoint
curl -b cookies.txt http://localhost:3000/api/admin/users
# Should return: 403 Forbidden

# Try to access another salon's data (ownership check)
curl -b cookies.txt http://localhost:3000/api/salons/OTHER_SALON_ID/bookings
# Should return: 403 Forbidden (if not owner)
```

---

### 4. Test as Admin

**Setup**: Login as user with `role = 'admin'`

#### ✅ Should Work (Everything)
- [ ] Visit `/` - Should load
- [ ] Visit `/dashboard` - Should load
- [ ] Visit `/profile` - Should load
- [ ] Visit `/admin` - Should load admin dashboard
- [ ] Visit `/salon-owner/dashboard` - Should load (admin can act as owner)
- [ ] Visit `/salon-owner/register` - Should load
- [ ] Visit `/rewards` - Should load
- [ ] Visit `/ai-assistant` - Should load
- [ ] All public routes should work

#### 🔓 Auth Pages Should Redirect Away
- [ ] Visit `/auth/login` → Should redirect to `/`
- [ ] Visit `/auth/register` → Should redirect to `/`

#### 🔌 API Calls Should Work (All)
```bash
# Admin endpoints
curl -b cookies.txt http://localhost:3000/api/admin/users
# Should return: 200 with users

curl -b cookies.txt http://localhost:3000/api/admin/salons
# Should return: 200 with salons

curl -b cookies.txt http://localhost:3000/api/admin/reviews
# Should return: 200 with reviews

# Owner endpoints (admin inherits)
curl -b cookies.txt http://localhost:3000/api/salon-owner/salon
# Should return: 200 with salon data

# Customer endpoints
curl -b cookies.txt http://localhost:3000/api/bookings
# Should return: 200 with bookings
```

---

## 🔄 Role Switching Tests

### Test: Customer → Salon Owner
1. Login as customer
2. Update DB: `UPDATE profiles SET role = 'salon_owner' WHERE id = 'user-id'`
3. Hard refresh browser (Ctrl+Shift+R)
4. Visit `/salon-owner/dashboard` - Should now work ✅

### Test: Salon Owner → Customer
1. Login as salon owner
2. Update DB: `UPDATE profiles SET role = 'customer' WHERE id = 'user-id'`
3. Hard refresh browser
4. Visit `/salon-owner/dashboard` - Should now redirect ❌

### Test: Customer → Admin
1. Login as customer
2. Update DB: `UPDATE profiles SET role = 'admin' WHERE id = 'user-id'`
3. Hard refresh browser
4. Visit `/admin` - Should now work ✅

---

## 🧪 API Endpoint Tests

### Unauthenticated Tests
```bash
# Should all return 401
curl http://localhost:3000/api/bookings
curl http://localhost:3000/api/favorites
curl http://localhost:3000/api/glam-points
curl http://localhost:3000/api/notifications
curl http://localhost:3000/api/salon-owner/salon
curl http://localhost:3000/api/admin/users
```

### Customer Tests (with customer token)
```bash
# Should work (200)
curl -b cookies.txt http://localhost:3000/api/bookings
curl -b cookies.txt http://localhost:3000/api/favorites
curl -b cookies.txt http://localhost:3000/api/glam-points

# Should fail (403)
curl -b cookies.txt http://localhost:3000/api/admin/users
curl -b cookies.txt http://localhost:3000/api/salon-owner/salon
```

### Salon Owner Tests (with owner token)
```bash
# Should work (200)
curl -b cookies.txt http://localhost:3000/api/salon-owner/salon
curl -b cookies.txt http://localhost:3000/api/salon-owner/services
curl -b cookies.txt http://localhost:3000/api/bookings

# Should fail (403)
curl -b cookies.txt http://localhost:3000/api/admin/users
```

### Admin Tests (with admin token)
```bash
# Should all work (200)
curl -b cookies.txt http://localhost:3000/api/admin/users
curl -b cookies.txt http://localhost:3000/api/admin/salons
curl -b cookies.txt http://localhost:3000/api/salon-owner/salon
curl -b cookies.txt http://localhost:3000/api/bookings
```

---

## 🎨 Visual Indicators

### Customer Dashboard
- [ ] Should NOT show "Salon Owner" badge
- [ ] Should show GlamPoints widget
- [ ] Should show "Customer" role badge

### Salon Owner Dashboard
- [ ] Should show "Salon Owner" badge in profile
- [ ] Should NOT show GlamPoints widget (owners don't earn points)
- [ ] Should show salon management section

### Admin Dashboard
- [ ] Should show "Admin" badge
- [ ] Should have access to user management
- [ ] Should have access to salon moderation

---

## 🛠️ Database Verification

Run these SQL queries to verify role setup:

```sql
-- Check all user roles
SELECT id, email, role, created_at 
FROM profiles 
ORDER BY created_at DESC;

-- Count by role
SELECT role, COUNT(*) as count 
FROM profiles 
GROUP BY role;

-- Find users without roles (should be none)
SELECT * FROM profiles WHERE role IS NULL;

-- Find admin users
SELECT id, email, full_name 
FROM profiles 
WHERE role = 'admin';

-- Find salon owners
SELECT id, email, full_name 
FROM profiles 
WHERE role = 'salon_owner';
```

---

## 🚨 Error Handling Tests

### Expected Error Redirects
- [ ] Non-admin accessing `/admin` → Redirects to `/?error=admin_required`
- [ ] Customer accessing `/salon-owner/dashboard` → Redirects to `/?error=owner_access_required`
- [ ] Guest accessing protected route → Redirects to `/auth/login?next={route}`

### Expected API Error Responses
```json
// 401 Unauthorized
{
  "error": "Authentication required"
}

// 403 Forbidden (wrong role)
{
  "error": "Access denied. Required role: admin"
}

// 403 Forbidden (not owner)
{
  "error": "You don't own this salon"
}
```

---

## 📱 Mobile/Responsive Tests

- [ ] Route guards work on mobile browsers
- [ ] Redirects work correctly on mobile
- [ ] Loading states show properly on slow connections
- [ ] Auth flows work with mobile keyboards
- [ ] Error messages are readable on small screens

---

## 🔐 Security Verification

### JWT Token Tests
- [ ] Expired token redirects to login
- [ ] Invalid token redirects to login
- [ ] Token refresh works automatically
- [ ] Logout clears all auth cookies

### Session Tests
- [ ] Login persists across page reloads
- [ ] Login persists across browser tabs
- [ ] Logout clears session everywhere
- [ ] Multiple logins (different roles) work correctly

### CSRF Protection
- [ ] API routes check origin headers (if configured)
- [ ] State-changing operations require valid session
- [ ] No operations work with just cookie theft

---

## 📊 Performance Tests

- [ ] Middleware adds < 50ms latency
- [ ] Protected pages load < 2s
- [ ] API routes respond < 500ms
- [ ] Role checks don't cause N+1 queries
- [ ] Supabase connection pooling works

---

## ✅ Final Verification

### Before Production
- [ ] All tests above pass
- [ ] No console errors in browser
- [ ] No server errors in logs
- [ ] Redirects preserve query parameters
- [ ] Error messages are user-friendly
- [ ] Loading states show appropriate UI
- [ ] Documentation is up to date

### Post-Deployment
- [ ] Test with real users
- [ ] Monitor auth failure rates
- [ ] Check error logs for auth issues
- [ ] Verify analytics track auth events
- [ ] Test on different browsers
- [ ] Test on different devices

---

## 🎯 Success Criteria

✅ **All tests pass** for all 4 user types  
✅ **No unauthorized access** possible  
✅ **Proper error messages** displayed  
✅ **Redirects work** correctly  
✅ **Performance** is acceptable  
✅ **Security** is maintained  

---

## 📝 Test Results Template

```
Date: __________
Tester: __________
Environment: __________ (dev/staging/prod)

Guest Tests: ☐ Pass ☐ Fail
Customer Tests: ☐ Pass ☐ Fail
Salon Owner Tests: ☐ Pass ☐ Fail
Admin Tests: ☐ Pass ☐ Fail
API Tests: ☐ Pass ☐ Fail
Security Tests: ☐ Pass ☐ Fail

Issues Found:
1. ___________
2. ___________
3. ___________

Overall Status: ☐ PASS ☐ FAIL
```

---

**Last Updated**: December 2024  
**Test Version**: 1.0  
**Estimated Test Time**: 30-45 minutes (comprehensive)
