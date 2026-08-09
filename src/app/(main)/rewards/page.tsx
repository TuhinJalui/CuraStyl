import RouteGuard from "@/components/auth/RouteGuard";
import RewardsClient from "./RewardsClient";

export const metadata = { title: "Rewards" };

export default function RewardsPage() {
  return (
    <RouteGuard requireAuth>
      <RewardsClient />
    </RouteGuard>
  );
}
