"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const ARHairstyleTryOn = dynamic(
  () => import("@/components/ai-beauty/ARHairstyleTryOn"),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen gradient-hero flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-white/70">Loading AR Hairstyle Engine...</p>
        </div>
      </div>
    )
  }
);

export default function VirtualTryOnClient() {
  return <ARHairstyleTryOn />;
}