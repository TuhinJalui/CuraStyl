"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth/useAuth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Gift, Star, Zap, Crown, ArrowLeft, CheckCircle, Trophy,
  TrendingUp, Calendar, ShoppingBag, Loader2, History,
  IndianRupee, Sparkles, Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

// ─── Catalog ───────────────────────────────────────────────────────────────────

const REWARDS_CATALOG = [
  { id: "r1", title: "₹100 Off Your Next Booking",  description: "Redeem 1000 GlamPoints for ₹100 discount",      points: 1000, icon: "🎟️", color: "from-purple-500 to-pink-500" },
  { id: "r2", title: "Free Hair Spa Treatment",       description: "Get a complimentary hair spa at partner salons", points: 1500, icon: "💆", color: "from-blue-500 to-cyan-500" },
  { id: "r3", title: "₹500 Off Bridal Package",       description: "Massive discount on any bridal package > ₹5000", points: 5000, icon: "👰", color: "from-rose-500 to-pink-500" },
  { id: "r4", title: "VIP Membership Upgrade",        description: "Upgrade to VIP tier for 1 month",                points: 5000, icon: "👑", color: "from-amber-500 to-orange-500" },
  { id: "r5", title: "Free Facial Session",           description: "Complimentary facial at top-rated salons",       points: 1200, icon: "✨", color: "from-green-500 to-emerald-500" },
  { id: "r6", title: "10% Off Entire Bill",           description: "Apply 10% discount to your entire bill",         points: 800,  icon: "💰", color: "from-violet-500 to-purple-500" },
];

const HOW_TO_EARN = [
  { icon: <Gift className="w-5 h-5" />,      title: "Sign Up Bonus",    points: "+100 pts",       desc: "Join CuraStyl and instantly earn 100 points",          color: "text-purple-400" },
  { icon: <CheckCircle className="w-5 h-5" />, title: "Complete Booking", points: "+10 pts / ₹100", desc: "Earn 10 points for every ₹100 spent on services",     color: "text-pink-400" },
  { icon: <Star className="w-5 h-5" />,       title: "Write a Review",   points: "+50 pts",        desc: "Share your experience after a visit",                  color: "text-amber-400" },
  { icon: <Calendar className="w-5 h-5" />,   title: "Monthly Streak",   points: "+200 pts",       desc: "Book at least once per month for a streak bonus",     color: "text-cyan-400" },
  { icon: <ShoppingBag className="w-5 h-5" />, title: "Refer a Friend", points: "+300 pts",        desc: "When your friend makes their first booking",           color: "text-green-400" },
  { icon: <TrendingUp className="w-5 h-5" />, title: "VIP Milestone",    points: "+500 pts",       desc: "Reach VIP tier and earn a milestone bonus",            color: "text-rose-400" },
];

