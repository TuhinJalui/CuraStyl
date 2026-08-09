import RouteGuard from "@/components/auth/RouteGuard";
import SalonOwnerDashboard from "./SalonOwnerDashboard";

export const metadata = { title: "Salon Owner Dashboard" };

export default function Page() {
  return (
    <RouteGuard requiredRole={["salon_owner", "admin"]}>
      <SalonOwnerDashboard />
    </RouteGuard>
  );
}
