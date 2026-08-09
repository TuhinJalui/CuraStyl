import RouteGuard from "@/components/auth/RouteGuard";
import SalonRegisterClient from "./SalonRegisterClient";
export const metadata = { title: "List Your Salon – Mumbai GlamHub" };
export default function Page() {
  return (
    <RouteGuard requireAuth>
      <SalonRegisterClient />
    </RouteGuard>
  );
}
