"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SalonCard from "@/components/shared/SalonCard";
import SalonCardSkeleton from "@/components/shared/SalonCardSkeleton";
import { Button } from "@/components/ui/button";
import { Trophy } from "lucide-react";
import type { Salon } from "@/types";

export default function TopRatedSalons() {
  const [topRated, setTopRated] = useState<Salon[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/salons?sort=rating&limit=3");
        if (res.ok) {
          const data = await res.json();
          setTopRated(data.salons ?? []);
        }
      } catch (err) {
        console.error("Failed to load top-rated salons:", err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  if (!isLoading && topRated.length === 0) return null;

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span className="text-sm font-medium text-amber-400 uppercase tracking-wider">Editor&apos;s Choice</span>
          </div>
          <h2 className="text-3xl font-bold text-white">
            Top Rated <span className="gradient-text">Salons</span>
          </h2>
        </div>
        <Link href="/salons?sort=rating">
          <Button variant="outline" size="sm">View All</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => <SalonCardSkeleton key={i} />)
          : topRated.map((salon, idx) => (
              <div key={salon.id} className="relative">
                {idx === 0 && (
                  <div className="absolute -top-3 left-4 z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black text-xs font-bold shadow-lg shadow-amber-500/30">
                    🏆 #1 Rated
                  </div>
                )}
                <SalonCard salon={salon} />
              </div>
            ))}
      </div>
    </section>
  );
}
