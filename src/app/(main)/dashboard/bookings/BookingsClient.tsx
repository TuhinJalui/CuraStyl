"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Calendar, Clock, CheckCircle2, XCircle, Loader2, RefreshCw,
  Building2, Scissors, QrCode, FileText, Star, ArrowRight,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatPrice } from "@/lib/utils";
import Link from "next/link";
import toast from "react-hot-toast";
import BookingReceiptModal, { type ReceiptBooking } from "@/components/booking/BookingReceipt";

interface Booking {
  id: string;
  booking_id: string;
  booking_date: string;
  time_slot: string;
  status: "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
  total_amount: number;
  discount_amount: number;
  final_amount: number;
  coupon_code?: string;
  payment_status: "pending" | "paid" | "failed" | "refunded";
  payment_method: string;
  notes?: string;
  created_at: string;
  glam_points_earned?: number;
  user_name?: string;
  user_email?: string;
  user_phone?: string;
  salon: {
    name: string;
    cover_image: string;
    slug: string;
    address?: string;
    area?: string;
    city?: string;
    phone?: string;
  } | null;
  service: {
    name: string;
    category: string;
    duration?: number;
  } | null;
  staff?: { name: string; role?: string } | null;
}

const STATUS_CONFIG = {
  confirmed: {
    label: "Confirmed",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/30",
    icon: CheckCircle2,
  },
  pending: {
    label: "Pending",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10 border-yellow-500/30",
    icon: Clock,
  },
  completed: {
    label: "Completed",
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/30",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelled",
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/30",
    icon: XCircle,
  },
  no_show: {
    label: "No Show",
    color: "text-orange-400",
    bg: "bg-orange-500/10 border-orange-500/30",
    icon: AlertCircle,
  },
};

const FILTER_TABS = [
  { key: "all", label: "All" },
  { key: "confirmed", label: "Upcoming" },
  { key: "completed", label: "Done" },
  { key: "cancelled", label: "Cancelled" },
];

