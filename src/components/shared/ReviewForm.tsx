"use client";

import { useState } from "react";
import { Star, Loader2, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import type { Review } from "@/types";

interface Props {
  salonId: string;
  bookingId?: string;
  onClose: () => void;
  onSubmitted: (review: Review) => void;
}

export default function ReviewForm({ salonId, bookingId, onClose, onSubmitted }: Props) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const activeRating = hoveredRating || rating;

  const ratingLabels = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }
    if (comment.length < 20) {
      toast.error("Review must be at least 20 characters");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salon_id: salonId,
          booking_id: bookingId ?? null,
          rating,
          comment,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Failed to submit review");
        setIsSubmitting(false);
        return;
      }

      setIsSuccess(true);
      toast.success("Review submitted! ✨");
      setTimeout(() => {
        onSubmitted(data.review);
        onClose();
      }, 1500);
    } catch {
      toast.error("Network error. Please try again.");
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto mb-4 animate-glow">
          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-1">Thank you!</h3>
        <p className="text-white/50 text-sm">Your review helps others find great salons.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Write a Review</h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Star Rating */}
      <div className="mb-6">
        <p className="text-xs text-white/40 mb-2">Tap to rate</p>
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className="transition-transform duration-150 hover:scale-125"
              aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
            >
              <Star
                className={cn(
                  "w-8 h-8 transition-colors duration-150",
                  star <= activeRating
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-white/20 hover:text-yellow-400/40"
                )}
              />
            </button>
          ))}
          {activeRating > 0 && (
            <span className={cn(
              "text-sm font-medium ml-2",
              activeRating >= 4 ? "text-emerald-400" : activeRating >= 3 ? "text-yellow-400" : "text-red-400"
            )}>
              {ratingLabels[activeRating]}
            </span>
          )}
        </div>
      </div>

      {/* Comment */}
      <div className="mb-6">
        <label htmlFor="review-comment" className="block text-xs text-white/40 mb-1.5">
          Your Review
        </label>
        <textarea
          id="review-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your experience... What did you love? How was the service quality?"
          rows={4}
          maxLength={500}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-purple-500/50 resize-none transition-colors"
        />
        <div className="flex justify-between mt-1">
          <p className={cn("text-xs", comment.length < 20 ? "text-white/30" : "text-emerald-400/60")}>
            {comment.length < 20 ? `${20 - comment.length} more characters needed` : "✓ Minimum reached"}
          </p>
          <p className="text-xs text-white/30">{comment.length}/500</p>
        </div>
      </div>

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || rating === 0 || comment.length < 20}
        className="w-full h-11 gap-2"
      >
        {isSubmitting ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
        ) : (
          <>Submit Review</>
        )}
      </Button>
    </div>
  );
}
