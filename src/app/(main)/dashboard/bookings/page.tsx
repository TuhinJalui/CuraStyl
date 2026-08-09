import { Metadata } from "next";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import RouteGuard from "@/components/auth/RouteGuard";
import DashboardBookingsClient from "./BookingsClient";

export const metadata: Metadata = {
  title: "My Bookings | GlamHub",
  description: "View and manage your salon bookings",
};

export default function DashboardBookingsPage() {
  return (
    <RouteGuard requireAuth>
      <Suspense
        fallback={
          <div className="min-h-screen gradient-hero flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-10 h-10 animate-spin text-purple-400 mb-3 mx-auto" />
              <p className="text-white/40">Loading bookings dashboard...</p>
            </div>
          </div>
        }
      >
        <DashboardBookingsClient />
      </Suspense>
    </RouteGuard>
  );
}
