import { Suspense } from "react";
import SalonsClient from "./SalonsClient";

export const metadata = {
  title: "Browse Salons",
  description: "Find and book the best beauty salons in Mumbai.",
};

export default function SalonsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen gradient-hero" />}>
      <SalonsClient />
    </Suspense>
  );
}
