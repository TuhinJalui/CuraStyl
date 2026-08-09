"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  MapPin, Phone, Globe, Star, BadgeCheck, Heart, Share2,
  Clock, ChevronLeft, Camera, Wifi, ParkingCircle,
  CreditCard, Wind, Home, Sparkles, ThumbsUp, Loader2, MessageSquarePlus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import StarRating from "@/components/shared/StarRating";
import ReviewForm from "@/components/shared/ReviewForm";
import BookingWidget from "@/components/booking/BookingWidget";
import { formatPrice, formatRating, cn } from "@/lib/utils";
import { useFavorites } from "@/lib/favorites/useFavorites";
import { useAuth } from "@/lib/auth/useAuth";
import type { Salon, Service, Staff, Review } from "@/types";
import SalonCard from "@/components/shared/SalonCard";
import toast from "react-hot-toast";

const AMENITY_ICONS: Record<string, React.ReactNode> = {
  "WiFi": <Wifi className="w-4 h-4" />,
  "Parking": <ParkingCircle className="w-4 h-4" />,
  "Card Payment": <CreditCard className="w-4 h-4" />,
  "Air Conditioned": <Wind className="w-4 h-4" />,
  "Home Service": <Home className="w-4 h-4" />,
};

type ReviewSort = "recent" | "helpful" | "highest";

