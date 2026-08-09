"use client";

import { useState } from "react";
import Image from "next/image";
import { Tag, Copy, Check, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BEAUTY_OFFERS } from "@/lib/data/seed";
import toast from "react-hot-toast";

const ALL_OFFERS = [
  ...BEAUTY_OFFERS,
  {
    id: "4",
    title: "Spa Sunday",
    description: "Flat ₹500 off on all spa treatments every Sunday",
    discount: "₹500 OFF",
    image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600&auto=format&fit=crop",
    validUntil: "2025-12-31",
    code: "SPA500",
  },
  {
    id: "5",
    title: "GlamHub Exclusive",
    description: "10% off for all GlamHub members — no minimum spend",
    discount: "10% OFF",
    image: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=600&auto=format&fit=crop",
    validUntil: "2025-12-31",
    code: "GLAMHUB10",
  },
  {
    id: "6",
    title: "Referral Bonus",
    description: "Refer a friend and both get ₹200 off your next booking",
    discount: "₹200 EACH",
    image: "https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=600&auto=format&fit=crop",
    validUntil: "2025-12-31",
    code: "REFER200",
  },
];

export default function OffersPage() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copy = (code: string) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopiedCode(code);
    toast.success(`Code "${code}" copied to clipboard!`);
    setTimeout(() => setCopiedCode(null), 3000);
  };

  return (
    <div className="min-h-screen gradient-hero pt-20 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center py-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-amber-500/30 mb-5">
            <Flame className="w-4 h-4 text-amber-400" />
            <span className="text-sm text-amber-300 font-medium">Limited Time Deals</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">
            Exclusive <span className="gradient-text">Beauty Offers</span>
          </h1>
          <p className="text-white/50 max-w-lg mx-auto">
            Save big on your next beauty appointment. Copy a code and apply at checkout.
          </p>
        </div>

        {/* Offers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ALL_OFFERS.map((offer) => (
            <div key={offer.id} className="glass-card overflow-hidden group hover:border-purple-500/40 transition-all duration-300">
              <div className="relative h-44 overflow-hidden">
                <Image
                  src={offer.image}
                  alt={offer.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute top-3 right-3">
                  <span className="px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-bold shadow-lg shadow-purple-500/30">
                    {offer.discount}
                  </span>
                </div>
                <h3 className="absolute bottom-3 left-4 font-bold text-white text-lg">{offer.title}</h3>
              </div>

              <div className="p-5">
                <p className="text-sm text-white/60 mb-4 leading-relaxed">{offer.description}</p>

                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-dashed border-purple-500/40">
                    <Tag className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span className="text-sm font-mono font-bold text-purple-300 tracking-widest">{offer.code}</span>
                  </div>
                  <Button
                    size="icon-sm"
                    variant="glass"
                    onClick={() => copy(offer.code)}
                    className="shrink-0 h-10 w-10"
                    aria-label="Copy promo code"
                  >
                    {copiedCode === offer.code
                      ? <Check className="w-4 h-4 text-emerald-400" />
                      : <Copy className="w-4 h-4" />
                    }
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-xs text-white/30">
                    Valid until {new Date(offer.validUntil).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7"
                    onClick={() => copy(offer.code)}
                  >
                    Use Now
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
      </div>
    </div>
  );
}
