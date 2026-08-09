import HeroSection from "@/components/home/HeroSection";
import TrendingSalons from "@/components/home/TrendingSalons";
import TopRatedSalons from "@/components/home/TopRatedSalons";
import BeautyOffers from "@/components/home/BeautyOffers";
import AIAssistantCTA from "@/components/home/AIAssistantCTA";
import HowItWorks from "@/components/home/HowItWorks";
import CategoryBrowse from "@/components/home/CategoryBrowse";
import TrustBadges from "@/components/home/TrustBadges";

export default function LandingPage() {
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
