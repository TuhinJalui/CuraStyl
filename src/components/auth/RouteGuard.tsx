"use client";

/**
 * ============================================
 * CLIENT-SIDE ROUTE GUARD COMPONENT
 * ============================================
 * Protects client components from unauthorized access
 */

import { useEffect, useState, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

type UserRole = "customer" | "salon_owner" | "admin";

interface RouteGuardProps {
  children: ReactNode;
  requireAuth?: boolean;
  requiredRole?: UserRole | UserRole[];
  fallback?: ReactNode;
}

/**
 * RouteGuard - Client-side route protection
 * 
 * @example
 * <RouteGuard requireAuth>
 *   <DashboardContent />
 * </RouteGuard>
 * 
 * @example
 * <RouteGuard requiredRole="admin">
 *   <AdminPanel />
 * </RouteGuard>
 */
export default function RouteGuard({
  children,
  requireAuth = false,
  requiredRole,
  fallback = <LoadingScreen />,
}: RouteGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (!requireAuth && !requiredRole) {
        setIsAuthorized(true);
        setIsLoading(false);
        return;
      }

      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) {
          // Not authenticated - redirect to login
          const loginUrl = `/auth/login?next=${encodeURIComponent(pathname)}`;
          router.push(loginUrl);
          return;
        }

        // Fetch user profile to verify role
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        const userRole = (profile?.role || "customer") as UserRole;
        
        // Define allowed roles based on props
        let allowedRoles: UserRole[] = ["customer", "admin"];
        if (requiredRole) {
          allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
        }

        if (!allowedRoles.includes(userRole)) {
          // Role mismatch redirect
          if (userRole === "salon_owner") {
            router.push("/salon-owner/dashboard");
          } else {
            router.push("/dashboard");
          }
          return;
        }

        // Authorized
        setIsAuthorized(true);
      } catch (err) {
        console.error("Auth check failed:", err);
        router.push("/auth/login?error=auth_check_failed");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [requireAuth, requiredRole, pathname, router]);

  if (isLoading) {
    return <>{fallback}</>;
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}

/**
 * Default loading screen
 */
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[#f5f0ff]/60 text-sm">Verifying access...</p>
      </div>
    </div>
  );
}

/**
 * HOC version for wrapping components
 */
export function withRouteGuard<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<RouteGuardProps, "children">
) {
  return function ProtectedComponent(props: P) {
    return (
      <RouteGuard {...options}>
        <Component {...props} />
      </RouteGuard>
    );
  };
}
