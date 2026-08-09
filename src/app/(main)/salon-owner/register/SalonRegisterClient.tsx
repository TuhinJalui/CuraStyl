"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Building2, MapPin, Image as ImageIcon,
  Clock, CheckCircle2, ChevronRight, ChevronLeft, Scissors, Loader2,
  Crown, Zap, Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, MUMBAI_AREAS } from "@/lib/utils";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/auth/useAuth";
import { useAuthStore } from "@/lib/auth/store";
import { createClient } from "@/lib/supabase/client";
import LocationPicker from "@/components/shared/LocationPicker";

type Step = 1 | 2 | 3 | 4 | 5;

const STEP_INFO = [
  { label: "Basic Info",  icon: Building2, desc: "Tell us about your salon" },
  { label: "Location",    icon: MapPin,    desc: "Where are you located?"   },
  { label: "Services",    icon: Scissors,  desc: "What do you offer?"       },
  { label: "Hours",       icon: Clock,     desc: "When are you open?"       },
  { label: "Choose Plan", icon: Crown,     desc: "Select your plan"         },
];

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const SERVICES_LIST = ["Haircut", "Hair Color", "Hair Treatment", "Facial", "Makeup", "Spa",
  "Manicure", "Pedicure", "Waxing", "Threading", "Massage", "Bridal Package", "Keratin Treatment"];

const AMENITY_OPTIONS = ["Air Conditioned", "WiFi", "Card Payment", "Parking", "Refreshments", "Private Rooms", "Kids Friendly"];

const PLANS = {
  free: {
    name: "Free",        price: 0,    emoji: "🆓", color: "gray",
    services: 5,         staff: 3,    photos: 3,
    desc: "Perfect to get started",
    features: ["5 Services", "3 Staff Members", "3 Gallery Photos", "Basic Analytics", "QR Check-in", "All Payment Methods"],
  },
  premium: {
    name: "Premium",     price: 999,  emoji: "⭐", color: "purple",
    services: 20,        staff: 10,   photos: 10,
    desc: "For growing salons",
    features: ["20 Services", "10 Staff Members", "10 Gallery Photos", "Advanced Analytics", "Featured Listing 🌟", "Priority Search Ranking", "Custom Booking Page URL", "Email Priority Support"],
    popular: true,
  },
  ultra: {
    name: "Ultra Premium", price: 2499, emoji: "👑", color: "gold",
    services: Infinity,  staff: Infinity, photos: 30,
    desc: "Maximum growth & visibility",
    features: ["Unlimited Services", "Unlimited Staff", "30 Gallery Photos", "Full Analytics + Export", "AI Style Recommendations ✨", "WhatsApp Reminders 📱", "Priority Featured Listing", "Revenue Export Reports", "24/7 Priority Support"],
  },
};

