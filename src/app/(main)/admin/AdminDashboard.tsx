"use client";

import { useState, useEffect } from "react";
import {
  LayoutDashboard, Store, Users, Star, BarChart3, ShieldCheck,
  CheckCircle, XCircle, Clock, Eye, Trash2, TrendingUp,
  IndianRupee, Activity, AlertCircle, Bell, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn, formatPrice } from "@/lib/utils";
import type { Salon } from "@/types";
import toast from "react-hot-toast";

const PENDING_SALONS = [
  { id: "p1", name: "Royal Cuts Salon", owner: "Raj Malhotra", area: "Thane", submitted: "2025-07-15", services: 8 },
  { id: "p2", name: "Bella Donna Studio", owner: "Aisha Khan", area: "Versova", submitted: "2025-07-14", services: 12 },
  { id: "p3", name: "The Groom Room", owner: "Vikram Singh", area: "Kurla", submitted: "2025-07-13", services: 6 },
];

const FLAGGED_REVIEWS = [
  { id: "f1", salon: "Glam Studio", reviewer: "Anonymous", rating: 1, comment: "Fake review content here…", flagCount: 3 },
  { id: "f2", salon: "The Beauty Lab", reviewer: "User123", rating: 2, comment: "Suspicious review pattern…", flagCount: 2 },
];