export default function DashboardBookingsClient() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [showQr, setShowQr] = useState<string | null>(null);
  const [receiptBooking, setReceiptBooking] = useState<Booking | null>(null);

  const searchParams = useSearchParams();
  const targetBookingId = searchParams.get("bookingId");

  useEffect(() => {
    if (targetBookingId && bookings.length > 0) {
      const match = bookings.find((b) => b.booking_id === targetBookingId);
      if (match) {
        setReceiptBooking(match);
      }
    }
  }, [targetBookingId, bookings]);

  const fetchBookings = useCallback(async (status = "all") => {
    setIsLoading(true);
    setError(null);
    try {
      const url = status === "all" ? "/api/bookings" : `/api/bookings?status=${status}`;
      const res = await fetch(url, { credentials: "include" });

      if (res.status === 401) {
        setError("Please log in to view your bookings");
        setBookings([]);
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load bookings");
      }

      const data = await res.json();
      setBookings(data.bookings ?? []);
    } catch (err: any) {
      console.error("Error fetching bookings:", err);
      setError(err.message || "Failed to load bookings");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings(activeFilter);
  }, [activeFilter, fetchBookings]);

  const cancelBooking = async (bookingId: string) => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;

    setCancellingId(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: "POST",
        credentials: "include",
      });

      if (res.ok) {
        toast.success("Booking cancelled successfully");
        setBookings((prev) =>
          prev.map((b) =>
            b.booking_id === bookingId ? { ...b, status: "cancelled" } : b
          )
        );
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to cancel booking");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setCancellingId(null);
    }
  };

  const openReceipt = (booking: Booking) => {
    setReceiptBooking(booking);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <p className="text-white/60 mb-4">{error}</p>
        {error.includes("log in") ? (
          <Link href="/auth/login">
            <Button>Sign In</Button>
          </Link>
        ) : (
          <Button onClick={() => fetchBookings(activeFilter)}>Try Again</Button>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-hero pt-20 pb-16">
      {/* Receipt Modal */}
      {receiptBooking && (
        <BookingReceiptModal
          booking={receiptBooking as ReceiptBooking}
          onClose={() => setReceiptBooking(null)}
        />
      )}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">My Bookings</h1>
            <p className="text-white/40 text-sm mt-1">
              {bookings.length} booking{bookings.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchBookings(activeFilter)}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-none">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
                activeFilter === tab.key
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                  : "bg-white/5 text-white/50 border border-white/10 hover:border-purple-500/30 hover:text-white/80"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-purple-400 mb-3" />
            <p className="text-white/40">Loading your bookings...</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Calendar className="w-12 h-12 text-purple-400/40 mx-auto mb-4" />
            <h3 className="text-white font-semibold text-lg mb-2">No Bookings Found</h3>
            <p className="text-white/40 mb-6">
              {activeFilter === "all"
                ? "You haven't made any bookings yet."
                : `No ${activeFilter} bookings.`}
            </p>
            <Link href="/salons">
              <Button className="gap-2">
                <Scissors className="w-4 h-4" />
                Book a Salon
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onCancel={cancelBooking}
                onOpenReceipt={openReceipt}
                cancellingId={cancellingId}
                showQr={showQr}
                setShowQr={setShowQr}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BookingCard({
  booking,
  onCancel,
  onOpenReceipt,
  cancellingId,
  showQr,
  setShowQr,
}: {
  booking: Booking;
  onCancel: (id: string) => void;
  onOpenReceipt: (booking: Booking) => void;
  cancellingId: string | null;
  showQr: string | null;
  setShowQr: (id: string | null) => void;
}) {
  const statusCfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.confirmed;
  const StatusIcon = statusCfg.icon;
  const bookingDateObj = new Date(booking.booking_date + "T00:00:00");
  const isUpcoming = bookingDateObj >= new Date() && booking.status === "confirmed";

  return (
    <div className={cn("glass-card overflow-hidden", showQr === booking.id && "ring-2 ring-purple-500/40")}>
      {/* Status bar */}
      <div className={cn("h-1 w-full", booking.status === "confirmed" ? "bg-gradient-to-r from-emerald-500 to-teal-500" : booking.status === "cancelled" ? "bg-gradient-to-r from-red-500 to-rose-500" : booking.status === "completed" ? "bg-gradient-to-r from-blue-500 to-indigo-500" : "bg-gradient-to-r from-yellow-500 to-amber-500")} />

      <div className="p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border", statusCfg.bg, statusCfg.color)}>
                <StatusIcon className="w-3 h-3" />
                {statusCfg.label}
              </span>
              <span className="text-white/30 text-xs font-mono">{booking.booking_id}</span>
            </div>
            <h3 className="text-white font-semibold text-base truncate">
              {booking.salon?.name ?? "Salon"}
            </h3>
            <p className="text-purple-300 text-sm">{booking.service?.name ?? "Service"}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xl font-bold gradient-text">{formatPrice(booking.final_amount)}</p>
            {booking.discount_amount > 0 && (
              <p className="text-emerald-400 text-xs">Saved {formatPrice(booking.discount_amount)}</p>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="flex items-center gap-2 text-sm text-white/60">
            <Calendar className="w-4 h-4 text-purple-400 shrink-0" />
            <span>{bookingDateObj.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/60">
            <Clock className="w-4 h-4 text-purple-400 shrink-0" />
            <span>{booking.time_slot}</span>
          </div>
          {booking.coupon_code && (
            <div className="col-span-2 flex items-center gap-2 text-sm text-emerald-400">
              <span className="font-mono bg-emerald-500/10 px-2 py-0.5 rounded text-xs border border-emerald-500/30">
                {booking.coupon_code}
              </span>
              <span className="text-white/40 text-xs">applied</span>
            </div>
          )}
        </div>

        {/* QR Code Expandable */}
        {showQr === booking.id && (
          <div className="mb-4 p-4 rounded-xl bg-white/95 flex flex-col items-center gap-3">
            <div className="text-gray-800 font-bold text-sm">Booking QR Code</div>
            <QRCodeSVG
              value={JSON.stringify({
                bookingId: booking.booking_id,
                salon: booking.salon?.name,
                service: booking.service?.name,
                date: booking.booking_date,
                time: booking.time_slot,
                amount: booking.final_amount,
              })}
              size={180}
            />
            <div className="text-gray-600 text-xs text-center">
              Show this QR code at the salon for verification
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 border-t border-white/10 pt-4">
          {/* QR button always shown for confirmed/completed */}
          {(booking.status === "confirmed" || booking.status === "completed") && (
            <button
              onClick={() => setShowQr(showQr === booking.id ? null : booking.id)}
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300 hover:bg-purple-500/20 transition-all"
            >
              <QrCode className="w-3.5 h-3.5" />
              {showQr === booking.id ? "Hide QR" : "Show QR"}
            </button>
          )}

          {/* Receipt / download */}
          <button
            onClick={() => onOpenReceipt(booking)}
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-all"
          >
            <FileText className="w-3.5 h-3.5" />
            Receipt
          </button>

          {/* Review link for completed */}
          {booking.status === "completed" && booking.salon?.slug && (
            <Link href={`/salons/${booking.salon.slug}?review=true`}>
              <button className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/20 transition-all">
                <Star className="w-3.5 h-3.5" />
                Review
              </button>
            </Link>
          )}

          {/* Rebook */}
          {booking.salon?.slug && (
            <Link href={`/salons/${booking.salon.slug}`}>
              <button className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-all ml-auto">
                <ArrowRight className="w-3.5 h-3.5" />
                Book Again
              </button>
            </Link>
          )}

          {/* Cancel - only for upcoming confirmed bookings */}
          {isUpcoming && (
            <button
              onClick={() => onCancel(booking.booking_id)}
              disabled={cancellingId === booking.booking_id}
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50"
            >
              {cancellingId === booking.booking_id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <XCircle className="w-3.5 h-3.5" />
              )}
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Simple QR Code SVG component (no external dependency needed)
function QRCodeSVG({ value, size = 180 }: { value: string; size?: number }) {
  // We'll use a simple encoded URL for the QR via Google Charts API
  const encoded = encodeURIComponent(value);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&format=svg`;
  
  return (
    <img 
      src={qrUrl} 
      alt="QR Code" 
      width={size} 
      height={size}
      className="rounded-lg"
    />
  );
}
