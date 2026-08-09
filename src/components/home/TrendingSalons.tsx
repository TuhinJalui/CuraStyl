"use client";

import { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, TrendingUp } from "lucide-react";
import SalonCard from "@/components/shared/SalonCard";
import SalonCardSkeleton from "@/components/shared/SalonCardSkeleton";
import type { Salon } from "@/types";

export default function TrendingSalons() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [salons, setSalons] = useState<Salon[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/salons?sort=recommended&limit=10");
        if (res.ok) {
          const data = await res.json();
          setSalons(data.salons ?? []);
        }
      } catch (err) {
        console.error("Failed to load trending salons:", err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = 320;
    scrollRef.current.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
  };

  if (!isLoading && salons.length === 0) return null;

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            <span className="text-sm font-medium text-purple-400 uppercase tracking-wider">Trending Now</span>
          </div>
          <h2 className="text-3xl font-bold text-white">
            Hot Picks This <span className="gradient-text">Week</span>
          </h2>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
            className="p-2.5 rounded-xl glass border border-white/10 hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
            className="p-2.5 rounded-xl glass border border-white/10 hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-purple-500/20 snap-x snap-mandatory"
        style={{ scrollbarWidth: "thin" }}
      >
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="min-w-[280px] sm:min-w-[300px] snap-start">
                <SalonCardSkeleton />
              </div>
            ))
          : salons.map((salon) => (
              <div key={salon.id} className="min-w-[280px] sm:min-w-[300px] snap-start">
                <SalonCard salon={salon} />
              </div>
            ))}
      </div>
    </section>
  );
}
