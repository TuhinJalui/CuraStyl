/**
 * ============================================
 * ROUTE GUARDS & AUTH HELPERS
 * ============================================
 * Reusable authentication and authorization helpers
 * for API routes and server-side validation
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient, User } from "@supabase/supabase-js";

// ============================================
// TYPES
// ============================================

export type UserRole = "customer" | "salon_owner" | "admin";

export interface AuthenticatedUser extends User {
  role?: UserRole;
}

export interface AuthResult {
  user: AuthenticatedUser | null;
  error?: string;
  supabase: SupabaseClient;
}

// ============================================
// SUPABASE CLIENT FACTORY
// ============================================

/**
 * Create Supabase client with cookie handling
 */
export async function getSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}

// ============================================
// AUTHENTICATION GUARDS
// ============================================

/**
 * Require authenticated user (any role)
 * Returns user + supabase client or 401 response
 */
export async function requireAuth(): Promise<AuthResult> {
  const supabase = await getSupabaseClient();

  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return {
        user: null,
        error: "Authentication required",
        supabase,
      };
    }

    return { user: user as AuthenticatedUser, supabase };
  } catch (error) {
    console.error("Auth check failed:", error);
    return {
      user: null,
      error: "Authentication failed",
      supabase,
    };
  }
}

/**
 * Require specific role(s)
 * Returns user with role or 403 response
 */
export async function requireRole(
  allowedRoles: UserRole | UserRole[]
): Promise<AuthResult> {
  const { user, error, supabase } = await requireAuth();

  if (!user) {
    return { user: null, error, supabase };
  }

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const userRole = profile?.role as UserRole;
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    if (!userRole || !roles.includes(userRole)) {
      return {
        user: null,
        error: `Access denied. Required role: ${roles.join(" or ")}`,
        supabase,
      };
    }

    return {
      user: { ...user, role: userRole },
      supabase,
    };
  } catch (err) {
    console.error("Role check failed:", err);
    return {
      user: null,
      error: "Authorization check failed",
      supabase,
    };
  }
}

/**
 * Require admin role
 */
export async function requireAdmin(): Promise<AuthResult> {
  return requireRole("admin");
}

/**
 * Require salon owner or admin role
 */
export async function requireSalonOwner(): Promise<AuthResult> {
  return requireRole(["salon_owner", "admin"]);
}

/**
 * Require customer role (or any authenticated user)
 */
export async function requireCustomer(): Promise<AuthResult> {
  return requireAuth();
}

// ============================================
// RESPONSE HELPERS
// ============================================

/**
 * Return 401 Unauthorized
 */
export function unauthorizedResponse(message = "Authentication required") {
  return NextResponse.json({ error: message }, { status: 401 });
}

/**
 * Return 403 Forbidden
 */
export function forbiddenResponse(message = "Access denied") {
  return NextResponse.json({ error: message }, { status: 403 });
}

/**
 * Return auth error response based on result
 */
export function authErrorResponse(result: AuthResult): NextResponse {
  if (!result.user) {
    return result.error?.toLowerCase().includes("access denied")
      ? forbiddenResponse(result.error)
      : unauthorizedResponse(result.error);
  }
  return unauthorizedResponse("Authentication required");
}

// ============================================
// OWNERSHIP VERIFICATION
// ============================================

/**
 * Verify user owns a salon
 */
export async function verifySalonOwnership(
  supabase: SupabaseClient,
  userId: string,
  salonId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("salons")
    .select("id")
    .eq("id", salonId)
    .eq("owner_id", userId)
    .single();

  return !!data;
}

/**
 * Verify user owns a booking
 */
export async function verifyBookingOwnership(
  supabase: SupabaseClient,
  userId: string,
  bookingId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("bookings")
    .select("id")
    .eq("booking_id", bookingId)
    .eq("user_id", userId)
    .single();

  return !!data;
}

// ============================================
// API ROUTE WRAPPER
// ============================================

type RouteHandler = (
  req: NextRequest,
  context: { user: AuthenticatedUser; supabase: SupabaseClient; params?: any }
) => Promise<NextResponse>;

/**
 * Wrap API route with authentication
 * 
 * @example
 * export const GET = withAuth(async (req, { user, supabase }) => {
 *   // user is guaranteed to exist
 *   return NextResponse.json({ userId: user.id });
 * });
 */
export function withAuth(handler: RouteHandler) {
  return async (req: NextRequest, routeContext?: { params?: any }) => {
    const result = await requireAuth();

    if (!result.user) {
      return authErrorResponse(result);
    }

    return handler(req, {
      user: result.user,
      supabase: result.supabase,
      params: routeContext?.params,
    });
  };
}

/**
 * Wrap API route with role requirement
 * 
 * @example
 * export const POST = withRole(["admin", "salon_owner"], async (req, { user, supabase }) => {
 *   // user has admin or salon_owner role
 *   return NextResponse.json({ role: user.role });
 * });
 */
export function withRole(allowedRoles: UserRole | UserRole[], handler: RouteHandler) {
  return async (req: NextRequest, routeContext?: { params?: any }) => {
    const result = await requireRole(allowedRoles);

    if (!result.user) {
      return authErrorResponse(result);
    }

    return handler(req, {
      user: result.user,
      supabase: result.supabase,
      params: routeContext?.params,
    });
  };
}

/**
 * Wrap API route with admin requirement
 */
export function withAdmin(handler: RouteHandler) {
  return withRole("admin", handler);
}

/**
 * Wrap API route with salon owner requirement
 */
export function withSalonOwner(handler: RouteHandler) {
  return withRole(["salon_owner", "admin"], handler);
}
