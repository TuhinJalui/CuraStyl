"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard, Calendar, Scissors, Users, BarChart2,
  Plus, Edit2, Trash2, CheckCircle, TrendingUp,
  IndianRupee, Star, Settings, LogOut, Bell, QrCode,
  ScanLine, Clock, CheckCircle2, AlertCircle, Store,
  Crown, X, Save, Image as ImageIcon, MapPin, Phone,
  Mail, Globe, Wifi, Wind, Car, Coffee,
  ShieldCheck, Zap, Sparkles, ChevronDown, CreditCard,
  Banknote, Info,
} from "lucide-react";

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn, formatPrice } from "@/lib/utils";
import { useAuth } from "@/lib/auth/useAuth";
import { createClient } from "@/lib/supabase/client";
import type { Service, Staff } from "@/types";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";
import SalonOwnerPreview from "@/components/salon/SalonOwnerPreview";
import LocationPicker from "@/components/shared/LocationPicker";
import PaymentProcessor from "@/components/payment/PaymentProcessor";

const QrScanner = dynamic(() => import("@/components/shared/QrScanner"), { ssr: false });

// ── Constants ─────────────────────────────────────────────────────────────────

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const AMENITY_OPTIONS = ["Air Conditioned", "WiFi", "Card Payment", "Parking", "Refreshments", "Wheelchair Access", "Private Rooms", "Kids Friendly"];
const SERVICE_CATEGORIES = ["Haircut", "Hair Color", "Hair Treatment", "Facial", "Makeup", "Spa", "Manicure", "Pedicure", "Waxing", "Threading", "Massage", "Bridal", "Other"];
const STAFF_ROLES = ["Senior Stylist", "Junior Stylist", "Colorist", "Makeup Artist", "Nail Technician", "Therapist", "Receptionist", "Manager"];

const PLAN_CONFIG = {
  free:    { name: "Free",          price: 0,    emoji: "🆓", color: "gray",   services: 5,        staff: 3,        photos: 3,  featured: false, ai: false, analytics: "basic",    support: "Community",    priorityRanking: false, customBookingUrl: false, whatsappReminders: false, exportReports: false },
  premium: { name: "Premium",       price: 999,  emoji: "⭐", color: "purple", services: 20,       staff: 10,       photos: 10, featured: true,  ai: false, analytics: "advanced", support: "Email Priority", priorityRanking: true,  customBookingUrl: true,  whatsappReminders: false, exportReports: false },
  ultra:   { name: "Ultra Premium", price: 2499, emoji: "👑", color: "gold",   services: Infinity, staff: Infinity, photos: 30, featured: true,  ai: true,  analytics: "full",     support: "Priority 24/7", priorityRanking: true,  customBookingUrl: true,  whatsappReminders: true,  exportReports: true  },
};

const statusColors: Record<string, "success" | "secondary" | "destructive" | "warning"> = {
  confirmed: "success",
  completed: "secondary",
  cancelled: "destructive",
  pending: "warning",
};

interface LiveBooking {
  id: string; booking_id: string; booking_date: string; time_slot: string;
  status: string; qr_verified: boolean; total_amount: number; final_amount: number;
  payment_method: string;
  user: { full_name: string; email: string; phone: string; avatar_url?: string | null } | null;
  service: { name: string; category: string; duration: number } | null;
  staff: { name: string; role: string } | null;
}

interface SalonData {
  id: string; name: string; tagline: string; description: string; category: string;
  address: string; area: string; pincode: string; phone: string; email: string;
  website: string; cover_image: string; gallery_images: string[];
  amenities: string[]; working_hours: Record<string, { open: string; close: string; is_closed: boolean }>;
  is_active: boolean; plan_tier: string; plan_expires_at: string | null;
  instagram: string; starting_price: number;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg glass-card p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-white text-lg">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ConfirmDialog({ open, onClose, onConfirm, title, message }: {
  open: boolean; onClose: () => void; onConfirm: () => void; title: string; message: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm glass-card p-6">
        <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mx-auto mb-3">
          <AlertCircle className="w-6 h-6 text-red-400" />
        </div>
        <h3 className="font-bold text-white text-center mb-1">{title}</h3>
        <p className="text-white/50 text-sm text-center mb-5">{message}</p>
        <div className="flex gap-3">
          <Button variant="glass" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-red-600 hover:bg-red-500" onClick={onConfirm}>Delete</Button>
        </div>
      </div>
    </div>
  );
}

