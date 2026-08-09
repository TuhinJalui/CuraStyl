"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/useAuth";
import HeroSection from "@/components/home/HeroSection";
import TrendingSalons from "@/components/home/TrendingSalons";
import TopRatedSalons from "@/components/home/TopRatedSalons";
import BeautyOffers from "@/components/home/BeautyOffers";
import AIAssistantCTA from "@/components/home/AIAssistantCTA";
import HowItWorks from "@/components/home/HowItWorks";
import CategoryBrowse from "@/components/home/CategoryBrowse";
import TrustBadges from "@/components/home/TrustBadges";
import AuthenticatedHome from "@/components/home/AuthenticatedHome";

export default function HomePage() {
  const { isLoggedIn, isLoading, profile } = useAuth();
  const router = useRouter();

  // Redirect salon owners to their dashboard
  useEffect(() => {
    if (isLoggedIn && profile?.role === "salon_owner") {
      router.push("/salon-owner/dashboard");
    }
  }, [isLoggedIn, profile, router]);

  // Debug logs
  console.log("🔍 HomePage Debug:", { isLoggedIn, isLoading, profile });

  // Show loading state while checking auth / redirecting
  if (isLoading || (isLoggedIn && profile?.role === "salon_owner")) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/50">
            {isLoggedIn && profile?.role === "salon_owner"
              ? "Redirecting to Salon Dashboard..."
              : "Loading..."}
          </p>
        </div>
      </div>
    );
  }

  // Show authenticated home for logged-in customers
  if (isLoggedIn) {
    console.log("✅ Rendering AuthenticatedHome");
    return <AuthenticatedHome />;
  }

  // Show public landing page for guests
  console.log("❌ Rendering Public Landing Page");
  return (
    <div className="gradient-bg">
      <HeroSection />
      <TrustBadges />
      <CategoryBrowse />
      <TrendingSalons />
      <HowItWorks />
      <TopRatedSalons />
      <BeautyOffers />
      <AIAssistantCTA />
    </div>
  );
}
