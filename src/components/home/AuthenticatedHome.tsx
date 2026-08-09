"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Calendar, Heart, Star, Clock, CheckCircle, Sparkles,
  TrendingUp, Award, MapPin, Loader2, ArrowRight, Crown,
  Zap, X, ChevronRight, Store, Users, Brain, Gift, Lock, Check, Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatPrice } from "@/lib/utils";
import toast from "react-hot-toast";

import { useAuth } from "@/lib/auth/useAuth";
import { createClient } from "@/lib/supabase/client";
import type { Booking, Salon } from "@/types";
import SearchBar from "@/components/shared/SearchBar";
import SalonCard from "@/components/shared/SalonCard";
import SalonCardSkeleton from "@/components/shared/SalonCardSkeleton";
import BookingReceiptModal from "@/components/booking/BookingReceipt";
import PaymentProcessor from "@/components/payment/PaymentProcessor";

const statusConfig = {
  confirmed: { label: "Confirmed", color: "emerald", icon: CheckCircle },
  completed: { label: "Completed", color: "blue", icon: CheckCircle },
  cancelled: { label: "Cancelled", color: "red", icon: X },
  pending: { label: "Pending", color: "amber", icon: Clock },
};

const MEMBERSHIP_PLANS = {
  basic: {
    name: "Basic",
    icon: Star,
    color: "text-white/70",
    bgGradient: "from-gray-600 to-gray-700",
    features: ["Book appointments", "View salon details", "Basic search", "Earn GlamPoints"],
    price: "Free",
    badge: null,
  },
  premium: {
    name: "Premium",
    icon: Sparkles,
    color: "text-purple-400",
    bgGradient: "from-purple-600 to-pink-600",
    features: ["Everything in Basic", "Priority booking", "Exclusive deals (up to 20% off)", "AI Beauty Recommendations", "Advanced filters"],
    price: "₹499/month",
    badge: "Most Popular",
  },
  vip: {
    name: "VIP",
    icon: Crown,
    color: "text-amber-400",
    bgGradient: "from-amber-500 to-orange-600",
    features: ["Everything in Premium", "Concierge service", "VIP-only salons access", "Up to 30% off bookings", "Free cancellation", "Personal beauty advisor"],
    price: "₹999/month",
    badge: "Best Value",
  },
};

