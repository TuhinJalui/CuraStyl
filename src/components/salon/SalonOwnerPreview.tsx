"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  MapPin, Phone, Globe, Star, BadgeCheck, Clock,
  ChevronLeft, Wifi, ParkingCircle, CreditCard, Wind,
  Home, Sparkles, Edit2, Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import StarRating from "@/components/shared/StarRating";
import { formatPrice, formatRating, cn } from "@/lib/utils";
import type { Salon, Service, Staff } from "@/types";

const AMENITY_ICONS: Record<string, React.ReactNode> = {
  "WiFi": <Wifi className="w-4 h-4" />,
  "Parking": <ParkingCircle className="w-4 h-4" />,
  "Card Payment": <CreditCard className="w-4 h-4" />,
  "Air Conditioned": <Wind className="w-4 h-4" />,
  "Home Service": <Home className="w-4 h-4" />,
};

interface SalonOwnerPreviewProps {
  salon: Salon;
  onEdit: () => void;
}

export default function SalonOwnerPreview({ salon, onEdit }: SalonOwnerPreviewProps) {
  const [activeTab, setActiveTab] = useState<"services" | "staff" | "about">("services");
  const [galleryIdx, setGalleryIdx] = useState<number | null>(null);

  // Real services & staff from Supabase
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [staffLoading, setStaffLoading] = useState(true);

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

  return (
    <div className="min-h-screen gradient-hero pt-16">
      {/* Back & Edit */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 flex items-center justify-between">
        <Link
          href="/salon-owner/dashboard"
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Dashboard
        </Link>
        <Button size="sm" className="gap-1.5 bg-purple-600 hover:bg-purple-500" onClick={onEdit}>
          <Edit2 className="w-4 h-4" /> Edit Salon
        </Button>
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
                  <span className="text-white font-semibold">+{(salon.gallery_images ?? []).length - 4} more</span>
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
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:8 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Info */}
          <div className="lg:col-span-2">
            {/* Header */}
            <div className="mb-6">
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

            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-white/5 rounded-xl p-1 w-fit">
              {(["services", "staff", "about"] as const).map((tab) => (
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
                      </div>
                    </div>
                  ))
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
                  <h3 className="font-semibold text-white mb-4">Contact & Location</h3>
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
                </div>
              </div>
            )}
          </div>

          {/* Right: Preview Badge */}
          <div className="lg:col-span-1">
            <div className="sticky top-28">
              <div className="glass-card p-6 border-purple-500/30 bg-purple-500/5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <Edit2 className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Preview Mode</h3>
                    <p className="text-xs text-white/50">This is how customers see your salon</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm text-white/60">
                  <p>✓ Favorite button hidden</p>
                  <p>✓ Book Now button hidden</p>
                  <p>✓ Edit button at top</p>
                </div>
                <Button className="w-full mt-4 bg-purple-600 hover:bg-purple-500" onClick={onEdit}>
                  <Edit2 className="w-4 h-4 mr-2" /> Edit Your Salon
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