const MEMBERSHIP_TIERS = [
  { name: "Basic",   minPoints: 0,    icon: "🌟", color: "from-slate-400 to-slate-500",    perks: ["10 pts per ₹100 spent", "Birthday discount 5%", "Early access to offers"] },
  { name: "Premium", minPoints: 1000, icon: "💎", color: "from-purple-400 to-pink-500",    perks: ["15x pts on all bookings", "Birthday discount 10%", "Priority support", "Exclusive deals"] },
  { name: "VIP",     minPoints: 5000, icon: "👑", color: "from-amber-400 to-orange-500",   perks: ["20x pts on all bookings", "Birthday discount 20%", "Free monthly service", "VIP-only slots", "Personal consultant"] },
];

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function RewardsPage() {
  const { profile, isLoggedIn, isLoading, isSalonOwner } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"earn" | "redeem" | "tiers" | "history">("earn");

  // Live glam-points data from API
  const [pointsData, setPointsData] = useState<any>(null);
  const [pointsLoading, setPointsLoading] = useState(false);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

  useEffect(() => {
    if (isLoggedIn && isSalonOwner) {
      router.replace("/salon-owner/dashboard");
    }
  }, [isLoggedIn, isSalonOwner, router]);

  // Fetch live glam points
  const fetchPoints = useCallback(async () => {
    if (!isLoggedIn) return;
    setPointsLoading(true);
    try {
      const res = await fetch("/api/glam-points?limit=30");
      const data = await res.json();
      setPointsData(data);
    } catch {
      // fail silently — use profile fallback
    } finally {
      setPointsLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => { fetchPoints(); }, [fetchPoints]);

  // Live points (API > profile fallback)
  const glamPoints = pointsData?.balance ?? (profile as any)?.glam_points ?? 0;
  const membershipTier = pointsData?.tier ?? (profile as any)?.membership_tier ?? "basic";
  const history: any[] = pointsData?.history ?? [];

  const currentTier = MEMBERSHIP_TIERS.find(t => t.name.toLowerCase() === membershipTier) || MEMBERSHIP_TIERS[0];
  const nextTier = MEMBERSHIP_TIERS[MEMBERSHIP_TIERS.indexOf(currentTier) + 1];
  const progressToNext = nextTier ? Math.min(100, (glamPoints / nextTier.minPoints) * 100) : 100;

  // Redeem reward
  const handleRedeem = async (reward: typeof REWARDS_CATALOG[0]) => {
    if (glamPoints < reward.points) {
      toast.error(`You need ${reward.points - glamPoints} more GlamPoints`);
      return;
    }
    setRedeemingId(reward.id);
    try {
      const res = await fetch("/api/glam-points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "redeem",
          points: reward.points,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Redemption failed");
      toast.success(`🎉 ${reward.title} redeemed! You now have ${data.newBalance} GlamPoints.`);
      fetchPoints(); // refresh balance
    } catch (err: any) {
      toast.error(err.message || "Failed to redeem. Please try again.");
    } finally {
      setRedeemingId(null);
    }
  };

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
          <p className="text-white/50 mb-6">Join CuraStyl and start earning Glam Points today!</p>
          <Link href="/auth/login"><Button>Sign In</Button></Link>
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

        {/* Hero Points Card */}
        <div className="relative rounded-3xl overflow-hidden mb-8 bg-gradient-to-br from-purple-600 via-pink-600 to-rose-600 p-8 shadow-2xl shadow-purple-500/30">
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />

          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{currentTier.icon}</span>
                <span className="px-3 py-1 rounded-full bg-white/20 text-white text-sm font-semibold capitalize">
                  {membershipTier} Member
                </span>
                {pointsLoading && <Loader2 className="w-4 h-4 text-white/60 animate-spin" />}
              </div>
              <p className="text-white/70 text-sm mb-1">Your GlamPoints Balance</p>
              <p className="text-6xl font-black text-white">{glamPoints.toLocaleString()}</p>
              <p className="text-white/60 text-sm mt-1">points</p>

              {/* Redemption value */}
              {glamPoints >= 100 && (
                <div className="mt-2 flex items-center gap-1.5 text-white/70 text-sm">
                  <IndianRupee className="w-3.5 h-3.5" />
                  <span>≈ ₹{pointsData?.rupeesValue ?? Math.floor(glamPoints / 100) * 10} redeemable value</span>
                </div>
              )}
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
          {(["earn", "redeem", "tiers", "history"] as const).map((tab) => (
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
              {tab === "earn"    && "🎁 How to Earn"}
              {tab === "redeem"  && "🛍️ Redeem"}
              {tab === "tiers"   && "👑 Tiers"}
              {tab === "history" && "📋 History"}
            </button>
          ))}
        </div>

        {/* ─── Earn Tab ───────────────────────────────────────────────────────── */}
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

        {/* ─── Redeem Tab ─────────────────────────────────────────────────────── */}
        {activeTab === "redeem" && (
          <div className="space-y-4">
            {glamPoints < 100 && (
              <div className="glass-card p-4 border border-amber-500/20 bg-amber-500/5 flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
                <p className="text-sm text-amber-300">
                  You need at least 100 GlamPoints to redeem. Keep booking to earn more!
                </p>
              </div>
            )}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {REWARDS_CATALOG.map((reward) => {
                const canRedeem = glamPoints >= reward.points;
                const isRedeeming = redeemingId === reward.id;
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
                          disabled={!canRedeem || isRedeeming || !!redeemingId}
                          onClick={() => handleRedeem(reward)}
                          className={cn("text-xs gap-1.5", !canRedeem && "cursor-not-allowed")}
                        >
                          {isRedeeming ? (
                            <><Loader2 className="w-3 h-3 animate-spin" />Redeeming…</>
                          ) : canRedeem ? (
                            "Redeem"
                          ) : (
                            <><Lock className="w-3 h-3 mr-1" />Need {(reward.points - glamPoints).toLocaleString()} more</>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── Tiers Tab ──────────────────────────────────────────────────────── */}
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

        {/* ─── History Tab ────────────────────────────────────────────────────── */}
        {activeTab === "history" && (
          <div className="space-y-3">
            {pointsLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
              </div>
            ) : history.length === 0 ? (
              <div className="glass-card p-10 text-center">
                <History className="w-10 h-10 text-white/20 mx-auto mb-3" />
                <p className="text-white/30">No GlamPoints history yet.</p>
                <p className="text-white/20 text-sm mt-1">Complete a booking to earn your first points!</p>
              </div>
            ) : (
              history.map((entry: any) => {
                const isEarned = entry.points > 0;
                return (
                  <div
                    key={entry.id}
                    className="glass-card p-4 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                        isEarned ? "bg-emerald-500/20" : "bg-red-500/20"
                      )}>
                        {isEarned
                          ? <Sparkles className="w-4 h-4 text-emerald-400" />
                          : <Trophy className="w-4 h-4 text-red-400" />}
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{entry.description}</p>
                        <p className="text-white/30 text-xs mt-0.5">
                          {new Date(entry.created_at).toLocaleDateString("en-IN", {
                            day: "numeric", month: "short", year: "numeric",
                          })} · Balance after: {entry.balance_after} pts
                        </p>
                      </div>
                    </div>
                    <span className={cn(
                      "font-bold text-base shrink-0",
                      isEarned ? "text-emerald-400" : "text-red-400"
                    )}>
                      {isEarned ? "+" : ""}{entry.points} pts
                    </span>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
