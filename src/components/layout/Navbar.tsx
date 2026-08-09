"use client";

import { useState, useEffect, useLayoutEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Menu, X, Sparkles, User, Calendar, Heart, LogOut,
  Bell, Check, Store, BarChart2, Crown, Settings,
  Scissors, Gift, QrCode, ChevronDown, LayoutDashboard,
  Building2, Star, CreditCard, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/useAuth";
import { useNotifications } from "@/lib/notifications/useNotifications";

// ── Customer nav links ──────────────────────────────────────────────────────
const CUSTOMER_NAV = [
  { label: "Dashboard", href: "/" },
  { label: "Salons", href: "/salons" },
  { label: "Offers", href: "/offers" },
  { label: "AI Assistant", href: "/ai-assistant", icon: Sparkles },
];

// ── Salon owner nav links ───────────────────────────────────────────────────
const OWNER_NAV = [
  { label: "Dashboard", href: "/salon-owner/dashboard" },
  { label: "Salons", href: "/salons" },
];

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const { isLoggedIn, profile, signOut, isSalonOwner } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const isOwner = isLoggedIn && isSalonOwner;
  const isCustomer = isLoggedIn && !isOwner;

  const navItems = isOwner
    ? OWNER_NAV
    : isLoggedIn
    ? CUSTOMER_NAV
    : CUSTOMER_NAV.filter(item => item.label !== "Dashboard"); // Hide Dashboard for non-logged users

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : "??";

  const dashboardHref = isOwner ? "/salon-owner/dashboard" : "/";

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useLayoutEffect(() => {
    setIsMobileOpen(false);
    setIsUserMenuOpen(false);
    setIsNotifOpen(false);
  }, [pathname]);

  // Close dropdowns on outside click
  useEffect(() => {
    const close = () => { setIsUserMenuOpen(false); setIsNotifOpen(false); };
    if (isUserMenuOpen || isNotifOpen) {
      document.addEventListener("click", close, { once: true });
    }
    return () => document.removeEventListener("click", close);
  }, [isUserMenuOpen, isNotifOpen]);

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-[#0a0a0f]/85 backdrop-blur-lg border-b border-purple-500/20",
        isScrolled ? "shadow-lg shadow-black/30" : "shadow-md shadow-black/20"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href={isLoggedIn ? (isOwner ? "/salon-owner/dashboard" : "/") : "/landing"} className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30 group-hover:shadow-purple-500/50 transition-all duration-300 group-hover:scale-110">
              <Scissors className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-bold text-lg gradient-text">CuraStyl</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {/* Role badge for salon owners */}
            {isOwner && (
              <span className="mr-2 px-2.5 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-xs font-semibold text-purple-300 flex items-center gap-1.5">
                <Building2 className="w-3 h-3" />
                Salon Owner
              </span>
            )}

            {navItems.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  pathname === link.href || (link.href !== "/" && pathname?.startsWith(link.href.split("?")[0]))
                    ? "text-purple-300 bg-purple-500/10"
                    : "text-white/70 hover:text-white hover:bg-white/5"
                )}
              >
                {(link as any).icon ? (
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    {link.label}
                  </span>
                ) : (
                  link.label
                )}
              </Link>
            ))}
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            {isLoggedIn && (
              /* Notification Bell */
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => { setIsNotifOpen(!isNotifOpen); setIsUserMenuOpen(false); }}
                  className="relative p-2 rounded-lg hover:bg-white/10 transition-colors"
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5 text-white/60" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 rounded-full bg-pink-500 text-[10px] font-bold text-white flex items-center justify-center shadow-lg shadow-pink-500/40">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {isNotifOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 glass-dark rounded-2xl border border-purple-500/20 shadow-xl shadow-black/40 overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                      <p className="text-sm font-semibold text-white">Notifications</p>
                      {unreadCount > 0 && (
                        <button
                          onClick={() => markAllAsRead()}
                          className="text-[11px] text-purple-300 hover:text-purple-200 flex items-center gap-1 transition-colors"
                        >
                          <Check className="w-3 h-3" /> Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="text-center py-8 text-white/30 text-sm">
                          <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          No notifications yet
                        </div>
                      ) : (
                        notifications.slice(0, 10).map((notif) => {
                          const typeConfig = {
                            booking_confirmed: { dot: "bg-emerald-400" },
                            qr_verified:       { dot: "bg-emerald-500" },
                            booking_reminder:  { dot: "bg-amber-400" },
                            no_show_warning:   { dot: "bg-red-400" },
                            new_booking:       { dot: "bg-blue-400" },
                            customer_arrived:  { dot: "bg-emerald-400" },
                            plan_upgrade:      { dot: "bg-purple-400" },
                            glam_points:       { dot: "bg-pink-400" },
                            new_review:        { dot: "bg-yellow-400" },
                          } as Record<string, { dot: string }>;
                          const cfg = typeConfig[notif.type] ?? { dot: "bg-purple-400" };
                          return (
                            <button
                              key={notif.id}
                              onClick={() => { markAsRead(notif.id); setIsNotifOpen(false); if (notif.link) router.push(notif.link); }}
                              className={cn(
                                "w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors",
                                !notif.is_read && "bg-purple-500/5"
                              )}
                            >
                              <div className="flex items-start gap-2">
                                <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", !notif.is_read ? cfg.dot : "bg-white/10")} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-white font-medium truncate">{notif.title}</p>
                                  <p className="text-xs text-white/40 line-clamp-2 mt-0.5">{notif.message}</p>
                                  <p className="text-[10px] text-white/20 mt-1">
                                    {new Date(notif.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                  </p>
                                </div>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {isLoggedIn ? (
              /* User Avatar Menu */
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => { setIsUserMenuOpen(!isUserMenuOpen); setIsNotifOpen(false); }}
                  className="relative group flex items-center gap-2"
                >
                  <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-purple-500/30 group-hover:ring-purple-500/60 transition-all duration-300">
                    {profile?.avatar_url ? (
                      <Image 
                        src={profile.avatar_url} 
                        alt={profile.full_name || "Profile"} 
                        width={36} 
                        height={36} 
                        className="object-cover w-full h-full"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          const parent = (e.target as HTMLImageElement).parentElement;
                          if (parent) {
                            parent.innerHTML = `<div class="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">${initials}</div>`;
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                        {initials}
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#0a0a0f]" />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-60 glass-dark rounded-2xl border border-purple-500/20 shadow-xl shadow-black/40 overflow-hidden">
                    {/* Profile Header */}
                    <div className="px-4 py-3 border-b border-white/10">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold text-white truncate">{profile?.full_name}</p>
                        {isOwner ? (
                          <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-[10px] font-bold text-purple-300">OWNER</span>
                        ) : (
                          <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/40 text-[10px] font-bold text-blue-300">CUSTOMER</span>
                        )}
                      </div>
                      <p className="text-xs text-white/40 truncate">{profile?.email}</p>
                    </div>

                    {/* Menu Items */}
                    <div className="p-2 space-y-0.5">
                      <Link href="/profile" onClick={() => setIsUserMenuOpen(false)} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-white/80 hover:bg-white/5 hover:text-white transition-all">
                        <User className="w-4 h-4" /> Edit Profile
                      </Link>

                      {isOwner ? (
                        /* Salon Owner Menu */
                        <>
                         
                        </>
                      ) : (
                        /* Customer Menu */
                        <>
                          <Link href="/dashboard/bookings" onClick={() => setIsUserMenuOpen(false)} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-white/80 hover:bg-white/5 hover:text-white transition-all">
                            <Calendar className="w-4 h-4" /> My Bookings
                          </Link>
                          <Link href="/salons" onClick={() => setIsUserMenuOpen(false)} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-white/80 hover:bg-white/5 hover:text-white transition-all">
                            <Heart className="w-4 h-4" /> My Favourites
                          </Link>
                          <Link href="/rewards" onClick={() => setIsUserMenuOpen(false)} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-white/80 hover:bg-white/5 hover:text-white transition-all">
                            <Gift className="w-4 h-4" />
                            <span>GlamPoints</span>
                            <span className="ml-auto text-xs font-bold text-pink-400">{(profile as any)?.glam_points ?? 0} pts</span>
                          </Link>
                        </>
                      )}

                      <hr className="border-white/10 my-1" />

                      <button
                        onClick={signOut}
                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-all"
                      >
                        <LogOut className="w-4 h-4" /> Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link href="/auth/login"><Button variant="ghost" size="sm">Sign In</Button></Link>
                <Link href="/auth/register"><Button size="sm" className="shadow-lg shadow-purple-500/20">Get Started</Button></Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileOpen && (
        <div className="md:hidden border-t border-purple-500/20 bg-[#0a0a0f]/95 backdrop-blur-xl">
          <div className="px-4 py-4 space-y-1">
            {isOwner && (
              <div className="flex items-center gap-2 px-3 py-2 mb-2">
                <Building2 className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-semibold text-purple-300">Salon Owner Dashboard</span>
              </div>
            )}

            {navItems.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "block px-4 py-3 rounded-xl text-sm font-medium transition-all",
                  pathname === link.href
                    ? "text-purple-300 bg-purple-500/10"
                    : "text-white/70 hover:text-white hover:bg-white/5"
                )}
              >
                {link.label}
              </Link>
            ))}

            <hr className="border-white/10 my-2" />

            {isLoggedIn ? (
              <>
                <div className="px-4 py-2">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-white">{profile?.full_name}</p>
                    {isOwner ? (
                      <span className="px-1.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-[10px] font-bold text-purple-300">OWNER</span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/40 text-[10px] font-bold text-blue-300">CUSTOMER</span>
                    )}
                  </div>
                  <p className="text-xs text-white/40">{profile?.email}</p>
                </div>

                <Link href="/profile" className="block">
                  <Button variant="ghost" className="w-full justify-start gap-2" size="sm"><User className="w-4 h-4" /> Edit Profile</Button>
                </Link>

                {isOwner ? (
                  <>
                    <Link href="/salon-owner/dashboard" className="block">
                      <Button variant="ghost" className="w-full justify-start gap-2" size="sm"><LayoutDashboard className="w-4 h-4" /> Dashboard</Button>
                    </Link>
                    <Link href="/salon-owner/dashboard?tab=scan-qr" className="block">
                      <Button variant="ghost" className="w-full justify-start gap-2" size="sm"><QrCode className="w-4 h-4" /> Scan QR Code</Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href="/dashboard/bookings" className="block">
                      <Button variant="ghost" className="w-full justify-start gap-2" size="sm"><Calendar className="w-4 h-4" /> My Bookings</Button>
                    </Link>
                    <Link href="/rewards" className="block">
                      <Button variant="ghost" className="w-full justify-start gap-2 text-pink-400" size="sm"><Gift className="w-4 h-4" /> GlamPoints ({(profile as any)?.glam_points ?? 0})</Button>
                    </Link>
                  </>
                )}

                <Button onClick={signOut} variant="ghost" className="w-full justify-start gap-2 text-red-400 hover:bg-red-500/10" size="sm">
                  <LogOut className="w-4 h-4" /> Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="block"><Button variant="ghost" className="w-full justify-start" size="sm">Sign In</Button></Link>
                <Link href="/auth/register" className="block"><Button className="w-full" size="sm">Get Started</Button></Link>
                <Link href="/auth/register?role=salon_owner" className="block"><Button variant="outline" className="w-full" size="sm">List Your Salon</Button></Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