const tabs = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "salons", label: "Salons", icon: Store },
  { id: "users", label: "Users", icon: Users },
  { id: "reviews", label: "Reviews", icon: Star },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [search, setSearch] = useState("");
  const [allSalons, setAllSalons] = useState<Salon[]>([]);
  const [salonsLoading, setSalonsLoading] = useState(false);

  // Fetch real salons from Supabase when the salons tab is opened
  useEffect(() => {
    if (activeTab !== "salons" || allSalons.length > 0) return;
    setSalonsLoading(true);
    fetch("/api/salons")
      .then((r) => r.json())
      .then((d) => setAllSalons(d.salons ?? []))
      .catch(console.error)
      .finally(() => setSalonsLoading(false));
  }, [activeTab, allSalons.length]);

  const approve = (id: string, name: string) => {
    toast.success(`${name} approved and published!`);
  };

  const reject = (id: string, name: string) => {
    toast.error(`${name} rejected.`);
  };

  return (
    <div className="min-h-screen gradient-hero pt-16">
      <div className="flex h-[calc(100vh-64px)]">
        {/* Sidebar */}
        <aside className="w-16 md:w-56 border-r border-white/10 bg-[#060610]/90 backdrop-blur-xl flex flex-col">
          <div className="p-4 border-b border-white/10 hidden md:block">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-purple-400" />
              <div>
                <p className="font-bold text-white text-sm">Admin Panel</p>
                <p className="text-white/30 text-xs">Mumbai GlamHub</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-3 space-y-1">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  activeTab === id
                    ? "bg-purple-500/20 text-white border border-purple-500/30"
                    : "text-white/50 hover:text-white hover:bg-white/5"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="hidden md:block">{label}</span>
                {id === "salons" && PENDING_SALONS.length > 0 && (
                  <span className="hidden md:flex ml-auto w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-[10px] items-center justify-center font-bold">
                    {PENDING_SALONS.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-y-auto">
          <div className="sticky top-0 z-10 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/10 px-6 py-3 flex items-center justify-between">
            <h1 className="font-semibold text-white capitalize">{activeTab}</h1>
            <div className="flex items-center gap-3">
              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                <Input placeholder="Search…" className="pl-8 h-8 w-48 text-xs" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <button className="p-2 rounded-lg hover:bg-white/10 transition-colors relative" aria-label="Notifications">
                <Bell className="w-4 h-4 text-white/50" />
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">

            {/* Overview */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Platform KPIs */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: "Total Salons", value: "524", sub: "+12 this week", icon: Store, color: "text-purple-400", bg: "bg-purple-500/10" },
                    { label: "Total Users", value: "52,841", sub: "+380 today", icon: Users, color: "text-pink-400", bg: "bg-pink-500/10" },
                    { label: "Platform GMV", value: "₹2.4Cr", sub: "This month", icon: IndianRupee, color: "text-emerald-400", bg: "bg-emerald-500/10" },
                    { label: "Bookings Today", value: "1,284", sub: "+8% vs yesterday", icon: Activity, color: "text-amber-400", bg: "bg-amber-500/10" },
                  ].map(({ label, value, sub, icon: Icon, color, bg }) => (
                    <div key={label} className="glass-card p-5">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", bg)}>
                        <Icon className={cn("w-5 h-5", color)} />
                      </div>
                      <p className="text-2xl font-bold text-white">{value}</p>
                      <p className="text-xs text-white/40 mt-0.5">{label}</p>
                      <p className="text-xs text-emerald-400 mt-1">{sub}</p>
                    </div>
                  ))}
                </div>

                {/* Pending approvals */}
                <div className="glass-card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-white flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-400" />
                      Pending Salon Approvals
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold">
                        {PENDING_SALONS.length}
                      </span>
                    </h2>
                  </div>
                  <div className="space-y-3">
                    {PENDING_SALONS.map((salon) => (
                      <div key={salon.id} className="flex items-center gap-4 p-3 rounded-xl bg-white/3 border border-white/8 hover:bg-white/5 transition-colors">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0 font-bold text-amber-300">
                          {salon.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white text-sm truncate">{salon.name}</p>
                          <p className="text-xs text-white/40">{salon.owner} • {salon.area} • {salon.services} services</p>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-white/30 hidden sm:flex">
                          <Clock className="w-3 h-3" /> {salon.submitted}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button size="sm" className="h-7 text-xs gap-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30" onClick={() => approve(salon.id, salon.name)}>
                            <CheckCircle className="w-3.5 h-3.5" /> Approve
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-red-400 hover:bg-red-500/10" onClick={() => reject(salon.id, salon.name)}>
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { label: "Commission Earned", value: "₹4.8L", sub: "This month (18%)", icon: TrendingUp },
                    { label: "Active Salons", value: "487 / 524", sub: "93% active rate", icon: Store },
                    { label: "Avg Booking Value", value: "₹1,892", sub: "Up ₹124 vs last month", icon: IndianRupee },
                  ].map(({ label, value, sub, icon: Icon }) => (
                    <div key={label} className="glass-card p-4 flex items-center gap-4">
                      <Icon className="w-8 h-8 text-purple-400/50 shrink-0" />
                      <div>
                        <p className="text-xl font-bold text-white">{value}</p>
                        <p className="text-xs font-medium text-white/60">{label}</p>
                        <p className="text-xs text-white/30 mt-0.5">{sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Salons Tab */}
            {activeTab === "salons" && (() => {
              const filtered = allSalons.filter((s) =>
                !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.area.toLowerCase().includes(search.toLowerCase())
              );
              return (
                <div className="space-y-4">
                  <div className="flex gap-2 flex-wrap">
                    {["all", "active", "pending", "suspended"].map((f) => (
                      <button key={f} className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white capitalize transition-all">{f}</button>
                    ))}
                  </div>
                  <div className="glass-card overflow-hidden">
                    <div className="divide-y divide-white/5">
                      {salonsLoading ? (
                        <div className="flex items-center justify-center py-10">
                          <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                        </div>
                      ) : filtered.length === 0 ? (
                        <div className="text-center py-10 text-white/30 text-sm">No salons found</div>
                      ) : filtered.map((salon) => (
                        <div key={salon.id} className="flex items-center gap-4 p-4 hover:bg-white/3 transition-colors">
                          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center font-bold text-purple-300 shrink-0">
                            {salon.name[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-white text-sm truncate">{salon.name}</p>
                            <p className="text-xs text-white/40">{salon.area} • {salon.category} • ⭐{salon.rating} ({salon.review_count})</p>
                          </div>
                          <p className="text-sm text-purple-300 font-medium hidden sm:block">{formatPrice(salon.starting_price)}</p>
                          <Badge variant={salon.is_verified ? "success" : "warning"}>
                            {salon.is_verified ? "Verified" : "Pending"}
                          </Badge>
                          <div className="flex items-center gap-1">
                            <button className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors" aria-label="View">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/40 hover:text-red-400 transition-colors" aria-label="Delete">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Users Tab */}
            {activeTab === "users" && (
              <div className="glass-card p-5">
                <h2 className="font-semibold text-white mb-4">Registered Users</h2>
                <div className="space-y-3">
                  {[
                    { name: "Sneha Kulkarni", email: "sneha@example.com", role: "customer", bookings: 12, joined: "Jan 2025" },
                    { name: "Raj Malhotra", email: "raj@salonowner.com", role: "salon_owner", bookings: 0, joined: "Feb 2025" },
                    { name: "Priya Nair", email: "priya@example.com", role: "customer", bookings: 8, joined: "Mar 2025" },
                    { name: "Meera Iyer", email: "meera@example.com", role: "customer", bookings: 5, joined: "Apr 2025" },
                  ].map((user) => (
                    <div key={user.email} className="flex items-center gap-4 py-2 border-b border-white/5 last:border-0">
                      <div className="w-9 h-9 rounded-full bg-purple-500/20 flex items-center justify-center font-bold text-purple-300 text-sm shrink-0">
                        {user.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white text-sm">{user.name}</p>
                        <p className="text-xs text-white/40">{user.email}</p>
                      </div>
                      <Badge variant={user.role === "salon_owner" ? "warning" : user.role === "admin" ? "destructive" : "secondary"} className="hidden sm:flex">
                        {user.role}
                      </Badge>
                      <p className="text-xs text-white/40 hidden sm:block">{user.bookings} bookings</p>
                      <p className="text-xs text-white/30 hidden md:block">{user.joined}</p>
                      <button className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors" aria-label="Suspend user">
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews Tab */}
            {activeTab === "reviews" && (
              <div className="space-y-4">
                <div className="glass-card p-5">
                  <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400" /> Flagged Reviews
                  </h2>
                  <div className="space-y-3">
                    {FLAGGED_REVIEWS.map((r) => (
                      <div key={r.id} className="p-4 rounded-xl bg-red-500/5 border border-red-500/15">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white">{r.reviewer}</span>
                            <span className="text-xs text-white/40">on {r.salon}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/30 text-red-400">
                              {r.flagCount} flags
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-white/50 hover:text-white">Keep</Button>
                            <Button size="sm" className="h-7 text-xs gap-1 text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20">
                              <Trash2 className="w-3 h-3" /> Remove
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-white/60 italic">&ldquo;{r.comment}&rdquo;</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === "analytics" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: "Total GMV (All Time)", value: "₹12.4Cr" },
                    { label: "Platform Commission", value: "₹2.23Cr" },
                    { label: "Total Bookings", value: "86,412" },
                    { label: "NPS Score", value: "72" },
                  ].map(({ label, value }) => (
                    <div key={label} className="glass-card p-4 text-center">
                      <p className="text-2xl font-bold gradient-text">{value}</p>
                      <p className="text-xs text-white/40 mt-1">{label}</p>
                    </div>
                  ))}
                </div>

                <div className="glass-card p-5">
                  <h3 className="font-semibold text-white mb-4">Top Areas by Bookings</h3>
                  {[
                    { area: "Bandra", pct: 24, bookings: 20790 },
                    { area: "Andheri", pct: 19, bookings: 16418 },
                    { area: "Juhu", pct: 14, bookings: 12098 },
                    { area: "Powai", pct: 11, bookings: 9505 },
                    { area: "Worli", pct: 8, bookings: 6913 },
                  ].map(({ area, pct, bookings }) => (
                    <div key={area} className="flex items-center gap-3 mb-3">
                      <span className="text-sm text-white/60 w-20 shrink-0">{area}</span>
                      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-white/40 w-16 text-right">{bookings.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
