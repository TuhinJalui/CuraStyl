"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { Tag, Copy, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

interface Coupon {
  id: string;
  code: string;
  description: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  valid_until: string;
  image_url?: string;
}

export default function BeautyOffers() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [offers, setOffers] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadOffers() {
      try {
        const res = await fetch("/api/offers");
        if (res.ok) {
          const data = await res.json();
          setOffers(data.offers ?? []);
        }
      } catch (err) {
        console.error("Failed to load offers:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadOffers();
  }, []);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopiedCode(code);
    toast.success(`Code "${code}" copied!`);
    setTimeout(() => setCopiedCode(null), 3000);
  };

  const formatDiscount = (offer: Coupon) => {
    if (offer.discount_type === "percentage") return `${offer.discount_value}% OFF`;
    return `₹${offer.discount_value.toLocaleString("en-IN")} OFF`;
  };

  // Default cover images for offers that don't have one
  const defaultImages = [
    "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1519741347686-c1e0aadf4611?w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&auto=format&fit=crop",
  ];

  if (!isLoading && offers.length === 0) return null;

  return (
    <section className="py-16 bg-gradient-to-b from-transparent via-purple-900/5 to-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 mb-2">
          <Tag className="w-5 h-5 text-purple-400" />
          <span className="text-sm font-medium text-purple-400 uppercase tracking-wider">Limited Time</span>
        </div>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-white">
            Exclusive <span className="gradient-text">Offers</span>
          </h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {offers.map((offer, idx) => (
              <div
                key={offer.id}
                className="glass-card overflow-hidden group hover:border-purple-500/40"
              >
                <div className="relative h-40 overflow-hidden">
                  <Image
                    src={offer.image_url ?? defaultImages[idx % defaultImages.length]}
                    alt={offer.description}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute top-3 right-3">
                    <span className="px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-bold shadow-lg">
                      {formatDiscount(offer)}
                    </span>
                  </div>
                  <h3 className="absolute bottom-3 left-4 font-bold text-white text-lg line-clamp-1">
                    {offer.description}
                  </h3>
                </div>

                <div className="p-4">
                  <p className="text-sm text-white/60 mb-4">
                    Use code <span className="text-purple-300 font-mono font-bold">{offer.code}</span> at checkout
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-dashed border-purple-500/40">
                      <Tag className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span className="text-sm font-mono font-bold text-purple-300 tracking-widest">{offer.code}</span>
                    </div>
                    <Button
                      size="icon-sm"
                      variant="glass"
                      onClick={() => copyCode(offer.code)}
                      aria-label="Copy code"
                    >
                      {copiedCode === offer.code ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-white/30 mt-2">
                    Valid until {new Date(offer.valid_until).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
