"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth/useAuth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  Gift, Star, Zap, Crown, ArrowLeft, Sparkles, Lock,
  CheckCircle, Trophy, TrendingUp, Calendar, ShoppingBag, ExternalLink, Loader2, Copy, Ticket, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import PaymentProcessor from "@/components/payment/PaymentProcessor";

const REWARDS_CATALOG = [
  {
    id: "r1",
    title: "₹100 Off Your Next Booking",
    description: "Redeem 500 GlamPoints for ₹100 discount on any service",
    points: 500,
    icon: "🎟️",
    category: "discount",
    color: "from-purple-500 to-pink-500",
  },
  {
    id: "r2",
    title: "Free Hair Spa Treatment",
    description: "Get a complimentary hair spa at partner salons",
    points: 1500,
    icon: "💆",
    category: "free-service",
    color: "from-blue-500 to-cyan-500",
  },
  {
    id: "r3",
    title: "₹500 Off Bridal Package",
    description: "Massive discount on any bridal package above ₹5000",
    points: 2000,
    icon: "👰",
    category: "discount",
    color: "from-rose-500 to-pink-500",
  },
  {
    id: "r4",
    title: "VIP Membership Upgrade",
    description: "Upgrade to VIP tier for 1 month — priority bookings & exclusive deals",
    points: 5000,
    icon: "👑",
    category: "membership",
    color: "from-amber-500 to-orange-500",
  },
  {
    id: "r5",
    title: "Free Facial Session",
    description: "Complimentary facial at top-rated partner salons",
    points: 1200,
    icon: "✨",
    category: "free-service",
    color: "from-green-500 to-emerald-500",
  },
  {
    id: "r6",
    title: "10% Off Entire Bill",
    description: "Apply 10% discount to your entire bill on any visit",
    points: 800,
    icon: "💰",
    category: "discount",
    color: "from-violet-500 to-purple-500",
  },
];

const HOW_TO_EARN = [
  { icon: <Gift className="w-5 h-5" />, title: "Sign Up Bonus", points: "+100 pts", desc: "Join GlamHub and instantly earn 100 points", color: "text-purple-400" },
  { icon: <CheckCircle className="w-5 h-5" />, title: "Complete a Booking", points: "+1 pt / ₹100", desc: "Earn 1 point for every ₹100 spent on services", color: "text-pink-400" },
  { icon: <Star className="w-5 h-5" />, title: "Write a Review", points: "+50 pts", desc: "Share your experience after a visit", color: "text-amber-400" },
  { icon: <Calendar className="w-5 h-5" />, title: "Monthly Streak", points: "+200 pts", desc: "Book at least once per month for a streak bonus", color: "text-cyan-400" },
  { icon: <ShoppingBag className="w-5 h-5" />, title: "Refer a Friend", points: "+300 pts", desc: "When your friend makes their first booking", color: "text-green-400" },
  { icon: <TrendingUp className="w-5 h-5" />, title: "VIP Milestone", points: "+500 pts", desc: "Reach VIP tier and earn a milestone bonus", color: "text-rose-400" },
];

const MEMBERSHIP_TIERS = [
  { name: "Basic", minPoints: 0, icon: "🌟", color: "from-slate-400 to-slate-500", perks: ["1 pt per ₹100 spent", "Birthday discount 5%", "Early access to offers"] },
  { name: "Premium", minPoints: 1000, icon: "💎", color: "from-purple-400 to-pink-500", perks: ["1.5x points on all bookings", "Birthday discount 10%", "Priority customer support", "Exclusive member deals"] },
  { name: "VIP", minPoints: 5000, icon: "👑", color: "from-amber-400 to-orange-500", perks: ["2x points on all bookings", "Birthday discount 20%", "Free monthly service", "VIP-only time slots", "Personal style consultant"] },
];

