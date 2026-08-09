"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth/useAuth";
import { Button } from "@/components/ui/button";
import {
  User, Camera, Mail, Phone, Calendar, Award, ArrowLeft,
  Loader2, Check, Crown, Store, BarChart2, Gift, Star,
  Building2, Scissors, TrendingUp, Shield, Zap,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const TIER_CONFIG = {
  basic: {
    label: "Basic Member",
    badge: "Free",
    gradient: "from-gray-600 to-gray-700",
    textColor: "text-white/70",
    borderColor: "border-white/10",
    icon: Star,
    pointsToNext: 1000,
    nextTier: "Premium",
  },
  premium: {
    label: "Premium Member",
    badge: "⭐ Premium",
    gradient: "from-purple-600 to-pink-600",
    textColor: "text-purple-300",
    borderColor: "border-purple-500/30",
    icon: Zap,
    pointsToNext: 5000,
    nextTier: "VIP",
  },
  vip: {
    label: "VIP Member",
    badge: "👑 VIP",
    gradient: "from-amber-500 to-orange-600",
    textColor: "text-amber-400",
    borderColor: "border-amber-500/30",
    icon: Crown,
    pointsToNext: null,
    nextTier: null,
  },
};

export default function ProfileClient() {
  const { profile, updateUserProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [glamData, setGlamData] = useState<any>(null);
  const [salonInfo, setSalonInfo] = useState<any>(null);

  const isOwner = profile?.role === "salon_owner";

  const [formData, setFormData] = useState({
    full_name: profile?.full_name || "",
    phone: profile?.phone || "",
    avatar_url: profile?.avatar_url || "",
  });

  // Sync form when profile loads
  useEffect(() => {
    setFormData({
      full_name: profile?.full_name || "",
      phone: profile?.phone || "",
      avatar_url: profile?.avatar_url || "",
    });
  }, [profile]);

  // Fetch GlamPoints data for customers
  useEffect(() => {
    if (!profile || isOwner) return;
    fetch("/api/glam-points")
      .then((r) => r.json())
      .then((d) => setGlamData(d))
      .catch(() => {});
  }, [profile, isOwner]);

  // Fetch salon info for owners
  useEffect(() => {
    if (!profile || !isOwner) return;
    fetch("/api/salon-owner/salon")
      .then((r) => r.json())
      .then((d) => setSalonInfo(d.salon))
      .catch(() => {});
  }, [profile, isOwner]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    const result = await updateUserProfile(formData);
    setIsSaving(false);
    if (!result.error) {
      setSaveSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const handleCancel = () => {
    setFormData({
      full_name: profile?.full_name || "",
      phone: profile?.phone || "",
      avatar_url: profile?.avatar_url || "",
    });
    setIsEditing(false);
  };

  if (!profile) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/50">Loading profile...</p>
        </div>
      </div>
    );
  }

  const tier = ((profile as any).membership_tier || "basic") as keyof typeof TIER_CONFIG;
  const tierCfg = TIER_CONFIG[tier] ?? TIER_CONFIG.basic;
  const TierIcon = tierCfg.icon;
  const glamPoints = glamData?.balance ?? (profile as any)?.glam_points ?? 0;
  const membershipTier = glamData?.tier ?? tier;
  const activeTierCfg = TIER_CONFIG[membershipTier as keyof typeof TIER_CONFIG] ?? TIER_CONFIG.basic;
  const ActiveTierIcon = activeTierCfg.icon;

  return (
    <div className="min-h-screen gradient-hero pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <Link href={isOwner ? "/salon-owner/dashboard" : "/"}>
          <Button variant="ghost" className="mb-6 gap-2">
            <ArrowLeft className="w-4 h-4" />
            {isOwner ? "Back to Salon Dashboard" : "Back to Dashboard"}
          </Button>
        </Link>

        {/* Profile Card */}
        <div className="glass rounded-3xl border border-white/20 overflow-hidden">
          {/* Header Gradient */}
          <div className={cn(
            "relative h-32 bg-gradient-to-r",
            isOwner ? "from-purple-700 to-violet-800" : "from-purple-600 to-pink-600"
          )}>
            <div className="absolute inset-0 bg-black/20" />
            {/* Role Banner */}
            <div className="absolute top-4 right-4">
              {isOwner ? (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/20 text-sm font-semibold text-white">
                  <Building2 className="w-4 h-4" />
                  Salon Owner
                </span>
              ) : (
                <span className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/20 text-sm font-semibold text-white", activeTierCfg.textColor)}>
                  <ActiveTierIcon className="w-4 h-4" />
                  {activeTierCfg.label}
                </span>
              )}
            </div>
          </div>

          {/* Profile Content */}
          <div className="relative px-6 sm:px-8 pb-8">
            {/* Avatar */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between -mt-16 mb-6">
              <div className="relative">
                <div className="w-32 h-32 rounded-2xl overflow-hidden ring-4 ring-[#0a0a0f] bg-white/5">
                  {isEditing && formData.avatar_url ? (
                    <img src={formData.avatar_url} alt="Preview" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
                  ) : profile.avatar_url ? (
                    <Image src={profile.avatar_url} alt={profile.full_name || "Profile"} width={128} height={128} className="object-cover w-full h-full" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-4xl font-bold">
                      {profile.full_name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "?"}
                    </div>
                  )}
                </div>
                <button className="absolute bottom-0 right-0 w-10 h-10 rounded-xl bg-purple-500 hover:bg-purple-600 border-4 border-[#0a0a0f] flex items-center justify-center transition-colors">
                  <Camera className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Edit Buttons */}
              <div className="mt-4 sm:mt-0">
                {!isEditing ? (
                  <Button onClick={() => setIsEditing(true)} className="w-full sm:w-auto">
                    <User className="w-4 h-4 mr-2" /> Edit Profile
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button onClick={handleCancel} variant="outline" className="w-full sm:w-auto">Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
                      {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><Check className="w-4 h-4 mr-2" />Save Changes</>}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Success Message */}
            {saveSuccess && (
              <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-2">
                <Check className="w-4 h-4" /> Profile updated successfully!
              </div>
            )}

            {/* Profile Info */}
            <div className="space-y-5">
              {/* Role Badge - Prominent */}
              <div className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl border",
                isOwner
                  ? "bg-purple-500/10 border-purple-500/30"
                  : `bg-gradient-to-r from-${membershipTier === "vip" ? "amber" : membershipTier === "premium" ? "purple" : "gray"}-500/10 to-transparent ${activeTierCfg.borderColor}`
              )}>
                {isOwner ? (
                  <>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg">
                      <Building2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">Salon Owner</p>
                      <p className="text-xs text-white/50">Business account – manage your salon</p>
                    </div>
                    <Link href="/salon-owner/dashboard" className="ml-auto">
                      <Button size="sm" variant="outline" className="text-xs border-purple-500/30 text-purple-300 hover:bg-purple-500/10">
                        Go to Dashboard
                      </Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg", activeTierCfg.gradient)}>
                      <ActiveTierIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className={cn("font-semibold", activeTierCfg.textColor)}>{activeTierCfg.label}</p>
                      <p className="text-xs text-white/50">Customer account</p>
                    </div>
                    {membershipTier !== "vip" && (
                      <span className="ml-auto text-xs text-white/30 text-right">
                        {activeTierCfg.pointsToNext ? `${activeTierCfg.pointsToNext - glamPoints} pts to ${activeTierCfg.nextTier}` : ""}
                      </span>
                    )}
                  </>
                )}
              </div>

              {/* Avatar URL (in editing mode) */}
              {isEditing && (
                <div>
                  <label className="text-sm text-white/60 mb-2 block">Profile Photo URL</label>
                  <input
                    type="url"
                    value={formData.avatar_url}
                    onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-purple-500/50 focus:outline-none transition-colors text-sm"
                    placeholder="https://your-photo-url.com/photo.jpg"
                  />
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="text-sm text-white/60 mb-2 block">Full Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-purple-500/50 focus:outline-none transition-colors"
                    placeholder="Enter your full name"
                  />
                ) : (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10">
                    <User className="w-5 h-5 text-white/40" />
                    <span className="text-white text-lg">{profile.full_name || "Not set"}</span>
                  </div>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="text-sm text-white/60 mb-2 block">Email</label>
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 opacity-60">
                  <Mail className="w-5 h-5 text-white/40" />
                  <span className="text-white">{profile.email}</span>
                  <span className="ml-auto text-xs text-white/40">Read-only</span>
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="text-sm text-white/60 mb-2 block">Phone Number</label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-purple-500/50 focus:outline-none transition-colors"
                    placeholder="+91 98765 43210"
                  />
                ) : (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10">
                    <Phone className="w-5 h-5 text-white/40" />
                    <span className="text-white">{profile.phone || "Not set"}</span>
                  </div>
                )}
              </div>

              {/* Member Since */}
              <div>
                <label className="text-sm text-white/60 mb-2 block">Member Since</label>
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10">
                  <Calendar className="w-5 h-5 text-white/40" />
                  <span className="text-white">
                    {new Date(profile.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                  </span>
                </div>
              </div>

              {/* ── CUSTOMER: GlamPoints Section ─────────────────── */}
              {!isOwner && (
                <div className="mt-6">
                  <label className="text-sm text-white/60 mb-3 block font-medium">GlamPoints & Rewards</label>
                  <div className="glass rounded-2xl border border-purple-500/20 overflow-hidden">
                    {/* Points Banner */}
                    <div className="bg-gradient-to-r from-purple-600/30 to-pink-600/20 px-5 py-4 flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                        <Gift className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-3xl font-bold gradient-text">{glamPoints.toLocaleString()}</p>
                        <p className="text-sm text-white/60">GlamPoints Balance</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-emerald-400">≈ ₹{Math.floor(glamPoints / 100) * 10}</p>
                        <p className="text-xs text-white/40">Redemption value</p>
                      </div>
                    </div>

                    {/* Tier Progress */}
                    {activeTierCfg.pointsToNext && (
                      <div className="px-5 py-3 border-t border-white/10">
                        <div className="flex justify-between text-xs text-white/50 mb-1.5">
                          <span>{activeTierCfg.label}</span>
                          <span>{glamPoints}/{activeTierCfg.pointsToNext} pts → {activeTierCfg.nextTier}</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full bg-gradient-to-r", activeTierCfg.gradient, "transition-all duration-500")}
                            style={{ width: `${Math.min(100, (glamPoints / activeTierCfg.pointsToNext) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* How it works */}
                    <div className="px-5 py-3 border-t border-white/10 grid grid-cols-3 gap-3 text-center">
                      {[
                        { icon: Scissors, label: "Earn 10 pts", sub: "per ₹100 spent" },
                        { icon: Star, label: "100 pts = ₹10", sub: "redemption" },
                        { icon: Crown, label: "5000 pts", sub: "unlock VIP" },
                      ].map(({ icon: Icon, label, sub }) => (
                        <div key={label}>
                          <Icon className="w-4 h-4 text-purple-400 mx-auto mb-1" />
                          <p className="text-xs font-medium text-white/70">{label}</p>
                          <p className="text-[10px] text-white/40">{sub}</p>
                        </div>
                      ))}
                    </div>

                    {/* Recent History */}
                    {glamData?.history?.length > 0 && (
                      <div className="border-t border-white/10 px-5 py-3">
                        <p className="text-xs font-medium text-white/50 mb-2">Recent Activity</p>
                        <div className="space-y-2">
                          {glamData.history.slice(0, 3).map((h: any) => (
                            <div key={h.id} className="flex items-center justify-between text-xs">
                              <span className="text-white/60 truncate flex-1">{h.description}</span>
                              <span className={cn("ml-2 font-bold", h.points > 0 ? "text-emerald-400" : "text-red-400")}>
                                {h.points > 0 ? "+" : ""}{h.points} pts
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* CTA */}
                    <div className="px-5 pb-4 pt-2">
                      <Link href="/rewards">
                        <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 gap-2">
                          <Gift className="w-4 h-4" /> View Rewards & Redeem Points
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* ── SALON OWNER: Salon Info Section ──────────────── */}
              {isOwner && (
                <div className="mt-6">
                  <label className="text-sm text-white/60 mb-3 block font-medium">Your Salon</label>
                  {salonInfo ? (
                    <div className="glass rounded-2xl border border-purple-500/20 overflow-hidden">
                      <div className="flex items-center gap-4 p-5">
                        {salonInfo.cover_image ? (
                          <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0">
                            <img src={salonInfo.cover_image} alt={salonInfo.name} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                            <Scissors className="w-8 h-8 text-white" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-white text-lg truncate">{salonInfo.name}</p>
                          <p className="text-sm text-white/50 truncate">{salonInfo.area}, {salonInfo.address}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium",
                              salonInfo.plan_tier === "ultra" ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                              : salonInfo.plan_tier === "premium" ? "bg-purple-500/10 border-purple-500/30 text-purple-300"
                              : "bg-white/5 border-white/10 text-white/50"
                            )}>
                              {salonInfo.plan_tier === "ultra" ? "👑 Ultra" : salonInfo.plan_tier === "premium" ? "⭐ Premium" : "🆓 Free"} Plan
                            </span>
                            <span className={cn("text-xs px-2 py-0.5 rounded-full border", salonInfo.is_active ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" : "text-red-400 border-red-500/30 bg-red-500/10")}>
                              {salonInfo.is_active ? "● Active" : "● Inactive"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-0 border-t border-white/10">
                        {[
                          { icon: BarChart2, label: "Analytics", href: "/salon-owner/dashboard?tab=analytics" },
                          { icon: Store, label: "My Salon", href: "/salon-owner/dashboard?tab=my-salon" },
                          { icon: TrendingUp, label: "Upgrade", href: "/salon-owner/dashboard?tab=my-plan" },
                        ].map(({ icon: Icon, label, href }) => (
                          <Link key={label} href={href} className="flex flex-col items-center gap-1 py-4 hover:bg-white/5 transition-colors border-r border-white/10 last:border-0">
                            <Icon className="w-5 h-5 text-purple-400" />
                            <span className="text-xs text-white/60">{label}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="glass rounded-2xl border border-white/10 p-6 text-center">
                      <Store className="w-12 h-12 text-white/30 mx-auto mb-3" />
                      <p className="text-white/60 text-sm mb-3">No salon registered yet</p>
                      <Link href="/salon-owner/register">
                        <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 gap-2">
                          <Store className="w-4 h-4" /> Register Your Salon
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-white/40">
          <p>Need help? Contact support at support@mumbaiglamhub.com</p>
        </div>
      </div>
    </div>
  );
}