export default function AuthenticatedHome() {
  const { profile } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [favSalons, setFavSalons] = useState<Salon[]>([]);
  const [recommendedSalons, setRecommendedSalons] = useState<Salon[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);
  const [isLoadingFavs, setIsLoadingFavs] = useState(true);
  const [isLoadingRecommended, setIsLoadingRecommended] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [receiptBooking, setReceiptBooking] = useState<Booking | null>(null);
  
  // Payment states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentOrderData, setPaymentOrderData] = useState<any>(null);
  const [upgrading, setUpgrading] = useState(false);

  const firstName = profile?.full_name?.split(" ")[0] ?? "there";
  const membershipTier = (profile as any)?.membership_tier ?? "basic";
  const glamPoints = (profile as any)?.glam_points ?? 0;

  // Handle upgrade plan with payment
  const handleUpgrade = async (tier: string) => {
    if (tier === "basic") return;
    
    setUpgrading(true);
    setShowUpgradeModal(false);
    
    try {
      const res = await fetch("/api/customer/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to create payment order");
      }

      setPaymentOrderData({
        orderId: data.orderId,
        amount: data.amount,
        tier: data.tier,
        planName: data.planName,
        planPrice: data.planPrice,
      });
      setShowPaymentModal(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to initiate upgrade");
    } finally {
      setUpgrading(false);
    }
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setPaymentOrderData(null);
    toast.success("🎉 Membership upgraded successfully!");
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  };

  const handlePaymentError = (error: string) => {
    toast.error(error || "Payment failed");
  };

  // Fetch bookings
  const fetchBookings = useCallback(async () => {
    if (!profile) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("bookings")
      .select(`
        *,
        salon:salons(name, cover_image, slug, address, area, city, phone),
        service:services(name, category, duration),
        staff:staff(name, role)
      `)
      .eq("user_id", profile.id)
      .order("booking_date", { ascending: false })
      .limit(4);

    const bookingsData = (data ?? []).map((b: any) => ({
      ...b,
      glam_points_earned: Math.floor((b.final_amount ?? 0) / 100) * 10,
      user_name: profile.full_name ?? "",
      user_email: profile.email ?? "",
      user_phone: (profile as any).phone ?? "",
    }));

    setBookings((bookingsData as Booking[]) ?? []);
    setIsLoadingBookings(false);
  }, [profile]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Fetch favorites
  useEffect(() => {
    async function loadFavorites() {
      try {
        const res = await fetch("/api/favorites");
        if (res.ok) {
          const data = await res.json();
          const salons = (data.favorites ?? []).map((f: { salon: Salon }) => f.salon).filter(Boolean);
          setFavSalons(salons.slice(0, 4));
        }
      } catch {
        setFavSalons([]);
      } finally {
        setIsLoadingFavs(false);
      }
    }
    loadFavorites();
  }, []);

  // Fetch recommended salons from Supabase
  useEffect(() => {
    async function loadRecommended() {
      try {
        const res = await fetch("/api/salons?sort=recommended&limit=3");
        if (res.ok) {
          const data = await res.json();
          setRecommendedSalons(data.salons ?? []);
        }
      } catch (err) {
        console.error("Failed to load recommended salons:", err);
      } finally {
        setIsLoadingRecommended(false);
      }
    }
    loadRecommended();
  }, []);

  const stats = {
    bookings: bookings.length,
    completed: bookings.filter((b) => b.status === "completed").length,
    upcoming: bookings.filter((b) => b.status === "confirmed").length,
    favorites: favSalons.length,
  };

  const currentPlan = MEMBERSHIP_PLANS[membershipTier as keyof typeof MEMBERSHIP_PLANS];
  const CurrentPlanIcon = currentPlan.icon;

  return (
    <>
      <div className="min-h-screen gradient-hero pt-20 pb-16">
        {/* Decorative background elements - same as landing page */}
        <div className="absolute top-1/4 -left-40 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-pink-600/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-violet-700/15 rounded-full blur-[100px] pointer-events-none" />

        {/* Hero Section - Clean & Image-based like landing */}
        <section className="relative py-12 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            {/* Welcome Header */}
            <div className="mb-10">
              <div className="flex items-center gap-4 mb-6">
                {profile?.avatar_url ? (
                  <div className="relative w-20 h-20 rounded-2xl overflow-hidden ring-2 ring-white/20 shadow-xl">
                    <Image src={profile.avatar_url} alt="Avatar" fill className="object-cover" sizes="80px" />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-2xl glass border border-white/20 flex items-center justify-center shadow-xl">
                    <span className="text-2xl font-bold text-white">
                      {profile?.full_name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() ?? "?"}
                    </span>
                  </div>
                )}
                <div>
                  <h1 className="text-4xl sm:text-5xl font-bold text-white mb-2">
                    Welcome back, {firstName}! 👋
                  </h1>
                  <p className="text-lg text-white/60">Your personalized beauty dashboard</p>
                </div>
              </div>


              {/* Stats Cards - Clean like landing page */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { icon: Calendar, value: stats.bookings, label: "Bookings", sublabel: `${stats.upcoming} upcoming` },
                  { icon: CheckCircle, value: stats.completed, label: "Completed", sublabel: "Total visits" },
                  { icon: Heart, value: stats.favorites, label: "Favorites", sublabel: "Saved salons" },
                  { icon: Gift, value: glamPoints, label: "GlamPoints", sublabel: "Rewards earned" },
                ].map(({ icon: Icon, value, label, sublabel }) => (
                  <div key={label} className="glass rounded-2xl p-5 border border-white/10 hover:border-purple-500/30 transition-all duration-300 group">
                    <Icon className="w-6 h-6 text-purple-400 mb-3 group-hover:scale-110 transition-transform" />
                    <p className="text-3xl font-bold gradient-text mb-1">{value}</p>
                    <p className="text-sm text-white/70 font-medium">{label}</p>
                    <p className="text-xs text-white/40 mt-0.5">{sublabel}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Membership Status */}
            <div className="glass rounded-2xl p-6 border border-white/20 mb-10">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className={cn("w-14 h-14 rounded-xl bg-gradient-to-br", currentPlan.bgGradient, "flex items-center justify-center shadow-lg")}>
                    <CurrentPlanIcon className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-bold text-white">{currentPlan.name} Member</h3>
                      {membershipTier === "basic" && (
                        <Badge variant="outline" className="text-xs border-white/30 text-white/60">Free Plan</Badge>
                      )}
                    </div>
                    <p className="text-sm text-white/60">
                      {membershipTier === "basic" 
                        ? "Upgrade to unlock premium features" 
                        : `${currentPlan.features.length} exclusive benefits included`}
                    </p>
                  </div>
                </div>
                {membershipTier === "basic" && (
                  <Button 
                    onClick={() => setShowUpgradeModal(true)}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Upgrade Now
                  </Button>
                )}
              </div>
            </div>

            {/* AI Virtual Try-On CTA - NEW! */}
            <Link href="/virtual-tryon">
              <div className="glass rounded-2xl p-8 border border-purple-500/30 hover:border-purple-500/60 transition-all duration-300 mb-10 group cursor-pointer relative overflow-hidden">
                {/* Animated Background */}
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/50 group-hover:scale-110 transition-transform duration-300">
                    <Wand2 className="w-10 h-10 text-white" />
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <div className="flex items-center gap-2 justify-center md:justify-start mb-2">
                      <h3 className="text-2xl font-bold gradient-text">AI Virtual Try-On</h3>
                      <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 border-0">NEW!</Badge>
                    </div>
                    <p className="text-white/70 mb-3">
                      Try hairstyles, facial treatments & makeup virtually with advanced AR technology!
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-white/50 justify-center md:justify-start">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4 text-purple-400" />
                        22 Hairstyles
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4 text-pink-400" />
                        17 Facial Treatments
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        8 Makeup Looks
                      </span>
                    </div>
                  </div>
                  <Button 
                    size="lg"
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg gap-2 group-hover:scale-105 transition-transform"
                  >
                    <Sparkles className="w-5 h-5" />
                    Try Now
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </Link>
          </div>
        </section>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-12">
          {/* Your Bookings */}
          <section id="bookings" className="scroll-mt-20">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Your Bookings</h2>
                <p className="text-sm text-white/50">Manage your appointments</p>
              </div>
              {bookings.length > 0 && (
                <Link href="/dashboard/bookings">
                  <Button variant="ghost" size="sm" className="gap-2">
                    View All <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              )}
            </div>

            {isLoadingBookings ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
              </div>
            ) : bookings.length === 0 ? (
              <div className="glass rounded-2xl p-10 border border-white/10 text-center">
                <Calendar className="w-16 h-16 text-white/30 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No bookings yet</h3>
                <p className="text-white/50 mb-6">Start your beauty journey today!</p>
                <Link href="/salons">
                  <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                    <Store className="w-4 h-4 mr-2" />
                    Browse Salons
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bookings.map((booking) => {
                  const sc = statusConfig[booking.status as keyof typeof statusConfig] ?? statusConfig.pending;
                  const StatusIcon = sc.icon;
                  const salonData = booking.salon as any;
                  return (
                    <div
                      key={booking.id}
                      onClick={() => setReceiptBooking(booking)}
                      className="glass rounded-2xl p-4 border border-white/10 hover:border-purple-500/30 transition-all duration-300 group cursor-pointer"
                    >
                      <div className="flex gap-4">
                        {salonData?.cover_image && (
                          <div className="relative w-24 h-24 rounded-xl overflow-hidden shrink-0 bg-white/5">
                            <Image src={salonData.cover_image} alt={salonData.name ?? ""} fill className="object-cover" sizes="96px" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white mb-1 truncate group-hover:text-purple-300 transition-colors">
                            {salonData?.name ?? "Salon"}
                          </p>
                          <p className="text-sm text-white/60 truncate mb-2">{(booking.service as any)?.name ?? "Service"}</p>
                          <div className="flex items-center gap-3 text-xs text-white/50 mb-2">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(booking.booking_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {booking.time_slot}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className={cn("text-xs border", `border-${sc.color}-500/50 text-${sc.color}-400`)}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {sc.label}
                            </Badge>
                            <span className="text-sm font-bold text-white">{formatPrice(booking.final_amount)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Your Favorites */}
          <section id="favorites" className="scroll-mt-20">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Your Favorites</h2>
                <p className="text-sm text-white/50">Quick access to your loved salons</p>
              </div>
              {favSalons.length > 0 && (
                <Link href="/salons">
                  <Button variant="ghost" size="sm" className="gap-2">
                    View All <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              )}
            </div>

            {isLoadingFavs ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
              </div>
            ) : favSalons.length === 0 ? (
              <div className="glass rounded-2xl p-10 border border-white/10 text-center">
                <Heart className="w-16 h-16 text-white/30 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No favorites yet</h3>
                <p className="text-white/50 mb-6">Heart your favorite salons for quick access!</p>
                <Link href="/salons">
                  <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                    <Star className="w-4 h-4 mr-2" />
                    Explore Salons
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {favSalons.map((salon) => (
                  <SalonCard key={salon.id} salon={salon} />
                ))}
              </div>
            )}
          </section>

          {/* Recommended For You */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Recommended For You</h2>
                <p className="text-sm text-white/50">AI-powered suggestions</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {isLoadingRecommended
                ? Array.from({ length: 3 }).map((_, i) => <SalonCardSkeleton key={i} />)
                : recommendedSalons.map((salon) => (
                    <SalonCard key={salon.id} salon={salon} />
                  ))}
            </div>

            <Link href="/ai-assistant">
              <Button variant="outline" size="lg" className="w-full gap-2 h-14 border-white/20 hover:border-purple-500/50 hover:bg-purple-500/10">
                <Brain className="w-5 h-5" />
                Get AI-Powered Beauty Recommendations
                <ChevronRight className="w-5 h-5 ml-auto" />
              </Button>
            </Link>
          </section>

          {/* Quick Actions */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "All Salons", href: "/salons", icon: Store },
              { label: "Offers", href: "/offers", icon: Award },
              { label: "AI Assistant", href: "/ai-assistant", icon: Brain },
              { label: "Trending", href: "/salons?sort=rating", icon: TrendingUp },
            ].map(({ label, href, icon: Icon }) => (
              <Link
                key={label}
                href={href}
                className="glass rounded-2xl p-6 border border-white/10 hover:border-purple-500/30 transition-all duration-300 text-center group"
              >
                <Icon className="w-8 h-8 text-purple-400 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                <p className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">{label}</p>
              </Link>
            ))}
          </section>
        </div>
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowUpgradeModal(false)}>
          <div className="bg-[#0a0a0f] rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-y-auto border border-white/20" onClick={(e) => e.stopPropagation()}>
            <div className="p-8">
              <div className="text-center mb-10">
                <h2 className="text-3xl font-bold text-white mb-3">Choose Your Plan</h2>
                <p className="text-white/60">Unlock exclusive features and premium benefits</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Object.entries(MEMBERSHIP_PLANS).map(([tier, plan]) => {
                  const PlanIcon = plan.icon;
                  const isCurrentPlan = tier === membershipTier;
                  return (
                    <div
                      key={tier}
                      className={cn(
                        "glass rounded-2xl p-6 border transition-all duration-300",
                        isCurrentPlan ? "border-purple-500/50 ring-2 ring-purple-500/30" : "border-white/10 hover:border-purple-500/30"
                      )}
                    >
                      {plan.badge && (
                        <Badge className="mb-4 bg-gradient-to-r from-purple-600 to-pink-600 border-0">
                          {plan.badge}
                        </Badge>
                      )}
                      
                      <div className={cn("w-12 h-12 rounded-xl bg-gradient-to-br", plan.bgGradient, "flex items-center justify-center mb-4")}>
                        <PlanIcon className="w-6 h-6 text-white" />
                      </div>
                      
                      <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                      <p className="text-3xl font-bold gradient-text mb-6">{plan.price}</p>
                      
                      <ul className="space-y-3 mb-6">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-white/70">
                            <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                      
                      <Link href={tier === "basic" ? "#" : "/upgrade"}>
                        <Button 
                          disabled={isCurrentPlan || upgrading}
                          onClick={(e) => {
                            if (tier !== "basic" && !isCurrentPlan) {
                              e.preventDefault();
                              handleUpgrade(tier);
                            }
                          }}
                          className={cn(
                            "w-full",
                            tier === "basic" ? "bg-white/10 hover:bg-white/20" : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                          )}
                        >
                          {upgrading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : isCurrentPlan ? (
                            "Current Plan"
                          ) : tier === "basic" ? (
                            "Downgrade"
                          ) : (
                            "Upgrade"
                          )}
                        </Button>
                      </Link>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 text-center">
                <button onClick={() => setShowUpgradeModal(false)} className="text-white/50 hover:text-white transition-colors">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {receiptBooking && (
        <BookingReceiptModal
          booking={receiptBooking as any}
          onClose={() => setReceiptBooking(null)}
        />
      )}

      {/* Payment Modal */}
      {showPaymentModal && paymentOrderData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => {
          setShowPaymentModal(false);
          setPaymentOrderData(null);
        }}>
          <div 
            className="relative w-full max-w-md glass-dark rounded-3xl p-6 border border-purple-500/20 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setShowPaymentModal(false);
                setPaymentOrderData(null);
              }}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Complete Payment</h2>
              <p className="text-white/60 text-sm">
                Upgrading to {paymentOrderData.planName} - ₹{paymentOrderData.planPrice}
              </p>
            </div>

            <PaymentProcessor
              amount={paymentOrderData.amount}
              orderId={paymentOrderData.orderId}
              type="plan_upgrade_customer"
              metadata={{
                tier: paymentOrderData.tier,
                tierName: paymentOrderData.planName,
              }}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
            />
          </div>
        </div>
      )}
    </>
  );
}