export default function SalonDetailClient({ salon }: { salon: Salon }) {
  const [activeTab, setActiveTab] = useState<"services" | "staff" | "reviews" | "about">("services");
  const [galleryIdx, setGalleryIdx] = useState<number | null>(null);

  // Auth & Favorites
  const { isLoggedIn } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const isFav = isFavorite(salon.id);

  // Real services & staff from Supabase
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [similarSalons, setSimilarSalons] = useState<Salon[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [staffLoading, setStaffLoading] = useState(true);

  // Reviews state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewSort, setReviewSort] = useState<ReviewSort>("recent");
  const [reviewCursor, setReviewCursor] = useState<string | null>(null);
  const [hasMoreReviews, setHasMoreReviews] = useState(true);
  const [distribution, setDistribution] = useState<number[]>([0, 0, 0, 0, 0]);
  const [totalReviews, setTotalReviews] = useState(0);
  const [showReviewForm, setShowReviewForm] = useState(false);

  const allImages = [salon.cover_image, ...(salon.gallery_images ?? [])].filter(Boolean);

  // Fetch services
  useEffect(() => {
    async function loadServices() {
      setServicesLoading(true);
      try {
        const res = await fetch(`/api/salons/${salon.id}/services`);
        if (res.ok) {
          const data = await res.json();
          setServices(data.services ?? []);
        }
      } catch (err) {
        console.error("Failed to load services:", err);
      } finally {
        setServicesLoading(false);
      }
    }
    loadServices();
  }, [salon.id]);

  // Fetch staff
  useEffect(() => {
    async function loadStaff() {
      setStaffLoading(true);
      try {
        const res = await fetch(`/api/salons/${salon.id}/staff`);
        if (res.ok) {
          const data = await res.json();
          setStaff(data.staff ?? []);
        }
      } catch (err) {
        console.error("Failed to load staff:", err);
      } finally {
        setStaffLoading(false);
      }
    }
    loadStaff();
  }, [salon.id]);

  // Fetch similar salons (same area, excluding current)
  useEffect(() => {
    async function loadSimilar() {
      try {
        const res = await fetch(`/api/salons?area=${encodeURIComponent(salon.area)}&limit=4`);
        if (res.ok) {
          const data = await res.json();
          setSimilarSalons((data.salons ?? []).filter((s: Salon) => s.id !== salon.id).slice(0, 3));
        }
      } catch (err) {
        console.error("Failed to load similar salons:", err);
      }
    }
    loadSimilar();
  }, [salon.id, salon.area]);

  // Fetch reviews
  const fetchReviews = useCallback(async (sort: ReviewSort, cursor?: string | null) => {
    setReviewsLoading(true);
    try {
      const params = new URLSearchParams({ salonId: salon.id, sort });
      if (cursor) params.set("cursor", cursor);

      const res = await fetch(`/api/reviews?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");

      const data = await res.json();

      if (cursor) {
        setReviews((prev) => [...prev, ...data.reviews]);
      } else {
        setReviews(data.reviews);
      }

      setReviewCursor(data.nextCursor);
      setHasMoreReviews(!!data.nextCursor);
      setDistribution(data.distribution);
      setTotalReviews(data.total);
    } catch {
      setReviews([]);
      setHasMoreReviews(false);
      setTotalReviews(0);
    } finally {
      setReviewsLoading(false);
    }
  }, [salon.id]);

  // Load reviews when tab is opened
  useEffect(() => {
    if (activeTab === "reviews" && reviews.length === 0) {
      fetchReviews(reviewSort);
    }
  }, [activeTab, reviews.length, reviewSort, fetchReviews]);

  // Re-fetch when sort changes
  const handleSortChange = (sort: ReviewSort) => {
    setReviewSort(sort);
    setReviewCursor(null);
    fetchReviews(sort);
  };

  // Vote helpful
  const handleHelpful = async (reviewId: string) => {
    if (!isLoggedIn) {
      toast.error("Sign in to vote");
      return;
    }

    // Optimistic
    setReviews((prev) =>
      prev.map((r) =>
        r.id === reviewId ? { ...r, helpful_count: (r.helpful_count ?? 0) + 1 } : r
      )
    );

    try {
      await fetch("/api/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ review_id: reviewId }),
      });
    } catch {
      // Revert
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId ? { ...r, helpful_count: Math.max(0, (r.helpful_count ?? 0) - 1) } : r
        )
      );
    }
  };

  // Handle new review submitted
  const handleReviewSubmitted = (review: Review) => {
    setReviews((prev) => [review, ...prev]);
    setTotalReviews((prev) => prev + 1);
  };

  // Handle favorite toggle
  const handleFavoriteToggle = () => {
    if (!isLoggedIn) {
      toast.error("Sign in to save favorites");
      return;
    }
    toggleFavorite(salon.id);
  };

  // Calculate average from distribution
  const avgRating = totalReviews > 0
    ? distribution.reduce((sum, count, i) => sum + count * (i + 1), 0) / totalReviews
    : salon.rating;

  return (
    <div className="min-h-screen gradient-hero pt-16">
      {/* Back */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Link
          href="/salons"
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors mb-4 group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Salons
        </Link>
      </div>

      {/* Hero Gallery */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="grid grid-cols-4 grid-rows-2 gap-2 h-80 sm:h-96 rounded-2xl overflow-hidden">
          {/* Main image */}
          <div
            className="col-span-2 row-span-2 relative cursor-pointer group"
            onClick={() => setGalleryIdx(0)}
          >
            {salon.cover_image ? (
              <Image
                src={salon.cover_image}
                alt={salon.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                priority
                sizes="50vw"
              />
            ) : (
              <div className="w-full h-full bg-purple-900/30 flex items-center justify-center">
                <Sparkles className="w-12 h-12 text-purple-400/50" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-br from-black/20 to-transparent group-hover:from-black/30 transition-all" />
          </div>
          {/* Side images */}
          {(salon.gallery_images ?? []).slice(0, 4).map((img, i) => (
            <div
              key={i}
              className="relative cursor-pointer group overflow-hidden"
              onClick={() => setGalleryIdx(i + 1)}
            >
              <Image
                src={img}
                alt={`${salon.name} gallery ${i + 1}`}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-500"
                sizes="25vw"
              />
              {i === 3 && (salon.gallery_images ?? []).length > 4 && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-white font-semibold flex items-center gap-1.5">
                    <Camera className="w-4 h-4" />
                    +{(salon.gallery_images ?? []).length - 4} more
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Fullscreen gallery modal */}
      {galleryIdx !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setGalleryIdx(null)}
        >
          <button className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
            ✕
          </button>
          <div className="relative w-full max-w-4xl h-[80vh]">
            <Image
              src={allImages[galleryIdx]}
              alt={`Gallery ${galleryIdx}`}
              fill
              className="object-contain"
              sizes="90vw"
            />
          </div>
          {/* Thumbnails */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {allImages.map((img, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setGalleryIdx(i); }}
                className={cn("w-12 h-8 rounded overflow-hidden border-2 transition-all relative", i === galleryIdx ? "border-purple-400" : "border-transparent opacity-60")}
              >
                <Image src={img} alt="" fill className="object-cover" sizes="48px" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Info */}
          <div className="lg:col-span-2">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-6">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <h1 className="text-2xl sm:text-3xl font-bold text-white">{salon.name}</h1>
                  {salon.is_verified && (
                    <Badge variant="success" className="gap-1">
                      <BadgeCheck className="w-3 h-3" /> Verified
                    </Badge>
                  )}
                  <Badge variant={salon.category === "women" ? "default" : salon.category === "men" ? "secondary" : "warning"}>
                    {salon.category === "women" ? "Women" : salon.category === "men" ? "Men" : "Unisex"}
                  </Badge>
                </div>
                {salon.tagline && (
                  <p className="text-purple-300/80 italic text-sm mb-2">&ldquo;{salon.tagline}&rdquo;</p>
                )}
                <div className="flex flex-wrap items-center gap-4 text-sm text-white/60">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-bold text-white">{formatRating(salon.rating)}</span>
                    <span>({salon.review_count} reviews)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-pink-400" />
                    {salon.area}, {salon.city}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Open Now</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleFavoriteToggle}
                  className="p-2.5 rounded-xl glass border border-white/10 hover:bg-white/10 transition-all"
                  aria-label="Favorite"
                >
                  <Heart className={cn("w-5 h-5 transition-all", isFav ? "fill-pink-500 text-pink-500" : "text-white/60")} />
                </button>
                <button
                  onClick={() => {
                    const hasCoords = salon.lat && salon.lng;
                    const googleMapsUrl = salon.google_maps_url
                      ? salon.google_maps_url
                      : hasCoords
                      ? `https://www.google.com/maps/search/?api=1&query=${salon.lat},${salon.lng}`
                      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${salon.name} ${salon.address} ${salon.city}`)}`;
                    
                    if (navigator.share) {
                      navigator.share({
                        title: salon.name,
                        text: `Check out ${salon.name} - ${salon.tagline || 'Beauty Salon'}`,
                        url: googleMapsUrl,
                      }).catch(() => {
                        // Fallback if share fails
                        navigator.clipboard.writeText(googleMapsUrl);
                        toast.success("Google Maps link copied to clipboard!");
                      });
                    } else {
                      // Fallback for browsers without Web Share API
                      navigator.clipboard.writeText(googleMapsUrl);
                      toast.success("Google Maps link copied to clipboard!");
                    }
                  }}
                  className="p-2.5 rounded-xl glass border border-white/10 hover:bg-white/10 transition-all"
                  aria-label="Share"
                >
                  <Share2 className="w-5 h-5 text-white/60" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-white/5 rounded-xl p-1 w-fit">
              {(["services", "staff", "reviews", "about"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all duration-200",
                    activeTab === tab
                      ? "bg-purple-500/30 text-white shadow-sm"
                      : "text-white/50 hover:text-white"
                  )}
                >
                  {tab}
                  {tab === "reviews" && totalReviews > 0 && (
                    <span className="ml-1.5 text-xs text-white/30">({totalReviews})</span>
                  )}
                </button>
              ))}
            </div>

            {/* Services Tab */}
            {activeTab === "services" && (
              <div className="space-y-3">
                {servicesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                  </div>
                ) : services.length === 0 ? (
                  <div className="text-center py-8 text-white/40">No services listed yet</div>
                ) : (
                  services.map((service) => (
                    <div key={service.id} className="glass-card p-4 flex items-center justify-between gap-4 hover:border-purple-500/30">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-white">{service.name}</h3>
                          <Badge variant="secondary" className="text-[10px]">{service.category}</Badge>
                        </div>
                        {service.description && (
                          <p className="text-sm text-white/50 mb-1">{service.description}</p>
                        )}
                        <p className="text-xs text-white/30">{service.duration} min</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xl font-bold gradient-text">{formatPrice(service.price)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Staff Tab */}
            {activeTab === "staff" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {staffLoading ? (
                  <div className="flex items-center justify-center py-12 col-span-2">
                    <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                  </div>
                ) : staff.length === 0 ? (
                  <div className="text-center py-8 text-white/40 col-span-2">No staff listed yet</div>
                ) : (
                  staff.map((member) => (
                    <div key={member.id} className="glass-card p-4 flex items-center gap-4">
                      <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0">
                        {member.avatar_url ? (
                          <Image src={member.avatar_url} alt={member.name} fill className="object-cover" sizes="64px" />
                        ) : (
                          <div className="w-full h-full bg-purple-500/20 flex items-center justify-center text-2xl font-bold text-purple-300">
                            {member.name[0]}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white">{member.name}</p>
                        <p className="text-sm text-purple-300">{member.role}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm text-white/70">{member.rating}</span>
                          <span className="text-xs text-white/30">• {member.experience_years}yr exp</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {(member.specialization ?? []).slice(0, 2).map((spec) => (
                            <span key={spec} className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300">
                              {spec}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Reviews Tab */}
            {activeTab === "reviews" && (
              <div className="space-y-4">
                {/* Summary */}
                <div className="glass-card p-5 flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-5xl font-bold gradient-text">{formatRating(avgRating)}</p>
                    <StarRating rating={avgRating} size="sm" />
                    <p className="text-xs text-white/40 mt-1">{totalReviews || salon.review_count} reviews</p>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = distribution[star - 1] ?? 0;
                      const pct = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : (star === 5 ? 60 : star === 4 ? 25 : star === 3 ? 10 : star === 2 ? 3 : 2);
                      return (
                        <div key={star} className="flex items-center gap-2 text-xs">
                          <span className="text-white/40 w-3">{star}</span>
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-white/40 w-6 text-right">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Write Review + Sort */}
                <div className="flex items-center justify-between">
                  {isLoggedIn && (
                    <Button
                      size="sm"
                      onClick={() => setShowReviewForm(true)}
                      className="gap-1.5"
                    >
                      <MessageSquarePlus className="w-4 h-4" /> Write Review
                    </Button>
                  )}
                  <div className="flex gap-1 ml-auto">
                    {(["recent", "helpful", "highest"] as ReviewSort[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => handleSortChange(s)}
                        className={cn(
                          "text-xs px-3 py-1.5 rounded-full border transition-all capitalize",
                          reviewSort === s
                            ? "border-purple-400/60 bg-purple-500/15 text-purple-300"
                            : "border-white/10 text-white/40 hover:text-white hover:border-white/20"
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Review Form Modal */}
                {showReviewForm && (
                  <div className="glass-card p-5 border-purple-500/30">
                    <ReviewForm
                      salonId={salon.id}
                      onClose={() => setShowReviewForm(false)}
                      onSubmitted={handleReviewSubmitted}
                    />
                  </div>
                )}

                {/* Review List */}
                {reviewsLoading && reviews.length === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                  </div>
                ) : reviews.length === 0 ? (
                  <div className="text-center py-12 glass-card">
                    <div className="text-4xl mb-3">📝</div>
                    <h3 className="text-lg font-semibold text-white mb-1">No reviews yet</h3>
                    <p className="text-white/50 text-sm mb-4">Be the first to share your experience!</p>
                    {isLoggedIn && (
                      <Button size="sm" onClick={() => setShowReviewForm(true)}>Write the First Review</Button>
                    )}
                  </div>
                ) : (
                  <>
                    {reviews.map((review) => (
                      <div key={review.id} className="glass-card p-4">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500/40 to-pink-500/40 border border-purple-500/30 flex items-center justify-center font-bold text-white/80">
                              {(review.user as { full_name?: string })?.full_name?.[0] ?? "U"}
                            </div>
                            <div>
                              <p className="font-medium text-white text-sm">{(review.user as { full_name?: string })?.full_name ?? "User"}</p>
                              <div className="flex items-center gap-2">
                                <StarRating rating={review.rating} size="sm" />
                                {review.is_verified && (
                                  <span className="text-[10px] text-emerald-400 flex items-center gap-0.5">
                                    <BadgeCheck className="w-3 h-3" /> Verified
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <span className="text-xs text-white/30">
                            {new Date(review.created_at).toLocaleDateString("en-IN")}
                          </span>
                        </div>
                        <p className="text-sm text-white/70 leading-relaxed mb-3">{review.comment}</p>
                        <button
                          onClick={() => handleHelpful(review.id)}
                          className="flex items-center gap-1.5 text-xs text-white/30 hover:text-purple-300 transition-colors"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          Helpful {review.helpful_count > 0 && `(${review.helpful_count})`}
                        </button>
                      </div>
                    ))}

                    {/* Load More */}
                    {hasMoreReviews && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchReviews(reviewSort, reviewCursor)}
                        disabled={reviewsLoading}
                        className="w-full gap-2"
                      >
                        {reviewsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        Load More Reviews
                      </Button>
                    )}
                  </>
                )}
              </div>
            )}

            {/* About Tab */}
            {activeTab === "about" && (
              <div className="space-y-6">
                <div className="glass-card p-5">
                  <h3 className="font-semibold text-white mb-3">About the Salon</h3>
                  <p className="text-white/60 leading-relaxed">{salon.description}</p>
                </div>

                <div className="glass-card p-5">
                  <h3 className="font-semibold text-white mb-4">Amenities</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {(salon.amenities ?? []).map((amenity) => (
                      <div key={amenity} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/70">
                        <span className="text-purple-400">
                          {AMENITY_ICONS[amenity] ?? <Sparkles className="w-4 h-4" />}
                        </span>
                        {amenity}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass-card p-5">
                  <h3 className="font-semibold text-white mb-4">Contact &amp; Location</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-pink-400 mt-0.5 shrink-0" />
                      <p className="text-sm text-white/60">{salon.address}, {salon.city} - {salon.pincode}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-purple-400 shrink-0" />
                      <a href={`tel:${salon.phone}`} className="text-sm text-purple-300 hover:underline">{salon.phone}</a>
                    </div>
                    {salon.website && (
                      <div className="flex items-center gap-3">
                        <Globe className="w-4 h-4 text-blue-400 shrink-0" />
                        <a href={salon.website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-300 hover:underline">{salon.website}</a>
                      </div>
                    )}
                  </div>

                  {/* Interactive Map + Google Maps link */}
                  {(() => {
                    const hasCoords = salon.lat && salon.lng;
                    const googleMapsUrl = salon.google_maps_url
                      ? salon.google_maps_url
                      : hasCoords
                      ? `https://www.google.com/maps/search/?api=1&query=${salon.lat},${salon.lng}`
                      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${salon.name} ${salon.address} ${salon.city}`)}`;

                    const osmEmbedUrl = hasCoords
                      ? `https://www.openstreetmap.org/export/embed.html?bbox=${salon.lng! - 0.005},${salon.lat! - 0.005},${salon.lng! + 0.005},${salon.lat! + 0.005}&layer=mapnik&marker=${salon.lat},${salon.lng}`
                      : null;

                    return (
                      <div className="mt-4 space-y-2">
                        {osmEmbedUrl ? (
                          <a
                            href={googleMapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block rounded-xl overflow-hidden border border-white/10 hover:border-purple-500/40 transition-colors group relative"
                            title="Click to open in Google Maps"
                          >
                            <iframe
                              src={osmEmbedUrl}
                              className="w-full h-52 pointer-events-none"
                              style={{ border: 0 }}
                              loading="lazy"
                              title={`Map showing location of ${salon.name}`}
                            />
                            {/* Overlay hint */}
                            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-3 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MapPin className="w-4 h-4 text-pink-400" />
                              <span className="text-white text-xs font-medium">Open in Google Maps →</span>
                            </div>
                          </a>
                        ) : (
                          <div className="rounded-xl bg-white/5 border border-white/10 h-32 flex flex-col items-center justify-center gap-2 text-white/30 text-sm">
                            <MapPin className="w-5 h-5" />
                            <span>Location not pinned yet</span>
                          </div>
                        )}
                        <a
                          href={googleMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-white/5 border border-white/10 hover:border-purple-500/40 hover:bg-purple-500/10 text-white/60 hover:text-white text-sm transition-all"
                        >
                          <MapPin className="w-4 h-4 text-pink-400" />
                          <span>Open in Google Maps</span>
                        </a>
                      </div>
                    );
                  })()}

                </div>
              </div>
            )}
          </div>

          {/* Right: Booking Widget */}
          <div className="lg:col-span-1">
            <div className="sticky top-28">
              <BookingWidget salon={salon} services={services} staff={staff} />
            </div>
          </div>
        </div>

        {/* Similar Salons */}
        {similarSalons.length > 0 && (
          <div className="mt-16 pb-16">
            <h2 className="text-2xl font-bold text-white mb-6">
              Similar Salons in <span className="gradient-text">{salon.area}</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {similarSalons.map((s) => (
                <SalonCard key={s.id} salon={s} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
