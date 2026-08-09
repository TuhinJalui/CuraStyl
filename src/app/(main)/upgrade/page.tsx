"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Redirect to rewards page - upgrade functionality is now in rewards page
export default function UpgradePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/rewards");
  }, [router]);

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center pt-20">
      <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
    </div>
  );
}