export default function SalonRegisterClient() {
  const router = useRouter();
  const { profile } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingExisting, setIsCheckingExisting] = useState(true);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(["Air Conditioned", "WiFi", "Card Payment"]);
  const [selectedPlan, setSelectedPlan] = useState<keyof typeof PLANS>("free");

  const [form, setForm] = useState({
    name: "", tagline: "", description: "", category: "unisex",
    address: "", area: "", pincode: "", phone: "", email: "", website: "", instagram: "",
  });

  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null);

  const [workingHours, setWorkingHours] = useState<Record<string, { open: string; close: string; is_closed: boolean }>>(
    DAYS.reduce((acc, day) => {
      acc[day] = { open: "10:00", close: "20:00", is_closed: day === "sunday" };
      return acc;
    }, {} as any)
  );

  // Check if owner already has a salon → redirect
  useEffect(() => {
    if (!profile) return;
    const check = async () => {
      setIsCheckingExisting(true);
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("salons")
          .select("id")
          .eq("owner_id", profile.id)
          .maybeSingle();
        if (data) {
          toast("You already have a salon listed! Redirecting to your dashboard.", { icon: "ℹ️" });
          router.replace("/salon-owner/dashboard");
        }
      } finally {
        setIsCheckingExisting(false);
      }
    };
    check();
  }, [profile, router]);

  const update = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));
  const toggleService = (s: string) => setSelectedServices(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  const toggleAmenity = (a: string) => setSelectedAmenities(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);

  const planServiceLimit = PLANS[selectedPlan].services;

  const generateSlug = (name: string) =>
    name.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");

  const handleSubmit = async () => {
    if (!profile) { toast.error("Please log in to register a salon"); return; }
    if (!form.name || !form.description || !form.address || !form.area || !form.phone || !form.email) {
      toast.error("Please fill in all required fields before submitting.");
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const slug = `${generateSlug(form.name)}-${Math.random().toString(36).substring(2, 7)}`;

      const { data: salonData, error: salonError } = await supabase
        .from("salons")
        .insert({
          owner_id: profile.id,
          name: form.name,
          slug,
          description: form.description,
          tagline: form.tagline || null,
          address: form.address,
          area: form.area,
          city: "Mumbai",
          pincode: form.pincode,
          phone: form.phone,
          email: form.email,
          website: form.website || null,
          instagram: form.instagram || null,
          cover_image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop",
          gallery_images: [
            "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800&auto=format&fit=crop",
          ],
          category: form.category,
          rating: 0,
          review_count: 0,
          starting_price: 499,
          is_verified: false,
          is_active: true,
          amenities: selectedAmenities,
          working_hours: workingHours,
          plan_tier: selectedPlan,
          plan_expires_at: selectedPlan !== "free" ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
          lat: locationCoords?.lat,
          lng: locationCoords?.lng,
        })
        .select("id")
        .single();

      if (salonError) throw new Error(salonError.message);

      // Insert services (capped to plan limit)
      if (salonData && selectedServices.length > 0) {
        const capped = selectedServices.slice(0, planServiceLimit === Infinity ? 999 : planServiceLimit);
        const servicesToInsert = capped.map((serviceName, idx) => ({
          salon_id: salonData.id,
          name: serviceName,
          description: `Professional ${serviceName} service`,
          category: serviceName,
          price: 499 + idx * 100,
          duration: 30 + (idx % 2) * 15,
          is_active: true,
        }));
        await supabase.from("services").insert(servicesToInsert);
      }

      // Update user role to salon_owner
      await supabase.from("profiles").update({ role: "salon_owner" }).eq("id", profile.id);

      // Send welcome notification to owner
      await supabase.from("notifications").insert({
        user_id: profile.id,
        type: "system",
        title: "🎉 Welcome to CuraStyl!",
        message: `Your salon "${form.name}" has been registered successfully on the ${PLANS[selectedPlan].name} plan. Your listing is under review and will go live within 24 hours!`,
        link: "/salon-owner/dashboard",
        is_read: false,
      });

      // Update client-side auth store role
      useAuthStore.getState().setProfile({ ...profile, role: "salon_owner" });

      toast.success("Salon registered successfully! 🎉");
      
      // Force a full page redirect so that the navbar, layouts, and routing tables update
      window.location.href = "/salon-owner/dashboard";
    } catch (err: any) {
      console.error("Error registering salon:", err);
      toast.error(err.message || "Failed to register salon. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCheckingExisting) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-hero pt-20 pb-16">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-white mb-2">
            List Your <span className="gradient-text">Salon</span>
          </h1>
          <p className="text-white/50">Join 500+ salons on CuraStyl and grow your business</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center mb-8">
          {STEP_INFO.map(({ label, icon: Icon }, i) => {
            const n = (i + 1) as Step;
            const done = n < step; const active = n === step;
            return (
              <div key={label} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-1">
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                    done ? "bg-emerald-500 shadow-lg shadow-emerald-500/30"
                    : active ? "bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/30"
                    : "bg-white/10"
                  )}>
                    {done ? <CheckCircle2 className="w-5 h-5 text-white" /> : <Icon className={cn("w-4 h-4", active ? "text-white" : "text-white/30")} />}
                  </div>
                  <span className={cn("text-[10px] font-medium hidden sm:block", active ? "text-purple-300" : done ? "text-emerald-400" : "text-white/30")}>
                    {label}
                  </span>
                </div>
                {i < STEP_INFO.length - 1 && <div className={cn("flex-1 h-0.5 mx-2 rounded", n < step ? "bg-emerald-500/60" : "bg-white/10")} />}
              </div>
            );
          })}
        </div>

        {/* Form Card */}
        <div className="glass-card p-6 sm:p-8">

          {/* Step 1 – Basic Info */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-white mb-1">Basic Information</h2>
              <div>
                <label className="block text-xs text-white/50 mb-1.5">Salon Name *</label>
                <Input placeholder="e.g. Glam Studio by Priya" value={form.name} onChange={e => update("name", e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1.5">Tagline</label>
                <Input placeholder="e.g. Where Beauty Meets Luxury" value={form.tagline} onChange={e => update("tagline", e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1.5">Description *</label>
                <textarea rows={4} placeholder="Tell potential clients what makes your salon special…" value={form.description} onChange={e => update("description", e.target.value)}
                  className="w-full bg-white/5 border border-purple-500/20 text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-purple-500/50 transition-colors placeholder:text-white/30 resize-none" />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1.5">Salon Type *</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["women", "men", "unisex"] as const).map(cat => (
                    <button key={cat} onClick={() => update("category", cat)}
                      className={cn("py-2.5 rounded-xl border text-sm font-medium capitalize transition-all",
                        form.category === cat ? "border-purple-400 bg-purple-500/20 text-purple-300" : "border-white/10 text-white/50 hover:border-purple-500/30")}>
                      {cat === "women" ? "👩 Women's" : cat === "men" ? "👨 Men's" : "👥 Unisex"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2 – Location */}
          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-white mb-1">Location & Contact</h2>
              
              {/* Map-based Location Picker */}
              <div>
                <label className="block text-xs text-white/50 mb-1.5">Salon Location *</label>
                <LocationPicker
                  onLocationSelect={(location) => {
                    setForm(prev => ({ 
                      ...prev, 
                      address: location.address,
                      area: location.area || prev.area, // Auto-fill area if available
                      pincode: location.pincode || prev.pincode // Auto-fill pincode if available
                    }));
                    setLocationCoords({ lat: location.lat, lng: location.lng });
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-white/50 mb-1.5">
                    Area * {form.area && <span className="text-emerald-400 text-[10px]">✓ Auto-detected</span>}
                  </label>
                  <select value={form.area} onChange={e => update("area", e.target.value)}
                    className="w-full appearance-none bg-white/5 border border-purple-500/20 text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-purple-500/50"
                    aria-label="Select area">
                    <option value="" className="bg-[#1a0a2e]">Select area</option>
                    {MUMBAI_AREAS.map(a => <option key={a} value={a} className="bg-[#1a0a2e]">{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1.5">
                    Pincode * {form.pincode && <span className="text-emerald-400 text-[10px]">✓ Auto-detected</span>}
                  </label>
                  <Input placeholder="400050" value={form.pincode} onChange={e => update("pincode", e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1.5">Phone *</label>
                <Input placeholder="+91 98765 43210" value={form.phone} onChange={e => update("phone", e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1.5">Business Email *</label>
                <Input type="email" placeholder="salon@example.com" value={form.email} onChange={e => update("email", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-white/50 mb-1.5">Website</label>
                  <Input placeholder="https://..." value={form.website} onChange={e => update("website", e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1.5">Instagram</label>
                  <Input placeholder="@yoursalon" value={form.instagram} onChange={e => update("instagram", e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* Step 3 – Services & Amenities */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">Services & Amenities</h2>
                <p className="text-white/40 text-sm">Select all services your salon provides</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {SERVICES_LIST.map(s => (
                  <button key={s} onClick={() => toggleService(s)}
                    className={cn("px-4 py-2 rounded-full border text-sm font-medium transition-all duration-200",
                      selectedServices.includes(s) ? "border-purple-400 bg-purple-500/20 text-purple-300" : "border-white/10 text-white/50 hover:border-purple-500/30 hover:text-white")}>
                    {selectedServices.includes(s) && <span className="mr-1">✓</span>}{s}
                  </button>
                ))}
              </div>
              <div className="border-t border-white/10 pt-5">
                <h3 className="text-sm font-semibold text-white mb-3">Amenities</h3>
                <div className="flex flex-wrap gap-2">
                  {AMENITY_OPTIONS.map(a => (
                    <button key={a} onClick={() => toggleAmenity(a)}
                      className={cn("px-3 py-1.5 rounded-full border text-xs font-medium transition-all",
                        selectedAmenities.includes(a) ? "border-emerald-400 bg-emerald-500/20 text-emerald-300" : "border-white/10 text-white/50 hover:border-emerald-500/30")}>
                      {selectedAmenities.includes(a) && "✓ "}{a}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4 – Hours */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">Working Hours</h2>
                <p className="text-white/40 text-sm">Set your daily operating hours</p>
              </div>
              {DAYS.map(day => {
                const h = workingHours[day];
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
          )}

          {/* Step 5 – Plan Selection */}
          {step === 5 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">Choose Your Plan</h2>
                <p className="text-white/40 text-sm">Start free, upgrade anytime from your dashboard</p>
              </div>
              <div className="space-y-3">
                {(Object.entries(PLANS) as [keyof typeof PLANS, typeof PLANS.free][]).map(([tier, plan]) => (
                  <button key={tier} onClick={() => setSelectedPlan(tier)}
                    className={cn("w-full text-left p-4 rounded-2xl border transition-all duration-200",
                      selectedPlan === tier ? "border-purple-400 bg-purple-500/10" : "border-white/10 hover:border-purple-500/30 bg-white/2"
                    )}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{plan.emoji}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">{plan.name}</span>
                          {(plan as any).popular && <span className="text-[10px] bg-purple-500 text-white px-2 py-0.5 rounded-full font-bold">POPULAR</span>}
                        </div>
                        <p className="text-xs text-white/40">{plan.desc}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-white">{plan.price === 0 ? "Free" : `₹${plan.price}`}</p>
                        {plan.price > 0 && <p className="text-[10px] text-white/40">/month</p>}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {plan.features.slice(0, 4).map(f => (
                        <span key={f} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/50">{f}</span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-sm text-white/60">
                <p className="font-medium text-purple-300 mb-1">✅ Almost there!</p>
                Your salon "{form.name}" will be reviewed within 24 hours. Once approved, customers can start booking immediately.
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-3 mt-6">
          {step > 1 && (
            <Button variant="glass" onClick={() => setStep(p => (p - 1) as Step)} className="gap-2">
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
          )}
          {step < 5 ? (
            <Button onClick={() => setStep(p => (p + 1) as Step)} className="flex-1 gap-2" disabled={step === 1 && !form.name}>
              Continue <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1 gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400">
              {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" />Submitting…</> : <><CheckCircle2 className="w-4 h-4" />Submit & Register Salon</>}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