// ── Reviews Section Component ──────────────────────────────────────────────────
function ReviewsSection({ salonId, salonName }: { salonId: string | null; salonName: string }) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, average: 0, distribution: [0, 0, 0, 0, 0] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!salonId) return;
    fetchReviews();
  }, [salonId]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/salon-owner/reviews");
      const data = await res.json();
      if (res.ok) {
        setReviews(data.reviews || []);
        setStats(data.statistics || { total: 0, average: 0, distribution: [0, 0, 0, 0, 0] });
      }
    } catch (err) {
      console.error("Failed to fetch reviews:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5 text-center">
          <div className="flex items-center justify-center gap-1 mb-2">
            <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
            <span className="text-4xl font-bold gradient-text">{stats.average.toFixed(1)}</span>
          </div>
          <p className="text-white/50 text-sm">Average Rating</p>
          <p className="text-white/30 text-xs mt-1">{stats.total} reviews</p>
        </div>
        
        <div className="glass-card p-5">
          <p className="text-white/50 text-xs mb-3">Rating Distribution</p>
          {[5, 4, 3, 2, 1].map((star) => (
            <div key={star} className="flex items-center gap-2 mb-1.5">
              <span className="text-xs text-white/40 w-3">{star}</span>
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-400 rounded-full"
                  style={{ width: stats.total > 0 ? `${(stats.distribution[star - 1] / stats.total) * 100}%` : "0%" }}
                />
              </div>
              <span className="text-xs text-white/40 w-8 text-right">{stats.distribution[star - 1]}</span>
            </div>
          ))}
        </div>

        <div className="glass-card p-5 text-center">
          <p className="text-4xl font-bold text-emerald-400">{stats.total}</p>
          <p className="text-white/50 text-sm mt-1">Total Reviews</p>
          <p className="text-white/30 text-xs mt-1">All time</p>
        </div>
      </div>

      {/* Reviews List */}
      <div className="glass-card p-6">
        <h2 className="font-semibold text-white mb-4">Recent Reviews</h2>
        {reviews.length === 0 ? (
          <div className="text-center py-8">
            <Star className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <p className="text-white/30">No reviews yet</p>
            <p className="text-white/20 text-sm mt-1">Reviews from customers will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="flex items-start gap-3 mb-3">
                  {review.user?.avatar_url ? (
                    <img
                      src={review.user.avatar_url}
                      alt={review.user.full_name}
                      className="w-10 h-10 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center font-bold text-purple-300 shrink-0">
                      {review.user?.full_name?.[0] || "?"}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <p className="font-semibold text-white text-sm">{review.user?.full_name || "Anonymous"}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={cn(
                                "w-3.5 h-3.5",
                                i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-white/20"
                              )}
                            />
                          ))}
                        </div>
                      </div>
                      <span className="text-xs text-white/30 shrink-0">
                        {new Date(review.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                    <p className="text-white/70 text-sm mt-2">{review.comment}</p>
                    {review.images && review.images.length > 0 && (
                      <div className="flex gap-2 mt-3">
                        {review.images.slice(0, 3).map((img: string, idx: number) => (
                          <img
                            key={idx}
                            src={img}
                            alt="Review"
                            className="w-20 h-20 rounded-lg object-cover border border-white/10"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────

const tabs = [
  { id: "overview",  label: "Overview",  icon: LayoutDashboard },
  { id: "scan-qr",   label: "Scan QR",   icon: QrCode },
  { id: "my-salon",  label: "My Salon",  icon: Store },
  { id: "services",  label: "Services",  icon: Scissors },
  { id: "staff",     label: "Staff",     icon: Users },
  { id: "reviews",   label: "Reviews",   icon: Star },
  { id: "analytics", label: "Analytics", icon: BarChart2 },
  { id: "my-plan",   label: "My Plan",   icon: Crown },
];

export default function SalonOwnerDashboard() {
  const { profile } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [mounted, setMounted] = useState(false);

  // Salon
  const [salonData, setSalonData] = useState<SalonData | null>(null);
  const [salonLoading, setSalonLoading] = useState(false);

  // Bookings
  const [liveBookings, setLiveBookings] = useState<LiveBooking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  // QR Scanner
  const [showScanner, setShowScanner] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  // Services
  const [services, setServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [serviceLimit, setServiceLimit] = useState(5);
  const [showAddService, setShowAddService] = useState(false);
  const [editService, setEditService] = useState<Service | null>(null);
  const [deleteService, setDeleteService] = useState<Service | null>(null);
  const [serviceForm, setServiceForm] = useState({ name: "", category: SERVICE_CATEGORIES[0], price: "", duration: "30", description: "", image_url: "" });
  const [serviceSaving, setServiceSaving] = useState(false);

  // Staff
  const [staff, setStaff] = useState<Staff[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffLimit, setStaffLimit] = useState(3);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [editStaff, setEditStaff] = useState<Staff | null>(null);
  const [deleteStaff, setDeleteStaff] = useState<Staff | null>(null);
  const [staffForm, setStaffForm] = useState({ name: "", role: STAFF_ROLES[0], specialization: "", experience_years: "0", avatar_url: "" });
  const [staffSaving, setStaffSaving] = useState(false);

  // Salon Edit
  const [salonForm, setSalonForm] = useState<Partial<SalonData>>({});
  const [salonSaving, setSalonSaving] = useState(false);
  const [workingHours, setWorkingHours] = useState<Record<string, { open: string; close: string; is_closed: boolean }>>({});
  const [galleryImage1, setGalleryImage1] = useState("");
  const [galleryImage2, setGalleryImage2] = useState("");
  const [galleryImage3, setGalleryImage3] = useState("");
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Plan
  const [planData, setPlanData] = useState<any>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planUpgrading, setPlanUpgrading] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentOrderData, setPaymentOrderData] = useState<any>(null);

  const salonId = salonData?.id ?? null;
  const salonName = salonData?.name ?? "My Salon";

  // ── Handle mounting and URL tab parameter ────────────────────────────────────
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam && ['overview', 'scan-qr', 'my-salon', 'services', 'staff', 'reviews', 'my-plan', 'analytics'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [mounted]);

  // ── Fetch salon ──────────────────────────────────────────────────────────────
  const fetchSalon = useCallback(async () => {
    if (!profile) return;
    setSalonLoading(true);
    try {
      const res = await fetch("/api/salon-owner/salon");
      const data = await res.json();
      if (data.salon) {
        setSalonData(data.salon);
        setSalonForm(data.salon);
        setWorkingHours(data.salon.working_hours ?? {});
        // Set individual gallery images
        const gallery = data.salon.gallery_images ?? [];
        setGalleryImage1(gallery[0] ?? "");
        setGalleryImage2(gallery[1] ?? "");
        setGalleryImage3(gallery[2] ?? "");
        if (data.salon.lat && data.salon.lng) {
          setLocationCoords({ lat: data.salon.lat, lng: data.salon.lng });
        }
      } else {
        // If owner role but no salon in DB, redirect to register
        router.replace("/salon-owner/register");
      }
    } catch (e) { console.error(e); }
    finally { setSalonLoading(false); }
  }, [profile, router]);

  useEffect(() => { fetchSalon(); }, [fetchSalon]);

  // ── Fetch bookings ───────────────────────────────────────────────────────────
  const fetchLiveBookings = useCallback(async () => {
    if (!salonId) return;
    setBookingsLoading(true);
    try {
      const res = await fetch("/api/salon-owner/bookings");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch bookings");
      setLiveBookings(data.bookings || []);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to load bookings");
    } finally {
      setBookingsLoading(false);
    }
  }, [salonId]);

  useEffect(() => {
    if (salonId && ["overview", "scan-qr"].includes(activeTab)) {
      fetchLiveBookings();
    }
  }, [salonId, activeTab, fetchLiveBookings]);

  // ── Fetch services ───────────────────────────────────────────────────────────
  const fetchServices = useCallback(async () => {
    if (!salonId) return;
    setServicesLoading(true);
    try {
      const res = await fetch("/api/salon-owner/services");
      const data = await res.json();
      setServices(data.services ?? []);
      setServiceLimit(data.limit ?? 5);
    } catch (e) { console.error(e); }
    finally { setServicesLoading(false); }
  }, [salonId]);

  useEffect(() => {
    if (salonId && activeTab === "services") fetchServices();
  }, [salonId, activeTab, fetchServices]);

  // ── Fetch staff ──────────────────────────────────────────────────────────────
  const fetchStaff = useCallback(async () => {
    if (!salonId) return;
    setStaffLoading(true);
    try {
      const res = await fetch("/api/salon-owner/staff");
      const data = await res.json();
      setStaff(data.staff ?? []);
      setStaffLimit(data.limit ?? 3);
    } catch (e) { console.error(e); }
    finally { setStaffLoading(false); }
  }, [salonId]);

  useEffect(() => {
    if (salonId && activeTab === "staff") fetchStaff();
  }, [salonId, activeTab, fetchStaff]);

  // ── Fetch plan ───────────────────────────────────────────────────────────────
  const fetchPlan = useCallback(async () => {
    if (!salonId) return;
    setPlanLoading(true);
    try {
      const res = await fetch("/api/salon-owner/plan");
      const data = await res.json();
      setPlanData(data);
    } catch (e) { console.error(e); }
    finally { setPlanLoading(false); }
  }, [salonId]);

  useEffect(() => {
    if (salonId && activeTab === "my-plan") fetchPlan();
  }, [salonId, activeTab, fetchPlan]);

  // ── QR Verify ────────────────────────────────────────────────────────────────
  const handleQrScan = async (scannedId: string) => {
    setShowScanner(false);
    const match = liveBookings.find(b => b.booking_id.toUpperCase() === scannedId.toUpperCase());
    if (!match) { toast.error(`Booking "${scannedId}" not found in today's list.`); return; }
    await verifyBooking(match.id, match.booking_id);
  };

  const verifyBooking = async (dbId: string, displayId: string) => {
    setVerifyingId(dbId);
    try {
      const res = await fetch(`/api/bookings/${dbId}/verify-qr`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");
      toast.success(`✅ Booking ${displayId} verified! Customer notified.`);
      setLiveBookings(prev => prev.map(b => b.id === dbId ? { ...b, qr_verified: true, status: "completed" } : b));
    } catch (err: any) {
      toast.error(err.message || "Failed to verify booking");
    } finally { setVerifyingId(null); }
  };

  // ── Service CRUD ─────────────────────────────────────────────────────────────
  const openAddService = () => {
    setServiceForm({ name: "", category: SERVICE_CATEGORIES[0], price: "", duration: "30", description: "", image_url: "" });
    setEditService(null);
    setShowAddService(true);
  };

  const openEditService = (svc: Service) => {
    setServiceForm({ name: svc.name, category: svc.category, price: String(svc.price), duration: String(svc.duration), description: svc.description ?? "", image_url: svc.image_url ?? "" });
    setEditService(svc);
    setShowAddService(true);
  };

  const handleSaveService = async () => {
    if (!serviceForm.name || !serviceForm.price || !serviceForm.duration) {
      toast.error("Name, price, and duration are required");
      return;
    }
    setServiceSaving(true);
    try {
      const method = editService ? "PATCH" : "POST";
      const body = editService ? { id: editService.id, ...serviceForm, price: Number(serviceForm.price), duration: Number(serviceForm.duration) } : { ...serviceForm, price: Number(serviceForm.price), duration: Number(serviceForm.duration) };
      const res = await fetch("/api/salon-owner/services", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) {
        if (data.upgradePlan) { toast.error(data.error); }
        else throw new Error(data.error);
      } else {
        toast.success(editService ? "Service updated!" : "Service added!");
        setShowAddService(false);
        fetchServices();
      }
    } catch (err: any) { toast.error(err.message); }
    finally { setServiceSaving(false); }
  };

  const handleDeleteService = async () => {
    if (!deleteService) return;
    try {
      const res = await fetch(`/api/salon-owner/services?id=${deleteService.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Service removed");
      setDeleteService(null);
      fetchServices();
    } catch (err: any) { toast.error(err.message); }
  };

  // ── Staff CRUD ───────────────────────────────────────────────────────────────
  const openAddStaff = () => {
    setStaffForm({ name: "", role: STAFF_ROLES[0], specialization: "", experience_years: "0", avatar_url: "" });
    setEditStaff(null);
    setShowAddStaff(true);
  };

  const openEditStaff = (m: Staff) => {
    setStaffForm({ name: m.name, role: m.role, specialization: m.specialization.join(", "), experience_years: String(m.experience_years), avatar_url: m.avatar_url ?? "" });
    setEditStaff(m);
    setShowAddStaff(true);
  };

  const handleSaveStaff = async () => {
    if (!staffForm.name || !staffForm.role) { toast.error("Name and role are required"); return; }
    setStaffSaving(true);
    try {
      const method = editStaff ? "PATCH" : "POST";
      const body = {
        ...(editStaff ? { id: editStaff.id } : {}),
        name: staffForm.name, role: staffForm.role,
        specialization: staffForm.specialization.split(",").map(s => s.trim()).filter(Boolean),
        experience_years: Number(staffForm.experience_years),
        avatar_url: staffForm.avatar_url || null,
      };
      const res = await fetch("/api/salon-owner/staff", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) {
        if (data.upgradePlan) toast.error(data.error);
        else throw new Error(data.error);
      } else {
        toast.success(editStaff ? "Staff updated!" : "Staff member added!");
        setShowAddStaff(false);
        fetchStaff();
      }
    } catch (err: any) { toast.error(err.message); }
    finally { setStaffSaving(false); }
  };

  const handleDeleteStaff = async () => {
    if (!deleteStaff) return;
    try {
      const res = await fetch(`/api/salon-owner/staff?id=${deleteStaff.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Staff member removed");
      setDeleteStaff(null);
      fetchStaff();
    } catch (err: any) { toast.error(err.message); }
  };

  // ── Salon Save ───────────────────────────────────────────────────────────────
  const handleSaveSalon = async () => {
    setSalonSaving(true);
    try {
      // Combine the 3 separate image URLs into an array
      const gallery = [galleryImage1, galleryImage2, galleryImage3]
        .map(s => s.trim())
        .filter(Boolean)
        .slice(0, planInfo.photos);

      const res = await fetch("/api/salon-owner/salon", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...salonForm,
          working_hours: workingHours,
          gallery_images: gallery,
          lat: locationCoords?.lat,
          lng: locationCoords?.lng,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSalonData(data.salon);
      setSalonForm(data.salon);
      // Update individual gallery images from saved data
      const savedGallery = data.salon.gallery_images ?? [];
      setGalleryImage1(savedGallery[0] ?? "");
      setGalleryImage2(savedGallery[1] ?? "");
      setGalleryImage3(savedGallery[2] ?? "");
      toast.success("Salon info saved! ✅");
    } catch (err: any) { toast.error(err.message); }
    finally { setSalonSaving(false); }
  };

  // ── Plan Upgrade ─────────────────────────────────────────────────────────────
  const handleUpgradePlan = async (tier: string) => {
    setPlanUpgrading(tier);
    try {
      console.log('[SalonOwner] Initiating plan upgrade to:', tier);
      const res = await fetch("/api/salon-owner/plan", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ tier }) 
      });
      
      console.log('[SalonOwner] Response status:', res.status);
      const data = await res.json();
      console.log('[SalonOwner] Response data:', data);
      
      if (!res.ok) {
        console.error('[SalonOwner] API Error:', data);
        throw new Error(data.error || "Failed to create payment order");
      }
      
      // Store payment order data and open payment modal
      setPaymentOrderData(data);
      setShowPaymentModal(true);
      toast.success("Payment Initiated...");
    } catch (err: any) { 
      console.error('[SalonOwner] Upgrade error:', err);
      toast.error(err.message || "Failed to upgrade plan"); 
    }
    finally { setPlanUpgrading(null); }
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setPaymentOrderData(null);
    // Show success animation/message
    toast.success("🎉 Payment successful! Your plan has been upgraded!");
    // Refresh data
    fetchPlan();
    fetchSalon();
  };

  const handlePaymentError = (error: string) => {
    toast.error(error || "Payment failed. Please try again.");
  };

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const todayBookings = liveBookings.filter(b => b.booking_date === todayStr);
  const confirmedToday = todayBookings.filter(b => b.status === "confirmed" && !b.qr_verified);
  const verifiedToday = todayBookings.filter(b => b.qr_verified);
  const currentPlan = (salonData?.plan_tier as keyof typeof PLAN_CONFIG) ?? "free";
  const planInfo = PLAN_CONFIG[currentPlan] ?? PLAN_CONFIG.free;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen gradient-hero pt-16">
      <div className="flex h-[calc(100vh-64px)]">

        {/* Sidebar */}
        <aside className="w-16 md:w-60 border-r border-white/10 bg-[#080810]/80 backdrop-blur-xl flex flex-col shrink-0">
          <div className="p-4 border-b border-white/10 hidden md:block">
            <p className="font-bold text-white text-sm truncate">{salonName}</p>
            <p className="text-white/40 text-xs mt-0.5">Owner Dashboard</p>
            <div className="mt-2">
              <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium",
                currentPlan === "ultra" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" :
                currentPlan === "premium" ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" :
                "bg-white/10 text-white/40 border border-white/10"
              )}>
                {planInfo.emoji} {planInfo.name}
              </span>
            </div>
          </div>
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  activeTab === id
                    ? id === "scan-qr" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : id === "my-plan" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : "bg-purple-500/20 text-white border border-purple-500/30"
                    : "text-white/50 hover:text-white hover:bg-white/5"
                )}
                aria-label={label}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="hidden md:block">{label}</span>
                {id === "scan-qr" && confirmedToday.length > 0 && (
                  <span className="hidden md:flex ml-auto w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold items-center justify-center">
                    {confirmedToday.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
          <div className="p-3 border-t border-white/10 space-y-1">
            <button
              onClick={() => { setActiveTab("my-salon"); }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-white/50 hover:text-white hover:bg-white/5 transition-all"
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span className="hidden md:block">Settings</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          {/* Top bar */}
          <div className="sticky top-0 z-10 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/10 px-6 py-3 flex items-center justify-between">
            <h1 className="font-semibold text-white capitalize">
              {!mounted ? "Dashboard" :
                activeTab === "scan-qr" ? "Scan & Verify QR"
                : activeTab === "my-salon" ? "My Salon Info"
                : activeTab === "my-plan" ? "Subscription Plan"
                : activeTab}
            </h1>
            <div className="flex items-center gap-2">
              {activeTab === "scan-qr" ? (
                <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-500" onClick={() => setShowScanner(true)}>
                  <ScanLine className="w-4 h-4" /><span className="hidden sm:inline">Open Scanner</span>
                </Button>
              ) : activeTab === "services" ? (
                <Button size="sm" className="gap-1.5" onClick={openAddService}>
                  <Plus className="w-4 h-4" /><span className="hidden sm:inline">Add Service</span>
                </Button>
              ) : activeTab === "staff" ? (
                <Button size="sm" className="gap-1.5" onClick={openAddStaff}>
                  <Plus className="w-4 h-4" /><span className="hidden sm:inline">Add Staff</span>
                </Button>
              ) : activeTab === "my-salon" ? (
                <div className="flex items-center gap-2">
                  <Button size="sm" variant={isPreviewMode ? "glass" : "outline"} className="gap-1.5" onClick={() => setIsPreviewMode(!isPreviewMode)}>
                    {isPreviewMode ? <Edit2 className="w-4 h-4" /> : <Store className="w-4 h-4" />}
                    {isPreviewMode ? "Edit" : "Preview"}
                  </Button>
                  {!isPreviewMode && (
                    <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-500" onClick={handleSaveSalon} disabled={salonSaving}>
                      <Save className="w-4 h-4" />{salonSaving ? "Saving…" : "Save Changes"}
                    </Button>
                  )}
                </div>
              ) : null}
            </div>
          </div>

          <div className="p-6">

            {/* ══ OVERVIEW ═══════════════════════════════════════════════════ */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: "Today's Revenue", value: `₹${todayBookings.filter(b => b.status === "completed").reduce((s, b) => s + (b.final_amount || 0), 0).toLocaleString("en-IN")}`, change: "Live", icon: IndianRupee, color: "text-emerald-400", bg: "bg-emerald-500/10" },
                    { label: "Bookings Today", value: String(todayBookings.length), change: `${verifiedToday.length} verified`, icon: Calendar, color: "text-purple-400", bg: "bg-purple-500/10" },
                    { label: "Avg Rating", value: "4.8", change: "+0.1", icon: Star, color: "text-amber-400", bg: "bg-amber-500/10" },
                    { label: "Monthly Revenue", value: `₹${liveBookings.filter(b => b.status === "completed").reduce((s, b) => s + (b.final_amount || 0), 0).toLocaleString("en-IN")}`, change: "This month", icon: TrendingUp, color: "text-pink-400", bg: "bg-pink-500/10" },
                  ].map(({ label, value, change, icon: Icon, color, bg }) => (
                    <div key={label} className="glass-card p-5">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", bg)}>
                        <Icon className={cn("w-5 h-5", color)} />
                      </div>
                      <p className="text-2xl font-bold text-white">{value}</p>
                      <p className="text-xs text-white/40 mt-0.5">{label}</p>
                      <p className="text-xs text-emerald-400 mt-1">{change}</p>
                    </div>
                  ))}
                </div>
                {/* Today's Bookings */}
                <div className="glass-card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-white">Today's Bookings</h2>
                    <button onClick={fetchLiveBookings} className="text-xs text-purple-400 hover:text-purple-300">↻ Refresh</button>
                  </div>
                  {bookingsLoading ? (
                    <div className="flex items-center justify-center py-8"><div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" /></div>
                  ) : todayBookings.length === 0 ? (
                    <p className="text-center py-6 text-white/30 text-sm">No bookings for today yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {todayBookings.slice(0, 6).map((b) => {
                        const user = b.user as any; const svc = b.service as any; const stf = b.staff as any;
                        return (
                          <div key={b.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                            <div className="flex items-center gap-3">
                              {user?.avatar_url ? (
                                <img
                                  src={user.avatar_url}
                                  alt={user?.full_name ?? "User"}
                                  className="w-8 h-8 rounded-full object-cover shrink-0"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center font-bold text-purple-300 text-sm shrink-0">
                                  {user?.full_name?.[0] ?? "?"}
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-white text-sm">{user?.full_name ?? "Unknown"}</p>
                                <p className="text-xs text-white/40">{svc?.name} • {b.time_slot}{stf ? ` • ${stf.name}` : ""}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {b.payment_method === "cash_in_hand" && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300">💵 Cash</span>}
                              <span className="text-purple-300 font-semibold text-sm">{formatPrice(b.final_amount)}</span>
                              {b.qr_verified ? <Badge variant="success">Verified ✅</Badge> : <Badge variant={statusColors[b.status] ?? "secondary"}>{b.status}</Badge>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ══ BOOKINGS ═══════════════════════════════════════════════════ */}
            {activeTab === "bookings" && (
              <div className="glass-card overflow-hidden">
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                  <h2 className="font-semibold text-white">Upcoming Bookings</h2>
                  <button onClick={fetchLiveBookings} className="text-xs text-purple-400 hover:text-purple-300">↻ Refresh</button>
                </div>
                {bookingsLoading ? (
                  <div className="flex items-center justify-center py-10"><div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" /></div>
                ) : liveBookings.length === 0 ? (
                  <p className="text-center py-10 text-white/30 text-sm">No upcoming bookings found.</p>
                ) : (
                  <div className="divide-y divide-white/5">
                    {liveBookings.map((b) => {
                      const user = b.user as any; const svc = b.service as any; const stf = b.staff as any;
                      return (
                        <div key={b.id} className="flex items-center gap-3 p-4 hover:bg-white/3 transition-colors flex-wrap">
                          {user?.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt={user?.full_name ?? "User"}
                              className="w-9 h-9 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-purple-500/20 flex items-center justify-center font-bold text-purple-300 shrink-0">
                              {user?.full_name?.[0] ?? "?"}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-white text-sm">{user?.full_name ?? "Unknown"}</p>
                            <p className="text-xs text-white/40">{svc?.name}{stf ? ` • ${stf.name}` : ""}</p>
                            {user?.phone && <p className="text-[10px] text-white/25">{user.phone}</p>}
                          </div>
                          <div className="text-xs text-white/50">{b.booking_date} {b.time_slot}</div>
                          {b.payment_method === "cash_in_hand" && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300">💵 Cash</span>}
                          <div className="font-semibold text-purple-300 text-sm">{formatPrice(b.final_amount)}</div>
                          {b.qr_verified ? <Badge variant="success">Verified ✅</Badge> : <Badge variant={statusColors[b.status] ?? "secondary"}>{b.status}</Badge>}
                          {b.status === "confirmed" && !b.qr_verified && (
                            <button onClick={() => verifyBooking(b.id, b.booking_id)} disabled={verifyingId === b.id}
                              className="p-1.5 rounded-lg hover:bg-emerald-500/20 text-white/40 hover:text-emerald-400 transition-colors">
                              {verifyingId === b.id ? <span className="w-4 h-4 border border-white/20 border-t-white rounded-full animate-spin inline-block" /> : <CheckCircle className="w-4 h-4" />}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ══ SCAN QR ════════════════════════════════════════════════════ */}
            {activeTab === "scan-qr" && (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "Awaiting", value: confirmedToday.length, color: "text-amber-400", bg: "bg-amber-500/10", icon: Clock },
                    { label: "Verified", value: verifiedToday.length, color: "text-emerald-400", bg: "bg-emerald-500/10", icon: CheckCircle2 },
                    { label: "Total Today", value: todayBookings.length, color: "text-purple-400", bg: "bg-purple-500/10", icon: Calendar },
                  ].map(({ label, value, color, bg, icon: Icon }) => (
                    <div key={label} className="glass-card p-4 text-center">
                      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-2", bg)}>
                        <Icon className={cn("w-4 h-4", color)} />
                      </div>
                      <p className={cn("text-3xl font-bold", color)}>{value}</p>
                      <p className="text-xs text-white/40 mt-1">{label}</p>
                    </div>
                  ))}
                </div>
                <div className="glass-card p-6 flex flex-col items-center gap-4 border-2 border-dashed border-emerald-500/30">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                    <QrCode className="w-8 h-8 text-emerald-400" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-white">Ready to scan?</p>
                    <p className="text-xs text-white/40 mt-1">Open camera to scan the customer's QR code</p>
                  </div>
                  <Button className="bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 shadow-lg shadow-emerald-500/20 gap-2" onClick={() => setShowScanner(true)}>
                    <ScanLine className="w-4 h-4" />Open QR Scanner
                  </Button>
                </div>
                {liveBookings.length > 0 && (
                  <div className="glass-card overflow-hidden">
                    <div className="p-4 border-b border-white/10 flex items-center justify-between">
                      <h2 className="font-semibold text-white text-sm">All Bookings ({liveBookings.length})</h2>
                      <span className="text-xs text-white/40">{todayBookings.length} today</span>
                    </div>
                    <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
                      {liveBookings.map((b) => {
                        const user = b.user as any; const svc = b.service as any;
                        const isVerified = b.qr_verified || b.status === "completed";
                        const isPending = b.status === "confirmed" && !b.qr_verified;
                        const bookingDateObj = new Date(b.booking_date + "T00:00:00");
                        const isToday = bookingDateObj.toDateString() === today.toDateString();
                        const dateLabel = isToday ? "Today" : bookingDateObj.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
                        
                        return (
                          <div key={b.id} className={cn("flex items-center gap-4 p-4 transition-colors", isVerified ? "opacity-60 bg-emerald-500/3" : "hover:bg-white/3")}>
                            {isVerified ? (
                              <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                              </div>
                            ) : user?.avatar_url ? (
                              <img
                                src={user.avatar_url}
                                alt={user?.full_name ?? "User"}
                                className="w-9 h-9 rounded-full object-cover shrink-0"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-purple-500/20 flex items-center justify-center font-bold text-purple-300 shrink-0">
                                {user?.full_name?.[0] ?? "?"}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-white text-sm">{user?.full_name ?? "Unknown"}</p>
                              <p className="text-xs text-white/40">{svc?.name} • {b.time_slot} • {dateLabel}</p>
                              <p className="text-[10px] text-white/25 font-mono">{b.booking_id}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {b.payment_method === "cash_in_hand" && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300">💵 Cash</span>}
                              {isVerified ? (
                                <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium"><CheckCircle2 className="w-3.5 h-3.5" /> Verified</span>
                              ) : isPending ? (
                                <button onClick={() => verifyBooking(b.id, b.booking_id)} disabled={verifyingId === b.id}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-medium hover:bg-emerald-500/30 transition-colors disabled:opacity-50 flex items-center gap-1.5">
                                  {verifyingId === b.id ? <><span className="w-3 h-3 border border-emerald-400/40 border-t-emerald-400 rounded-full animate-spin" />Verifying…</> : <><ScanLine className="w-3 h-3" />Verify</>}
                                </button>
                              ) : (
                                <Badge variant={statusColors[b.status] ?? "secondary"}>{b.status}</Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ══ MY SALON ═══════════════════════════════════════════════════ */}
            {activeTab === "my-salon" && (
              <div className="space-y-6">
                {salonLoading ? (
                  <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" /></div>
                ) : isPreviewMode ? (
                  <SalonOwnerPreview salon={salonData as any} onEdit={() => setIsPreviewMode(false)} />
                ) : (
                  <>
                    {/* Basic Info */}
                    <div className="glass-card p-5 space-y-4">
                      <h2 className="font-semibold text-white flex items-center gap-2"><Store className="w-4 h-4 text-purple-400" />Basic Information</h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-white/50 mb-1.5">Salon Name *</label>
                          <Input value={salonForm.name ?? ""} onChange={e => setSalonForm(p => ({ ...p, name: e.target.value }))} placeholder="Your salon name" />
                        </div>
                        <div>
                          <label className="block text-xs text-white/50 mb-1.5">Tagline</label>
                          <Input value={salonForm.tagline ?? ""} onChange={e => setSalonForm(p => ({ ...p, tagline: e.target.value }))} placeholder="e.g. Where Beauty Meets Luxury" />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs text-white/50 mb-1.5">Description *</label>
                          <textarea rows={3} value={salonForm.description ?? ""} onChange={e => setSalonForm(p => ({ ...p, description: e.target.value }))} placeholder="Describe your salon…" className="w-full bg-white/5 border border-purple-500/20 text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-purple-500/50 transition-colors placeholder:text-white/30 resize-none" />
                        </div>
                        <div>
                          <label className="block text-xs text-white/50 mb-1.5">Salon Type</label>
                          <select value={salonForm.category ?? "unisex"} onChange={e => setSalonForm(p => ({ ...p, category: e.target.value }))} className="w-full appearance-none bg-white/5 border border-purple-500/20 text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-purple-500/50" aria-label="Salon category">
                            {["women", "men", "unisex"].map(c => <option key={c} value={c} className="bg-[#1a0a2e] capitalize">{c === "women" ? "👩 Women's" : c === "men" ? "👨 Men's" : "👥 Unisex"}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-white/50 mb-1.5">Starting Price (₹)</label>
                          <Input type="number" value={salonForm.starting_price ?? 0} onChange={e => setSalonForm(p => ({ ...p, starting_price: Number(e.target.value) }))} placeholder="499" />
                        </div>
                      </div>
                    </div>

                    {/* Location & Contact */}
                    <div className="glass-card p-5 space-y-4">
                      <h2 className="font-semibold text-white flex items-center gap-2"><MapPin className="w-4 h-4 text-purple-400" />Location & Contact</h2>
                      
                      {/* Map-based Location Picker */}
                      <div className="sm:col-span-2">
                        <label className="block text-xs text-white/50 mb-1.5">Salon Location *</label>
                        <LocationPicker
                          initialLocation={locationCoords && salonForm.address ? { address: salonForm.address, lat: locationCoords.lat, lng: locationCoords.lng } : undefined}
                          onLocationSelect={(location) => {
                            setSalonForm(p => ({ 
                              ...p, 
                              address: location.address,
                              area: location.area || p.area, // Auto-fill area if available
                              pincode: location.pincode || p.pincode // Auto-fill pincode if available
                            }));
                            setLocationCoords({ lat: location.lat, lng: location.lng });
                          }}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-white/50 mb-1.5">
                            Area {salonForm.area && <span className="text-emerald-400 text-[10px]">✓</span>}
                          </label>
                          <Input value={salonForm.area ?? ""} onChange={e => setSalonForm(p => ({ ...p, area: e.target.value }))} placeholder="e.g. Bandra West" />
                        </div>
                        <div>
                          <label className="block text-xs text-white/50 mb-1.5">
                            Pincode {salonForm.pincode && <span className="text-emerald-400 text-[10px]">✓</span>}
                          </label>
                          <Input value={salonForm.pincode ?? ""} onChange={e => setSalonForm(p => ({ ...p, pincode: e.target.value }))} placeholder="400050" />
                        </div>
                        <div>
                          <label className="block text-xs text-white/50 mb-1.5 flex items-center gap-1"><Phone className="w-3 h-3" />Phone</label>
                          <Input value={salonForm.phone ?? ""} onChange={e => setSalonForm(p => ({ ...p, phone: e.target.value }))} placeholder="+91 98765 43210" />
                        </div>
                        <div>
                          <label className="block text-xs text-white/50 mb-1.5 flex items-center gap-1"><Mail className="w-3 h-3" />Business Email</label>
                          <Input type="email" value={salonForm.email ?? ""} onChange={e => setSalonForm(p => ({ ...p, email: e.target.value }))} placeholder="salon@example.com" />
                        </div>
                        <div>
                          <label className="block text-xs text-white/50 mb-1.5 flex items-center gap-1"><Globe className="w-3 h-3" />Website</label>
                          <Input value={salonForm.website ?? ""} onChange={e => setSalonForm(p => ({ ...p, website: e.target.value }))} placeholder="https://yoursalon.com" />
                        </div>
                        <div>
                          <label className="block text-xs text-white/50 mb-1.5 flex items-center gap-1"><InstagramIcon className="w-3 h-3" />Instagram</label>
                          <Input value={(salonForm as any).instagram ?? ""} onChange={e => setSalonForm(p => ({ ...p, instagram: e.target.value }))} placeholder="@yoursalon" />
                        </div>
                      </div>
                    </div>

                    {/* Photos */}
                    <div className="glass-card p-5 space-y-4">
                      <h2 className="font-semibold text-white flex items-center gap-2"><ImageIcon className="w-4 h-4 text-purple-400" />Photos</h2>
                      <div>
                        <label className="block text-xs text-white/50 mb-1.5">Cover Image URL</label>
                        <Input value={salonForm.cover_image ?? ""} onChange={e => setSalonForm(p => ({ ...p, cover_image: e.target.value }))} placeholder="https://..." />
                        {salonForm.cover_image && <img src={salonForm.cover_image} alt="Cover" className="mt-2 h-24 w-full object-cover rounded-xl" onError={e => (e.currentTarget.style.display = "none")} />}
                      </div>
                      
                      {/* Gallery Images - 3 separate inputs */}
                      <div className="space-y-3">
                        <label className="block text-xs text-white/50">Gallery Images (max {planInfo.photos})</label>
                        
                        <div>
                          <label className="block text-xs text-white/30 mb-1">Gallery Image 1</label>
                          <Input 
                            value={galleryImage1} 
                            onChange={e => setGalleryImage1(e.target.value)} 
                            placeholder="https://image1.jpg" 
                          />
                          {galleryImage1 && <img src={galleryImage1} alt="Gallery 1" className="mt-2 h-20 w-full object-cover rounded-lg" onError={e => (e.currentTarget.style.display = "none")} />}
                        </div>

                        {planInfo.photos >= 2 && (
                          <div>
                            <label className="block text-xs text-white/30 mb-1">Gallery Image 2</label>
                            <Input 
                              value={galleryImage2} 
                              onChange={e => setGalleryImage2(e.target.value)} 
                              placeholder="https://image2.jpg" 
                            />
                            {galleryImage2 && <img src={galleryImage2} alt="Gallery 2" className="mt-2 h-20 w-full object-cover rounded-lg" onError={e => (e.currentTarget.style.display = "none")} />}
                          </div>
                        )}

                        {planInfo.photos >= 3 && (
                          <div>
                            <label className="block text-xs text-white/30 mb-1">Gallery Image 3</label>
                            <Input 
                              value={galleryImage3} 
                              onChange={e => setGalleryImage3(e.target.value)} 
                              placeholder="https://image3.jpg" 
                            />
                            {galleryImage3 && <img src={galleryImage3} alt="Gallery 3" className="mt-2 h-20 w-full object-cover rounded-lg" onError={e => (e.currentTarget.style.display = "none")} />}
                          </div>
                        )}

                        <p className="text-xs text-white/30">
                          {[galleryImage1, galleryImage2, galleryImage3].filter(Boolean).length}/{planInfo.photos} photos used
                        </p>
                      </div>
                    </div>

                    {/* Amenities */}
                    <div className="glass-card p-5 space-y-4">
                      <h2 className="font-semibold text-white">Amenities</h2>
                      <div className="flex flex-wrap gap-2">
                        {AMENITY_OPTIONS.map(a => (
                          <button key={a} onClick={() => {
                            const cur = salonForm.amenities ?? [];
                            setSalonForm(p => ({ ...p, amenities: cur.includes(a) ? cur.filter(x => x !== a) : [...cur, a] }));
                          }} className={cn("px-3 py-1.5 rounded-full border text-xs font-medium transition-all",
                            (salonForm.amenities ?? []).includes(a) ? "border-purple-400 bg-purple-500/20 text-purple-300" : "border-white/10 text-white/50 hover:border-purple-500/30 hover:text-white")}>
                            {a}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Working Hours */}
                    <div className="glass-card p-5 space-y-4">
                      <h2 className="font-semibold text-white flex items-center gap-2"><Clock className="w-4 h-4 text-purple-400" />Working Hours</h2>
                      <div className="space-y-3">
                        {DAYS.map(day => {
                          const h = workingHours[day] ?? { open: "10:00", close: "20:00", is_closed: false };
                          return (
                            <div key={day} className="flex items-center gap-3 flex-wrap">
                              <span className="w-24 text-sm text-white/60 capitalize shrink-0">{day}</span>
                              <Input type="time" value={h.open} onChange={e => setWorkingHours(p => ({ ...p, [day]: { ...h, open: e.target.value } }))} className="h-9 text-sm w-32" aria-label={`${day} open`} disabled={h.is_closed} />
                              <span className="text-white/30 text-sm">to</span>
                              <Input type="time" value={h.close} onChange={e => setWorkingHours(p => ({ ...p, [day]: { ...h, close: e.target.value } }))} className="h-9 text-sm w-32" aria-label={`${day} close`} disabled={h.is_closed} />
                              <label className="flex items-center gap-1.5 text-xs text-white/40 cursor-pointer whitespace-nowrap">
                                <input type="checkbox" checked={h.is_closed} onChange={e => setWorkingHours(p => ({ ...p, [day]: { ...h, is_closed: e.target.checked } }))} className="accent-purple-500" />
                                Closed
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Cancellation Policy */}
                    <div className="glass-card p-5 space-y-4">
                      <h2 className="font-semibold text-white">Cancellation Policy</h2>
                      <textarea rows={3} value={(salonForm as any).cancellation_policy ?? ""} onChange={e => setSalonForm(p => ({ ...p, cancellation_policy: e.target.value }))} placeholder="e.g. Cancellations must be made at least 2 hours before appointment time. No-shows will be charged 50% of the service fee." className="w-full bg-white/5 border border-purple-500/20 text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-purple-500/50 transition-colors placeholder:text-white/30 resize-none" />
                    </div>

                    <div className="flex justify-end">
                      <Button className="gap-2 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 min-w-36" onClick={handleSaveSalon} disabled={salonSaving}>
                        <Save className="w-4 h-4" />{salonSaving ? "Saving…" : "Save All Changes"}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ══ SERVICES ═══════════════════════════════════════════════════ */}
            {activeTab === "services" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/50 text-sm">{services.length} services</p>
                    <p className="text-white/30 text-xs mt-0.5">
                      Plan limit: {serviceLimit === Infinity ? "Unlimited" : `${services.length}/${serviceLimit}`}
                      {services.length >= serviceLimit && serviceLimit !== Infinity && (
                        <span className="text-amber-400 ml-2">• Upgrade to add more</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  {servicesLoading ? (
                    <div className="flex items-center justify-center py-8"><div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" /></div>
                  ) : services.length === 0 ? (
                    <div className="glass-card p-10 text-center">
                      <Scissors className="w-10 h-10 text-white/20 mx-auto mb-3" />
                      <p className="text-white/30 text-sm">No services added yet.</p>
                      <Button size="sm" className="mt-4 gap-1.5" onClick={openAddService}><Plus className="w-4 h-4" />Add Your First Service</Button>
                    </div>
                  ) : services.map(svc => (
                    <div key={svc.id} className="glass-card p-4 flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-white">{svc.name}</p>
                          <Badge variant="secondary" className="text-[10px]">{svc.category}</Badge>
                        </div>
                        {svc.description && <p className="text-xs text-white/40 mt-0.5">{svc.description}</p>}
                        <p className="text-xs text-white/30 mt-0.5">{svc.duration} min</p>
                      </div>
                      <p className="font-bold gradient-text text-lg">{formatPrice(svc.price)}</p>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEditService(svc)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => setDeleteService(svc)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ══ STAFF ══════════════════════════════════════════════════════ */}
            {activeTab === "staff" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/50 text-sm">{staff.length} staff members</p>
                    <p className="text-white/30 text-xs mt-0.5">
                      Plan limit: {staffLimit === Infinity ? "Unlimited" : `${staff.length}/${staffLimit}`}
                      {staff.length >= staffLimit && staffLimit !== Infinity && <span className="text-amber-400 ml-2">• Upgrade to add more</span>}
                    </p>
                  </div>

                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {staffLoading ? (
                    <div className="flex items-center justify-center py-8 col-span-3"><div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" /></div>
                  ) : staff.length === 0 ? (
                    <div className="glass-card p-10 text-center col-span-3">
                      <Users className="w-10 h-10 text-white/20 mx-auto mb-3" />
                      <p className="text-white/30 text-sm">No staff added yet.</p>
                      <Button size="sm" className="mt-4 gap-1.5" onClick={openAddStaff}><Plus className="w-4 h-4" />Add Your First Staff Member</Button>
                    </div>
                  ) : staff.map(member => (
                    <div key={member.id} className="glass-card p-4">
                      <div className="flex items-start gap-3 mb-3">
                        {member.avatar_url ? (
                          <img src={member.avatar_url} alt={member.name} className="w-12 h-12 rounded-xl object-cover shrink-0" onError={e => (e.currentTarget.src = "")} />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center font-bold text-purple-300 text-lg shrink-0">{member.name[0]}</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white text-sm">{member.name}</p>
                          <p className="text-xs text-purple-300">{member.role}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-xs text-white/60">{member.rating} • {member.experience_years}yr</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEditStaff(member)} className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setDeleteStaff(member)} className="p-1 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {member.specialization.map(s => (
                          <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300">{s}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ══ REVIEWS ════════════════════════════════════════════════════ */}
            {activeTab === "reviews" && (
              <ReviewsSection salonId={salonId} salonName={salonName} />
            )}

            {/* ══ ANALYTICS ══════════════════════════════════════════════════ */}
            {activeTab === "analytics" && (
              <div className="space-y-6">
                <div className="glass-card p-5">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="font-semibold text-white">Revenue Overview</h2>
                    {currentPlan === "free" && <span className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-full">📊 Upgrade for full analytics</span>}
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                    {[
                      { label: "Total Bookings", value: liveBookings.length },
                      { label: "Completed", value: liveBookings.filter(b => b.status === "completed").length },
                      { label: "Cancelled", value: liveBookings.filter(b => b.status === "cancelled").length },
                      { label: "Pending", value: liveBookings.filter(b => b.status === "confirmed" && !b.qr_verified).length },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-white/5 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold gradient-text">{value}</p>
                        <p className="text-xs text-white/40 mt-1">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { label: "Repeat Customers", value: "68%", desc: "Up from 58% last quarter" },
                    { label: "Avg Booking Value", value: liveBookings.length > 0 ? `₹${Math.round(liveBookings.reduce((s, b) => s + b.final_amount, 0) / liveBookings.length).toLocaleString("en-IN")}` : "₹0", desc: "Per appointment" },
                    { label: "Cancellation Rate", value: liveBookings.length > 0 ? `${Math.round((liveBookings.filter(b => b.status === "cancelled").length / liveBookings.length) * 100)}%` : "0%", desc: "Of all bookings" },
                  ].map(({ label, value, desc }) => (
                    <div key={label} className="glass-card p-4 text-center">
                      <p className="text-3xl font-bold gradient-text">{value}</p>
                      <p className="font-medium text-white text-sm mt-1">{label}</p>
                      <p className="text-xs text-white/40 mt-1">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ══ MY PLAN ════════════════════════════════════════════════════ */}
            {activeTab === "my-plan" && (
              <div className="space-y-6">
                {/* Current Plan Banner */}
                <div className={cn("glass-card p-6 border-2",
                  currentPlan === "ultra" ? "border-amber-500/40" : currentPlan === "premium" ? "border-purple-500/40" : "border-white/10"
                )}>
                  <div className="flex items-center gap-4">
                    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-3xl",
                      currentPlan === "ultra" ? "bg-amber-500/10" : currentPlan === "premium" ? "bg-purple-500/10" : "bg-white/5"
                    )}>
                      {planInfo.emoji}
                    </div>
                    <div>
                      <p className="font-bold text-white text-xl">{planInfo.name} Plan</p>
                      <p className="text-white/40 text-sm">
                        {planInfo.price === 0 ? "Free forever" : `₹${planInfo.price}/month`}
                        {salonData?.plan_expires_at && ` • Renews ${new Date(salonData.plan_expires_at).toLocaleDateString("en-IN")}`}
                      </p>
                    </div>
                    {currentPlan !== "ultra" && (
                      <div className="ml-auto">
                        <Button 
                          onClick={() => {
                            // Scroll to upgrade cards
                            const upgradeSection = document.querySelector('[data-upgrade-cards]');
                            if (upgradeSection) {
                              upgradeSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                          }} 
                          className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400"
                        >
                          <Crown className="w-4 h-4" />Upgrade
                        </Button>
                      </div>
                    )}
                  </div>
                  {/* Usage */}
                  {planData && (
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="bg-white/5 rounded-xl p-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-white/50">Services</span>
                          <span className="text-xs text-white/70">{planData.usage?.services}/{planInfo.services === Infinity ? "∞" : planInfo.services}</span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all" style={{ width: planInfo.services === Infinity ? "30%" : `${Math.min(100, ((planData.usage?.services ?? 0) / planInfo.services) * 100)}%` }} />
                        </div>
                      </div>
                      <div className="bg-white/5 rounded-xl p-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-white/50">Staff</span>
                          <span className="text-xs text-white/70">{planData.usage?.staff}/{planInfo.staff === Infinity ? "∞" : planInfo.staff}</span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all" style={{ width: planInfo.staff === Infinity ? "30%" : `${Math.min(100, ((planData.usage?.staff ?? 0) / planInfo.staff) * 100)}%` }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Plan Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-upgrade-cards>
                  {Object.entries(PLAN_CONFIG).map(([tier, plan]) => {
                    const isCurrent = tier === currentPlan;
                    const isHigher = Object.keys(PLAN_CONFIG).indexOf(tier) > Object.keys(PLAN_CONFIG).indexOf(currentPlan);
                    return (
                      <div key={tier} className={cn("glass-card p-5 relative overflow-hidden transition-all duration-300",
                        isCurrent ? "border-2 border-purple-500/50" :
                        tier === "ultra" ? "border-2 border-amber-500/30 hover:border-amber-500/60" :
                        "border border-white/10 hover:border-purple-500/30"
                      )}>
                        {tier === "premium" && !isCurrent && (
                          <div className="absolute top-3 right-3 text-[10px] bg-purple-500 text-white px-2 py-0.5 rounded-full font-bold">POPULAR</div>
                        )}
                        {tier === "ultra" && !isCurrent && (
                          <div className="absolute top-3 right-3 text-[10px] bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2 py-0.5 rounded-full font-bold">BEST VALUE</div>
                        )}
                        {isCurrent && (
                          <div className="absolute top-3 right-3 text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-full font-bold">CURRENT</div>
                        )}
                        <div className="text-3xl mb-2">{plan.emoji}</div>
                        <h3 className="font-bold text-white text-lg">{plan.name}</h3>
                        <p className="text-2xl font-bold gradient-text mt-1">
                          {plan.price === 0 ? "Free" : `₹${plan.price}`}
                          {plan.price > 0 && <span className="text-sm text-white/40 font-normal">/month</span>}
                        </p>
                        <div className="mt-4 space-y-2">
                          {[
                            { icon: Scissors,    text: `${plan.services === Infinity ? "Unlimited" : plan.services} Services` },
                            { icon: Users,       text: `${plan.staff === Infinity ? "Unlimited" : plan.staff} Staff Members` },
                            { icon: ImageIcon,   text: `${plan.photos} Gallery Photos` },
                            { icon: BarChart2,   text: `${plan.analytics === "full" ? "Full + Export" : plan.analytics === "advanced" ? "Advanced" : "Basic"} Analytics` },
                            { icon: Star,        text: plan.featured ? "✓ Featured Listing" : "Standard Listing", ok: plan.featured },
                            { icon: TrendingUp,  text: plan.priorityRanking ? "✓ Priority Search Ranking" : "Standard Ranking", ok: plan.priorityRanking },
                            { icon: QrCode,      text: plan.customBookingUrl ? "✓ Custom Booking Page URL" : "Default URL", ok: plan.customBookingUrl },
                            { icon: Sparkles,    text: "AI Style Recommendations", ok: plan.ai },
                            { icon: Banknote,    text: plan.whatsappReminders ? "✓ WhatsApp Reminders" : "Email Only", ok: plan.whatsappReminders },
                            { icon: ChevronDown, text: plan.exportReports ? "✓ Export Revenue Reports" : "No Export", ok: plan.exportReports },
                            { icon: ShieldCheck, text: `${plan.support} Support` },
                          ].map(({ icon: Icon, text, ok }) => (
                            <div key={text} className={cn("flex items-center gap-2 text-sm", ok === false ? "opacity-30" : "")}>
                              <Icon className={cn("w-3.5 h-3.5 shrink-0", ok === false ? "text-white/30" : "text-purple-400")} />
                              <span className="text-white/70">{text}</span>
                              {ok === false && <span className="text-white/20 ml-auto text-xs">✗</span>}
                              {ok === true && <span className="text-emerald-400 ml-auto text-xs">✓</span>}
                            </div>
                          ))}
                        </div>
                        {!isCurrent && isHigher && (
                          <Button
                            className={cn("w-full mt-4 gap-2", tier === "ultra" ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400" : "")}
                            onClick={() => handleUpgradePlan(tier)}
                            disabled={planUpgrading === tier}
                          >
                            {planUpgrading === tier ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Upgrading…</> : <><Zap className="w-4 h-4" />Upgrade to {plan.name}</>}
                          </Button>
                        )}
                        {isCurrent && (
                          <div className="mt-4 text-center text-xs text-emerald-400 font-medium">✓ Active Plan</div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Feature comparison note */}
                <div className="glass-card p-4 flex items-start gap-3">
                  <Info className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                   <p className="text-sm text-white/50">All plans include: QR code check-in, booking management, customer notifications (reminder + no-show + confirmed), cash &amp; online payment support, and real-time dashboard. Upgrade to <strong className="text-purple-300">Premium</strong> for featured listing + priority ranking + custom booking URL. <strong className="text-amber-300">Ultra</strong> adds AI recommendations, WhatsApp reminders, and full revenue exports.</p>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* QR Scanner Modal */}
      {showScanner && <QrScanner onScan={handleQrScan} onClose={() => setShowScanner(false)} />}

      {/* Add/Edit Service Modal */}
      <Modal open={showAddService} onClose={() => setShowAddService(false)} title={editService ? "Edit Service" : "Add New Service"}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Service Name *</label>
            <Input value={serviceForm.name} onChange={e => setServiceForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Premium Haircut" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/50 mb-1.5">Category *</label>
              <select value={serviceForm.category} onChange={e => setServiceForm(p => ({ ...p, category: e.target.value }))} className="w-full appearance-none bg-white/5 border border-purple-500/20 text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-purple-500/50" aria-label="Service category">
                {SERVICE_CATEGORIES.map(c => <option key={c} value={c} className="bg-[#1a0a2e]">{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1.5">Price (₹) *</label>
              <Input type="number" value={serviceForm.price} onChange={e => setServiceForm(p => ({ ...p, price: e.target.value }))} placeholder="499" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Duration (minutes) *</label>
            <Input type="number" value={serviceForm.duration} onChange={e => setServiceForm(p => ({ ...p, duration: e.target.value }))} placeholder="30" />
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Description</label>
            <textarea rows={2} value={serviceForm.description} onChange={e => setServiceForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief description of the service" className="w-full bg-white/5 border border-purple-500/20 text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-purple-500/50 transition-colors placeholder:text-white/30 resize-none" />
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Image URL (optional)</label>
            <Input value={serviceForm.image_url} onChange={e => setServiceForm(p => ({ ...p, image_url: e.target.value }))} placeholder="https://..." />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="glass" className="flex-1" onClick={() => setShowAddService(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleSaveService} disabled={serviceSaving}>
              {serviceSaving ? "Saving…" : editService ? "Update Service" : "Add Service"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add/Edit Staff Modal */}
      <Modal open={showAddStaff} onClose={() => setShowAddStaff(false)} title={editStaff ? "Edit Staff Member" : "Add Staff Member"}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Full Name *</label>
            <Input value={staffForm.name} onChange={e => setStaffForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Priya Sharma" />
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Role *</label>
            <select value={staffForm.role} onChange={e => setStaffForm(p => ({ ...p, role: e.target.value }))} className="w-full appearance-none bg-white/5 border border-purple-500/20 text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-purple-500/50" aria-label="Staff role">
              {STAFF_ROLES.map(r => <option key={r} value={r} className="bg-[#1a0a2e]">{r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Specializations (comma separated)</label>
            <Input value={staffForm.specialization} onChange={e => setStaffForm(p => ({ ...p, specialization: e.target.value }))} placeholder="e.g. Balayage, Hair Color, Keratin" />
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Experience (years)</label>
            <Input type="number" value={staffForm.experience_years} onChange={e => setStaffForm(p => ({ ...p, experience_years: e.target.value }))} placeholder="0" />
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Photo URL (optional)</label>
            <Input value={staffForm.avatar_url} onChange={e => setStaffForm(p => ({ ...p, avatar_url: e.target.value }))} placeholder="https://..." />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="glass" className="flex-1" onClick={() => setShowAddStaff(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleSaveStaff} disabled={staffSaving}>
              {staffSaving ? "Saving…" : editStaff ? "Update Staff" : "Add Staff Member"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirm Delete Service */}
      <ConfirmDialog
        open={!!deleteService} onClose={() => setDeleteService(null)} onConfirm={handleDeleteService}
        title="Remove Service?" message={`"${deleteService?.name}" will be hidden from your salon listing. Existing bookings won't be affected.`}
      />

      {/* Confirm Delete Staff */}
      <ConfirmDialog
        open={!!deleteStaff} onClose={() => setDeleteStaff(null)} onConfirm={handleDeleteStaff}
        title="Remove Staff Member?" message={`"${deleteStaff?.name}" will be removed from your team. Future bookings with them will need to be reassigned.`}
      />

      {/* Payment Modal for Plan Upgrade */}
      {showPaymentModal && paymentOrderData && (
        <Modal 
          open={showPaymentModal} 
          onClose={() => setShowPaymentModal(false)} 
          title={`Upgrade to ${paymentOrderData.planName || 'Premium'}`}
        >
          <div className="space-y-4">
            <div className="glass-card p-4 text-center">
              <p className="text-white/50 text-sm">Total Amount</p>
              <p className="text-4xl font-bold gradient-text">₹{paymentOrderData.amount}</p>
              <p className="text-white/30 text-xs mt-1">Order ID: {paymentOrderData.orderId}</p>
            </div>
            
            <PaymentProcessor
              amount={paymentOrderData.amount}
              orderId={paymentOrderData.orderId}
              type="plan_upgrade_salon"
              metadata={paymentOrderData.metadata || {}}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
