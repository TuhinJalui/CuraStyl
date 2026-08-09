"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  maxStars?: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onChange?: (rating: number) => void;
}

export default function StarRating({
  rating,
  maxStars = 5,
  size = "md",
  interactive = false,
  onChange,
}: StarRatingProps) {
  const sizeMap = { sm: "w-3 h-3", md: "w-4 h-4", lg: "w-6 h-6" };
  const iconSize = sizeMap[size];

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: maxStars }, (_, i) => {
        const filled = i < Math.floor(rating);
        const half = !filled && i < rating;
        return (
          <button
            key={i}
            disabled={!interactive}
            onClick={() => interactive && onChange?.(i + 1)}
            className={cn(
              "transition-transform duration-150",
              interactive && "hover:scale-125 cursor-pointer"
            )}
          >
            <Star
              className={cn(
                iconSize,
                filled || half
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-white/20"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
