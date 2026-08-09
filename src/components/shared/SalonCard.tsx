"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, Star, MapPin, BadgeCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatPrice, formatRating } from "@/lib/utils";
import { useFavorites } from "@/lib/favorites/useFavorites";
import type { Salon } from "@/types";

interface SalonCardProps {
  salon: Salon;
  viewMode?: "grid" | "list";
}

export default function SalonCard({ salon, viewMode = "grid" }: SalonCardProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const isFavorited = isFavorite(salon.id);
  const [imgError, setImgError] = useState(false);
  const fallbackImage = "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop";
  const imageSrc = imgError || !salon.cover_image ? fallbackImage : salon.cover_image;

  const categoryLabel =
    salon.category === "women"
      ? "Women"
      : salon.category === "men"
      ? "Men"
      : "Unisex";

  if (viewMode === "list") {
    return (
      <div className="glass-card flex gap-4 p-4 group">
        <div className="relative w-40 h-32 shrink-0 rounded-xl overflow-hidden">
          <Image
            src={imageSrc}
            alt={salon.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setImgError(true)}
            sizes="160px"
          />
          {salon.is_verified && (
            <div className="absolute top-2 left-2">
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 backdrop-blur-sm">
                <BadgeCheck className="w-3 h-3 text-emerald-400" />
                <span className="text-[10px] text-emerald-400 font-medium">Verified</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-white text-base truncate">{salon.name}</h3>
                <Badge variant={salon.category === "women" ? "default" : salon.category === "men" ? "secondary" : "warning"} className="shrink-0">
                  {categoryLabel}
                </Badge>
              </div>
              <div className="flex items-center gap-1 text-sm text-white/50 mb-2">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{salon.area}, {salon.city}</span>
                {salon.distance && (
                  <span className="text-white/30">• {salon.distance.toFixed(1)} km</span>
                )}
              </div>
            </div>

            <button
              onClick={() => toggleFavorite(salon.id)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors shrink-0"
              aria-label="Toggle favorite"
            >
              <Heart className={cn("w-4 h-4 transition-colors", isFavorited ? "fill-pink-500 text-pink-500" : "text-white/40")} />
            </button>
          </div>

          <div className="flex items-center gap-4 text-sm mb-3">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="text-white font-medium">{formatRating(salon.rating)}</span>
              <span className="text-white/40">({salon.review_count})</span>
            </div>
            <div className="text-white/50">
              From <span className="text-purple-300 font-semibold">{formatPrice(salon.starting_price)}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-1 mb-3">
            {(salon.amenities || []).slice(0, 3).map((amenity) => (
              <span key={amenity} className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/50">
                {amenity}
              </span>
            ))}
          </div>

          <Link href={`/salons/${salon.slug}`}>
            <Button size="sm" className="h-8">Book Now</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card group overflow-hidden">
      {/* Image */}
      <div className="relative h-52 overflow-hidden rounded-t-2xl">
        <Image
          src={imageSrc}
          alt={salon.name}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-110"
          onError={() => setImgError(true)}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Top badges */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          {salon.is_verified && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 backdrop-blur-md">
              <BadgeCheck className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] text-emerald-400 font-semibold">Verified</span>
            </div>
          )}
          <div className="px-2 py-1 rounded-full bg-black/40 border border-white/20 backdrop-blur-md">
            <span className="text-[10px] text-white/80 font-medium">{categoryLabel}</span>
          </div>
        </div>

        {/* Favorite button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            toggleFavorite(salon.id);
          }}
          className="absolute top-3 right-3 p-2 rounded-full bg-black/40 backdrop-blur-md border border-white/20 hover:bg-black/60 transition-all duration-200"
          aria-label="Toggle favorite"
        >
          <Heart className={cn("w-4 h-4 transition-all duration-300", isFavorited ? "fill-pink-500 text-pink-500 scale-110" : "text-white")} />
        </button>

        {/* Rating badge */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md">
          <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
          <span className="text-white text-xs font-bold">{formatRating(salon.rating)}</span>
          <span className="text-white/60 text-xs">({salon.review_count})</span>
        </div>

        {/* Distance */}
        {salon.distance !== undefined && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 backdrop-blur-md">
            <MapPin className="w-3 h-3 text-purple-400" />
            <span className="text-white/80 text-xs">{salon.distance.toFixed(1)} km</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-white text-base leading-tight group-hover:text-purple-300 transition-colors line-clamp-1">
            {salon.name}
          </h3>
        </div>

        <div className="flex items-center gap-1.5 text-white/50 text-sm mb-3">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span>{salon.area}, Mumbai</span>
        </div>

        {/* Amenities */}
        <div className="flex flex-wrap gap-1 mb-4">
            {(salon.amenities || []).slice(0, 3).map((amenity) => (
            <span
              key={amenity}
              className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/50"
            >
              {amenity}
            </span>
          ))}
            {((salon.amenities || []).length > 3) && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/40">
                +{(salon.amenities || []).length - 3}
              </span>
            )}
        </div>

        {/* Price + CTA */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] text-white/40 mb-0.5">Starting from</p>
            <p className="text-lg font-bold gradient-text">{formatPrice(salon.starting_price)}</p>
          </div>
          <Link href={`/salons/${salon.slug}`}>
            <Button size="sm" className="gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              Book Now
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
