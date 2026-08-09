import RouteGuard from "@/components/auth/RouteGuard";
import AdminDashboard from "./AdminDashboard";

export const metadata = { title: "Admin Dashboard – GlamHub" };

export default function Page() {
  return (
    <RouteGuard requiredRole="admin">
      <AdminDashboard />
    </RouteGuard>
  );
}