export default function RewardsClient() {
  const { profile, isLoggedIn, isLoading, isSalonOwner } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"earn" | "redeem" | "tiers" | "coupons">("earn");
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemedCoupons, setRedeemedCoupons] = useState<any[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  
  // Payment modal states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentOrderData, setPaymentOrderData] = useState<any>(null);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    if (isLoggedIn && isSalonOwner) {
      router.replace("/salon-owner/dashboard");
    }
  }, [isLoggedIn, isSalonOwner, router]);

  // Fetch redeemed coupons
  useEffect(() => {
    if (isLoggedIn && !isSalonOwner && activeTab === "coupons") {
      fetchRedeemedCoupons();
    }
  }, [isLoggedIn, isSalonOwner, activeTab]);

  const fetchRedeemedCoupons = async () => {
    setLoadingCoupons(true);
    try {
      const res = await fetch("/api/glam-points/redeem");
      const data = await res.json();
      if (res.ok) {
        setRedeemedCoupons(data.coupons || []);
      }
    } catch (err) {
      console.error("Failed to fetch coupons:", err);
    } finally {
      setLoadingCoupons(false);
    }
  };

  const handleRedeem = async (rewardId: string, points: number) => {
    if (glamPoints < points) {
      toast.error(`You need ${points - glamPoints} more GlamPoints to redeem this reward`);
      return;
    }

    setIsRedeeming(true);
    try {
      const res = await fetch("/api/glam-points/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points, rewardId }),
      });

      const data = await res.json();
      
      // Log full error for debugging
      if (!res.ok) {
        console.error("Redemption API error:", {
          status: res.status,
          statusText: res.statusText,
          error: data.error,
          data
        });
        throw new Error(data.error || "Redemption failed");
      }

      toast.success(`🎉 ${data.message}\nCoupon Code: ${data.coupon.code}`);
      
      // Refresh profile to update points balance
      window.location.reload();
    } catch (err: any) {
      console.error("Redemption error:", err);
      toast.error(err.message || "Failed to redeem reward");
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleUpgrade = async (tier: string) => {
    if (!isLoggedIn) {
      toast.error("Please sign in to upgrade your plan");
      router.push("/auth/login");
      return;
    }

    setUpgrading(true);
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

      // data contains: orderId, amount, tier, planName, planPrice, message
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

  const glamPoints = (profile as any)?.glam_points ?? 0;
  const membershipTier = (profile as any)?.membership_tier ?? "basic";

  const currentTier = MEMBERSHIP_TIERS.find(t => t.name.toLowerCase() === membershipTier) || MEMBERSHIP_TIERS[0];
  const nextTier = MEMBERSHIP_TIERS[MEMBERSHIP_TIERS.indexOf(currentTier) + 1];
  const progressToNext = nextTier
    ? Math.min(100, (glamPoints / nextTier.minPoints) * 100)
    : 100;

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center pt-20">
        <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center pt-20">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-white mb-2">Sign In to View Rewards</h2>
          <p className="text-white/50 mb-6">Join GlamHub and start earning Glam Points today!</p>
          <Link href="/auth/login">
            <Button>Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-hero pt-24 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back */}
        <Link href="/profile">
          <Button variant="ghost" className="mb-6 gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Profile
          </Button>
        </Link>

        {/* Upgrade CTA */}
        {membershipTier !== "vip" && (
          <div 
            onClick={() => handleUpgrade(membershipTier === "basic" ? "premium" : "vip")}
            className="glass-card p-4 rounded-2xl border border-purple-500/30 mb-6 hover:border-purple-500/50 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-white">
                    {upgrading ? "Processing..." : `Upgrade to ${membershipTier === "basic" ? "Premium" : "VIP"}`}
                  </p>
                  <p className="text-xs text-white/50">Unlock exclusive benefits and earn more points</p>
                </div>
              </div>
              {upgrading ? (
                <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
              ) : (
                <Crown className="w-5 h-5 text-purple-400" />
              )}
            </div>
          </div>
        )}

        {/* Hero Points Card */}
        <div className="relative rounded-3xl overflow-hidden mb-8 bg-gradient-to-br from-purple-600 via-pink-600 to-rose-600 p-8 shadow-2xl shadow-purple-500/30">
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10" />
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />

          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{currentTier.icon}</span>
                <span className="px-3 py-1 rounded-full bg-white/20 text-white text-sm font-semibold capitalize">
                  {membershipTier} Member
                </span>
              </div>
              <p className="text-white/70 text-sm mb-1">Your GlamPoints Balance</p>
              <p className="text-6xl font-black text-white">{glamPoints.toLocaleString()}</p>
              <p className="text-white/60 text-sm mt-1">points</p>
            </div>
            <div className="sm:text-right">
              {nextTier ? (
                <div>
                  <p className="text-white/70 text-sm mb-3">
                    {nextTier.minPoints - glamPoints} pts to <strong className="text-white">{nextTier.name}</strong>
                  </p>
                  <div className="w-full sm:w-48 h-2 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full transition-all duration-700"
                      style={{ width: `${progressToNext}%` }}
                    />
                  </div>
                  <p className="text-white/50 text-xs mt-1">{progressToNext.toFixed(0)}% to {nextTier.name}</p>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-amber-300">
                  <Crown className="w-6 h-6" />
                  <span className="font-bold">Top VIP Tier!</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 p-1.5 bg-white/5 rounded-2xl border border-white/10">
          {(["earn", "redeem", "coupons", "tiers"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-sm font-medium transition-all capitalize",
                activeTab === tab
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg"
                  : "text-white/50 hover:text-white"
              )}
            >
              {tab === "earn" && "🎁 How to Earn"}
              {tab === "redeem" && "🛍️ Redeem"}
              {tab === "coupons" && "🎟️ My Coupons"}
              {tab === "tiers" && "👑 Tiers"}
            </button>
          ))}
        </div>

        {/* Earn Tab */}
        {activeTab === "earn" && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {HOW_TO_EARN.map((item, i) => (
              <div key={i} className="glass rounded-2xl p-5 border border-white/10 hover:border-purple-500/30 transition-all group">
                <div className={cn("mb-3", item.color)}>{item.icon}</div>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-white text-sm">{item.title}</h3>
                  <span className="text-xs font-bold text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full shrink-0 ml-2">
                    {item.points}
                  </span>
                </div>
                <p className="text-xs text-white/50">{item.desc}</p>
              </div>
            ))}
          </div>
        )}

        {/* Redeem Tab */}
        {activeTab === "redeem" && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {REWARDS_CATALOG.map((reward) => {
              const canRedeem = glamPoints >= reward.points;
              return (
                <div
                  key={reward.id}
                  className={cn(
                    "glass rounded-2xl border overflow-hidden transition-all",
                    canRedeem ? "border-white/10 hover:border-purple-500/40 hover:scale-[1.02]" : "border-white/5 opacity-60"
                  )}
                >
                  <div className={cn("h-2 bg-gradient-to-r", reward.color)} />
                  <div className="p-5">
                    <div className="text-3xl mb-3">{reward.icon}</div>
                    <h3 className="font-semibold text-white text-sm mb-1">{reward.title}</h3>
                    <p className="text-xs text-white/50 mb-4">{reward.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                        {reward.points.toLocaleString()} pts
                      </span>
                      <Button
                        size="sm"
                        disabled={!canRedeem || isRedeeming}
                        onClick={() => handleRedeem(reward.id, reward.points)}
                        className={cn("text-xs", !canRedeem && "cursor-not-allowed")}
                      >
                        {isRedeeming ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Redeeming...
                          </>
                        ) : canRedeem ? (
                          "Redeem"
                        ) : (
                          <>
                            <Lock className="w-3 h-3 mr-1" /> Need {(reward.points - glamPoints).toLocaleString()} more
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Coupons Tab */}
        {activeTab === "coupons" && (
          <div className="space-y-4">
            {loadingCoupons ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto mb-4" />
                <p className="text-white/60">Loading your coupons...</p>
              </div>
            ) : redeemedCoupons.length === 0 ? (
              <div className="text-center py-12">
                <Ticket className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Coupons Yet</h3>
                <p className="text-white/50 mb-6">Redeem your GlamPoints to get discount coupons!</p>
                <Button onClick={() => setActiveTab("redeem")} className="gap-2">
                  <Gift className="w-4 h-4" />
                  Browse Rewards
                </Button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {redeemedCoupons.map((coupon) => {
                  const validUntil = new Date(coupon.valid_until);
                  const isExpired = validUntil < new Date();
                  const isUsed = (coupon.used_count || 0) >= (coupon.usage_limit || 1);
                  const daysLeft = Math.ceil((validUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

                  const copyCouponCode = () => {
                    navigator.clipboard.writeText(coupon.code);
                    toast.success("Coupon code copied!");
                  };

                  return (
                    <div
                      key={coupon.id}
                      className={cn(
                        "glass rounded-2xl border p-5 transition-all",
                        isExpired || isUsed ? "border-white/5 opacity-50" : "border-purple-500/20 hover:border-purple-500/40"
                      )}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="text-2xl">🎟️</div>
                        {isUsed ? (
                          <span className="px-2 py-1 rounded-full bg-gray-500/20 text-gray-400 text-xs font-semibold">Used</span>
                        ) : isExpired ? (
                          <span className="px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-semibold">Expired</span>
                        ) : (
                          <span className="px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold">Active</span>
                        )}
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-white/50">Coupon Code</span>
                          {!isExpired && !isUsed && (
                            <button
                              onClick={copyCouponCode}
                              className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                            >
                              <Copy className="w-3 h-3" />
                              Copy
                            </button>
                          )}
                        </div>
                        <div className="font-mono text-lg font-bold text-white bg-white/5 px-3 py-2 rounded-lg">
                          {coupon.code}
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs mb-4">
                        <div className="flex justify-between">
                          <span className="text-white/50">Discount</span>
                          <span className="text-white font-semibold">
                            {coupon.discount_type === "percentage" ? `${coupon.discount_value}%` : `₹${coupon.discount_value}`}
                          </span>
                        </div>
                        {coupon.min_order_amount > 0 && (
                          <div className="flex justify-between">
                            <span className="text-white/50">Min. Order</span>
                            <span className="text-white">₹{coupon.min_order_amount}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-white/50">Valid Until</span>
                          <span className={cn("text-white", daysLeft <= 3 && daysLeft > 0 && "text-amber-400")}>
                            {validUntil.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                            {!isExpired && !isUsed && daysLeft <= 7 && (
                              <span className="ml-1">({daysLeft}d left)</span>
                            )}
                          </span>
                        </div>
                      </div>

                      {!isExpired && !isUsed && (
                        <Link href="/salons">
                          <Button size="sm" className="w-full bg-gradient-to-r from-purple-600 to-pink-600">
                            Use Now
                          </Button>
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tiers Tab */}
        {activeTab === "tiers" && (
          <div className="space-y-4">
            {MEMBERSHIP_TIERS.map((tier) => {
              const isActive = tier.name.toLowerCase() === membershipTier;
              const isUnlocked = glamPoints >= tier.minPoints;
              return (
                <div
                  key={tier.name}
                  className={cn(
                    "rounded-2xl border p-6 transition-all",
                    isActive
                      ? "border-purple-500/50 bg-purple-500/10"
                      : isUnlocked
                      ? "border-white/10 bg-white/5"
                      : "border-white/5 opacity-50"
                  )}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{tier.icon}</span>
                      <div>
                        <h3 className="font-bold text-white text-lg">{tier.name}</h3>
                        <p className="text-xs text-white/40">
                          {tier.minPoints === 0 ? "Starting tier" : `From ${tier.minPoints.toLocaleString()} points`}
                        </p>
                      </div>
                    </div>
                    {isActive && (
                      <span className="px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-semibold">
                        Current Tier
                      </span>
                    )}
                    {!isActive && isUnlocked && (
                      <span className="px-3 py-1 rounded-full bg-green-500/20 border border-green-500/40 text-green-300 text-xs font-semibold">
                        Unlocked
                      </span>
                    )}
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {tier.perks.map((perk, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-white/70">
                        <CheckCircle className="w-4 h-4 text-purple-400 shrink-0" />
                        {perk}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

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
    </div>
  );
}
