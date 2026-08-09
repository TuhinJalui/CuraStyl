import RouteGuard from "@/components/auth/RouteGuard";
import ProfileClient from "./ProfileClient";

export const metadata = { title: "Profile" };

export default function ProfilePage() {
  return (
    <RouteGuard requireAuth>
      <ProfileClient />
    </RouteGuard>
  );
}
