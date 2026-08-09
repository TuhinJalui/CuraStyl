import { Suspense } from "react";
import RouteGuard from "@/components/auth/RouteGuard";
import CheckoutClient from "./CheckoutClient";

export const metadata = { title: "Checkout" };

export default function CheckoutPage() {
  return (
    <RouteGuard requireAuth>
      <Suspense fallback={<div className="min-h-screen gradient-hero" />}>
        <CheckoutClient />
      </Suspense>
    </RouteGuard>
  );
}
