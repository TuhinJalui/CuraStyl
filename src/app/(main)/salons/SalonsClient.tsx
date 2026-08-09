"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  SlidersHorizontal, LayoutGrid, List, ChevronDown, X, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SalonCard from "@/components/shared/SalonCard";
import SalonCardSkeleton from "@/components/shared/SalonCardSkeleton";
import { MUMBAI_AREAS, SERVICE_CATEGORIES, cn } from "@/lib/utils";
import type { Salon, SearchFilters } from "@/types";

const SORT_OPTIONS = [
  { value: "recommended", label: "Recommended" },
  { value: "rating", label: "Highest Rated" },
  { value: "price_low", label: "Lowest Price" },
  { value: "price_high", label: "Highest Price" },
];

export default function SalonsClient() {
  const searchParams = useSearchParams();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    query: searchParams.get("query") ?? "",
    area: searchParams.get("area") ?? "",
    service: searchParams.get("service") ?? "",
    date: searchParams.get("date") ?? "",
    sortBy: "recommended",
    minPrice: 0,
    maxPrice: 10000,
  });

  const [salons, setSalons] = useState<Salon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const updateFilter = <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({ query: "", area: "", service: "", sortBy: "recommended", minPrice: 0, maxPrice: 10000 });
  };

  const activeFilterCount = [
    filters.area, filters.service, filters.category,
    filters.minPrice !== 0 || filters.maxPrice !== 10000 ? "price" : "",
    filters.minRating ? "rating" : "",
  ].filter(Boolean).length;

  // Fetch salons from Supabase (via API route)
  const fetchSalons = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.query)    params.set("query",     filters.query);
      if (filters.area)     params.set("area",      filters.area);
      if (filters.service)  params.set("service",   filters.service);
      if (filters.category) params.set("category",  filters.category);
      if (filters.sortBy)   params.set("sort",      filters.sortBy);
      if (filters.minPrice) params.set("minPrice",  String(filters.minPrice));
      if (filters.maxPrice !== 10000) params.set("maxPrice", String(filters.maxPrice));
      if (filters.minRating) params.set("minRating", String(filters.minRating));

      const res = await fetch(`/api/salons?${params}`);
      if (!res.ok) throw new Error("Failed to fetch salons");
      const data = await res.json();
      setSalons(data.salons ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      console.error("Error fetching salons:", err);
      setSalons([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchSalons();
  }, [fetchSalons]);

  return (
    <div className="min-h-screen gradient-hero pt-20">
      {/* Header */}
      <div className="bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Search Row */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <Input
                placeholder="Search salons or services…"
                className="pl-9 h-10"
                value={filters.query ?? ""}
                onChange={(e) => updateFilter("query", e.target.value)}
              />
            </div>

            <Button
              variant={showFilters ? "default" : "glass"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2 shrink-0"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-white text-black text-xs font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </Button>

            {/* Sort */}
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <span className="text-sm text-white/40">Sort:</span>
              <div className="relative">
                <select
                  value={filters.sortBy}
                  onChange={(e) => updateFilter("sortBy", e.target.value as SearchFilters["sortBy"])}
                  className="appearance-none bg-white/5 border border-white/10 text-white text-sm rounded-xl px-3 py-2 pr-7 outline-none cursor-pointer hover:bg-white/10 transition-colors"
                  aria-label="Sort salons"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value} className="bg-[#1a0a2e]">{o.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40 pointer-events-none" />
              </div>
            </div>

            {/* View Toggle */}
            <div className="hidden sm:flex items-center rounded-xl border border-white/10 overflow-hidden shrink-0">
              <button
                onClick={() => setViewMode("grid")}
                className={cn("p-2 transition-colors", viewMode === "grid" ? "bg-purple-500/30 text-white" : "bg-white/5 text-white/40 hover:text-white")}
                aria-label="Grid view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn("p-2 transition-colors", viewMode === "list" ? "bg-purple-500/30 text-white" : "bg-white/5 text-white/40 hover:text-white")}
                aria-label="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="pt-4 border-t border-white/5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {/* Area */}
              <select
                value={filters.area ?? ""}
                onChange={(e) => updateFilter("area", e.target.value)}
                className="appearance-none bg-white/5 border border-white/10 text-sm text-white rounded-xl px-3 py-2 outline-none cursor-pointer"
                aria-label="Filter by area"
              >
                <option value="" className="bg-[#1a0a2e]">All Areas</option>
                {MUMBAI_AREAS.map((a) => (
                  <option key={a} value={a} className="bg-[#1a0a2e]">{a}</option>
                ))}
              </select>

              {/* Service */}
              <select
                value={filters.service ?? ""}
                onChange={(e) => updateFilter("service", e.target.value)}
                className="appearance-none bg-white/5 border border-white/10 text-sm text-white rounded-xl px-3 py-2 outline-none cursor-pointer"
                aria-label="Filter by service"
              >
                <option value="" className="bg-[#1a0a2e]">All Services</option>
                {SERVICE_CATEGORIES.map((s) => (
                  <option key={s} value={s} className="bg-[#1a0a2e]">{s}</option>
                ))}
              </select>

              {/* Category */}
              <select
                value={filters.category ?? ""}
                onChange={(e) => updateFilter("category", e.target.value as SearchFilters["category"])}
                className="appearance-none bg-white/5 border border-white/10 text-sm text-white rounded-xl px-3 py-2 outline-none cursor-pointer"
                aria-label="Filter by category"
              >
                <option value="" className="bg-[#1a0a2e]">All Types</option>
                <option value="women" className="bg-[#1a0a2e]">Women&apos;s</option>
                <option value="men" className="bg-[#1a0a2e]">Men&apos;s</option>
                <option value="unisex" className="bg-[#1a0a2e]">Unisex</option>
              </select>

              {/* Min Rating */}
              <select
                value={filters.minRating ?? ""}
                onChange={(e) => updateFilter("minRating", e.target.value ? Number(e.target.value) : undefined)}
                className="appearance-none bg-white/5 border border-white/10 text-sm text-white rounded-xl px-3 py-2 outline-none cursor-pointer"
                aria-label="Filter by rating"
              >
                <option value="" className="bg-[#1a0a2e]">Any Rating</option>
                <option value="4.5" className="bg-[#1a0a2e]">4.5+ ⭐</option>
                <option value="4" className="bg-[#1a0a2e]">4.0+ ⭐</option>
                <option value="3.5" className="bg-[#1a0a2e]">3.5+ ⭐</option>
              </select>

              {/* Clear */}
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10">
                  <X className="w-4 h-4" /> Clear All
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isLoading && (
          <div className="flex items-center justify-between mb-6">
            <p className="text-white/60 text-sm">
              <span className="text-white font-semibold">{total}</span> salons found
              {filters.area && <span> in <span className="text-purple-300">{filters.area}</span></span>}
            </p>
          </div>
        )}

        {isLoading ? (
          <div className={cn("gap-6", viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "flex flex-col")}>
            {Array.from({ length: 6 }).map((_, i) => <SalonCardSkeleton key={i} />)}
          </div>
        ) : salons.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-white mb-2">No salons found</h3>
            <p className="text-white/50 mb-6">Try adjusting your filters or search in a different area</p>
            <Button onClick={clearFilters}>Clear Filters</Button>
          </div>
        ) : (
          <div className={cn("gap-6", viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "flex flex-col")}>
            {salons.map((salon) => (
              <SalonCard key={salon.id} salon={salon} viewMode={viewMode} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
