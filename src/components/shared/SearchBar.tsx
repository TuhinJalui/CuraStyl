"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin, Scissors, CalendarDays, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MUMBAI_AREAS, SERVICE_CATEGORIES } from "@/lib/utils";

interface SearchBarProps {
  compact?: boolean;
  defaultValues?: { service?: string; area?: string; date?: string };
}

export default function SearchBar({ compact = false, defaultValues = {} }: SearchBarProps) {
  const router = useRouter();
  const [service, setService] = useState(defaultValues.service ?? "");
  const [area, setArea] = useState(defaultValues.area ?? "");
  const [date, setDate] = useState(defaultValues.date ?? "");

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (service) params.set("service", service);
    if (area) params.set("area", area);
    if (date) params.set("date", date);
    router.push(`/salons?${params.toString()}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 glass-dark rounded-2xl p-2 border border-purple-500/20">
        <div className="flex items-center gap-2 flex-1 px-3">
          <Search className="w-4 h-4 text-purple-400 shrink-0" />
          <input
            type="text"
            placeholder="Search service or salon…"
            value={service}
            onChange={(e) => setService(e.target.value)}
            onKeyDown={handleKeyDown}
            className="bg-transparent text-sm text-white placeholder:text-white/40 outline-none w-full"
          />
        </div>
        <Button size="sm" onClick={handleSearch}>Search</Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="glass-dark rounded-2xl border border-purple-500/20 p-2 shadow-2xl shadow-purple-900/30">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-1">
          {/* Service */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors group">
            <div className="w-9 h-9 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0 group-hover:bg-purple-500/30 transition-colors">
              <Scissors className="w-4 h-4 text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-white/40 uppercase tracking-wider mb-0.5">Service</p>
              <select
                value={service}
                onChange={(e) => setService(e.target.value)}
                className="bg-transparent text-sm text-white w-full outline-none cursor-pointer appearance-none"
                aria-label="Select service"
              >
                <option value="" className="bg-[#1a0a2e]">Any service</option>
                {SERVICE_CATEGORIES.map((s) => (
                  <option key={s} value={s} className="bg-[#1a0a2e]">{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Divider */}
          <div className="hidden md:block absolute h-12 w-px bg-white/10 self-center" />

          {/* Area */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors group md:border-l md:border-white/10">
            <div className="w-9 h-9 rounded-lg bg-pink-500/20 flex items-center justify-center shrink-0 group-hover:bg-pink-500/30 transition-colors">
              <MapPin className="w-4 h-4 text-pink-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-white/40 uppercase tracking-wider mb-0.5">Area</p>
              <select
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="bg-transparent text-sm text-white w-full outline-none cursor-pointer appearance-none"
                aria-label="Select area"
              >
                <option value="" className="bg-[#1a0a2e]">Any area in Mumbai</option>
                {MUMBAI_AREAS.map((a) => (
                  <option key={a} value={a} className="bg-[#1a0a2e]">{a}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Date */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors group md:border-l md:border-white/10">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0 group-hover:bg-amber-500/30 transition-colors">
              <CalendarDays className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-white/40 uppercase tracking-wider mb-0.5">Date</p>
              <input
                type="date"
                value={date}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setDate(e.target.value)}
                className="bg-transparent text-sm text-white w-full outline-none cursor-pointer [color-scheme:dark]"
                aria-label="Select date"
              />
            </div>
          </div>
        </div>

        {/* Search Button */}
        <div className="mt-2 flex gap-2">
          <Button
            onClick={handleSearch}
            className="flex-1 h-12 text-base font-semibold gap-2"
          >
            <Search className="w-5 h-5" />
            Search Salons
          </Button>
          <Button
            variant="glass"
            className="h-12 px-4 gap-2 text-sm"
            onClick={() => router.push("/ai-assistant")}
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="hidden sm:inline">Ask AI</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
