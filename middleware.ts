import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// ============================================
// ROUTE PROTECTION CONFIGURATION
// ============================================

// Public routes (no authentication required)
const PUBLIC_ROUTES = [
  "/",
  "/landing",
  "/salons",
  "/offers",
  "/debug-auth",
];

// Auth routes — logged-in users should be redirected away
const AUTH_ROUTES = [
  "/auth/login",
  "/auth/register",
  "/auth/salon-owner-login",
  "/auth/forgot-password",
  "/auth/reset-password",
];

// Routes requiring any authenticated user
const PROTECTED_ROUTES = [
  "/dashboard",
  "/profile",
  "/checkout",
  "/rewards",
  "/ai-assistant",
  "/virtual-tryon",
  "/upgrade",
];

// Routes requiring salon_owner or admin role
const OWNER_ROUTES = [
  "/salon-owner/dashboard",
  "/salon-owner/register",
];

// Routes requiring admin role only
const ADMIN_ROUTES = [
  "/admin",
];

export async function middleware(req: NextRequest) {
  let res = NextResponse.next();
  const pathname = req.nextUrl.pathname;

  // Skip if Supabase env vars aren't configured (demo mode)
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your_supabase") ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes("your_supabase") ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.split(".").length !== 3
  ) {
    return res;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value);
            res = NextResponse.next({ request: req });
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  let user = null;
  try {
    // Use getUser() (not getSession()) for server-side security
    const authResult = await supabase.auth.getUser();
    user = authResult.data.user;
  } catch (error) {
    console.error("Middleware auth/JWT check failed:", error);
    return res;
  }

  // Check route types
  const isPublic = PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));
  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r));
  const isOwnerRoute = OWNER_ROUTES.some((r) => pathname.startsWith(r));
  const isAdminRoute = ADMIN_ROUTES.some((r) => pathname.startsWith(r));
  const isProtected = PROTECTED_ROUTES.some((r) => pathname.startsWith(r));

  // Allow public routes without authentication
  if (isPublic && !user) {
    return res;
  }

  // Redirect logged-in users away from auth pages
  if (user && isAuthRoute) {
    // If there's a 'next' param, redirect there, otherwise go home
    const next = req.nextUrl.searchParams.get("next");
    const redirectUrl = next && next !== pathname ? next : "/";
    return NextResponse.redirect(new URL(redirectUrl, req.url));
  }

  // Redirect unauthenticated users to login
  if (!user && (isProtected || isOwnerRoute || isAdminRoute)) {
    const loginUrl = new URL("/auth/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based access control for owner/admin/customer routes
  if (user) {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const userRole = profile?.role;

      // 1. Owner routes check: redirect non-owners to customer dashboard
      if (isOwnerRoute && !["salon_owner", "admin"].includes(userRole ?? "")) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }

      // 2. Admin routes check: redirect non-admins to customer dashboard
      if (isAdminRoute && userRole !== "admin") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }

      // 3. Customer protected routes check: redirect salon owners to owner dashboard
      if (isProtected && userRole === "salon_owner") {
        return NextResponse.redirect(new URL("/salon-owner/dashboard", req.url));
      }
    } catch (error) {
      console.error("Role verification failed:", error);
      return NextResponse.redirect(new URL("/auth/login?error=role_check_failed", req.url));
    }
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
