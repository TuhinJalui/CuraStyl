"use client";

import { useState, useRef, useEffect } from "react";

import HeroSlideshow from "./HeroSlideshow";
import PremiumCarousel from "./PremiumCarousel";
import { Sparkles, Star, Users, Store, Brain, Wand2 } from "lucide-react";
import { TRENDING_SEARCHES } from "@/lib/data/seed";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const HERO_WORDS = ["Glamorous", "Radiant", "Beautiful", "Confident", "Stunning"];

export default function HeroSection() {
  const [wordIndex, setWordIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isHeroPaused, setIsHeroPaused] = useState(false);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();

  const displayWord = HERO_WORDS[wordIndex];

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setWordIndex((prev) => (prev + 1) % HERO_WORDS.length);
        setIsAnimating(false);
      }, 400);
    }, 3000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  return (
    <>
      <section
        onMouseLeave={() => {
          setParallax({ x: 0, y: 0 });
        }}
        onMouseMove={(e) => {
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          const px = ((e.clientX - rect.left) / rect.width - 0.5) * 28;
          const py = ((e.clientY - rect.top) / rect.height - 0.5) * 18;
          setParallax({ x: px, y: py });
        }}
        className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden gradient-hero pt-20 pb-16"
      >
        {/* Background slideshow */}
        <HeroSlideshow paused={isHeroPaused} parallax={parallax} />
        
        {/* Decorative elements */}
        <div className="absolute top-1/4 -left-40 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-pink-600/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-violet-700/15 rounded-full blur-[100px] pointer-events-none" />

        {/* Floating orbs */}
        <div className="absolute top-32 left-16 w-3 h-3 rounded-full bg-purple-400/60 animate-float" style={{ animationDelay: "0s" }} />
        <div className="absolute top-48 right-24 w-2 h-2 rounded-full bg-pink-400/60 animate-float" style={{ animationDelay: "1s" }} />
        <div className="absolute bottom-32 left-1/4 w-2 h-2 rounded-full bg-violet-400/60 animate-float" style={{ animationDelay: "2s" }} />
        <div className="absolute top-64 left-1/2 w-1.5 h-1.5 rounded-full bg-pink-300/80 animate-float" style={{ animationDelay: "0.5s" }} />

        <div className="relative z-10 w-full">
          {/* Premium Carousel - full width */}
          <PremiumCarousel />

          {/* Hero content below carousel */}
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center mt-10">


            {/* AI Virtual Try-On Button - PRIMARY CTA */}
            <div className="mb-8">
              <Link href="/virtual-tryon">
                <Button
                  size="lg"
                  className="h-16 px-10 text-lg gap-3 shadow-2xl shadow-purple-500/50 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:scale-105 transition-all duration-300 group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
                  <Wand2 className="w-6 h-6 relative z-10" />
                  <span className="relative z-10 font-bold">✨ Try Virtual Try-On</span>
                  <Brain className="w-6 h-6 relative z-10" />
                </Button>
              </Link>
              <p className="text-xs text-white/50 mt-3 flex items-center justify-center gap-2 flex-wrap">
                <span>💇 40+ Hairstyles</span>
                <span>•</span>
                <span>🎨 Real 3D Models</span>
                <span>•</span>
                <span>📸 Live Camera Preview</span>
                <span>•</span>
                <span className="text-emerald-400 font-semibold">100% Free</span>
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto">
              {[
                { icon: Store, value: "10+", label: "Salons" },
                { icon: Users, value: "1K+", label: "Happy Clients" },
                { icon: Star, value: "4.8", label: "Avg Rating" },
              ].map(({ icon: Icon, value, label }) => (
                <div key={label} className="glass rounded-2xl p-4 border border-white/10 hover:border-purple-500/30 transition-all duration-300 group">
                  <Icon className="w-5 h-5 text-purple-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-2xl font-bold gradient-text">{value}</p>
                  <p className="text-xs text-white/50 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
