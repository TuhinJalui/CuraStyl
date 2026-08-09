"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  CheckCircle2, Tag, CreditCard, Smartphone, Wallet, ChevronRight,
  Scissors, Calendar, Clock, User, Building2, Loader2, Download,
  Sparkles, MapPin, QrCode, Banknote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatPrice } from "@/lib/utils";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/auth/useAuth";
import { buildPrintHTML, type ReceiptBooking, QRImage } from "@/components/booking/BookingReceipt";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

const VALID_COUPONS: Record<string, { type: "pct" | "fixed"; value: number }> = {
  MONDAY20: { type: "pct", value: 20 },
  FIRST15: { type: "pct", value: 15 },
  BRIDE2024: { type: "fixed", value: 2000 },
  GLAMHUB10: { type: "pct", value: 10 },
};

const PAYMENT_METHODS = [
  { id: "upi",          label: "UPI",               icon: Smartphone, desc: "Pay via any UPI app" },
  { id: "card",         label: "Credit / Debit Card",icon: CreditCard,  desc: "Visa, Mastercard, RuPay" },
  { id: "wallet",       label: "GlamHub Wallet",     icon: Wallet,      desc: "Balance: ₹0" },
  { id: "cash_in_hand", label: "Cash in Hand",        icon: Banknote,    desc: "Pay directly at the salon" },
];

export default function CheckoutClient() {
  const { profile, isSalonOwner } = useAuth();
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (profile && isSalonOwner) {
      toast.error("Salon owners are not allowed to book appointments.");
      router.replace("/salon-owner/dashboard");
    }
  }, [profile, isSalonOwner, router]);

  const bookingId = params.get("bookingId") ?? "";
  const salonId = params.get("salonId") ?? "";
  const serviceId = params.get("serviceId") ?? "";
  const staffId = params.get("staffId") ?? "";
  const salonName = params.get("salonName") ?? "Salon";
  const serviceName = params.get("serviceName") ?? "Service";
  const price = Number(params.get("price") ?? 0);
  const date = params.get("date") ?? "";
  const time = params.get("time") ?? "";
  const staffName = params.get("staffName") ?? "Any available";

  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; type: "pct" | "fixed"; value: number; id: string } | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdBookingId, setCreatedBookingId] = useState("");
  const [createdBooking, setCreatedBooking] = useState<any>(null);
  const [upiId, setUpiId] = useState("");

  const discount = appliedCoupon
    ? appliedCoupon.type === "pct"
      ? Math.round((price * appliedCoupon.value) / 100)
      : Math.min(appliedCoupon.value, price)
    : 0;

  const taxes = Math.round((price - discount) * 0.05);
  const total = price - discount + taxes;

  const applyCoupon = async () => {
    const code = coupon.trim().toUpperCase();
    if (!code) {
      toast.error("Please enter a coupon code");
      return;
    }

    setValidatingCoupon(true);
    try {
      const res = await fetch("/api/bookings/validate-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, amount: price }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Invalid coupon");
      }

      const couponData = data.coupon;
      setAppliedCoupon({
        code: couponData.code,
        type: couponData.discount_type === "percentage" ? "pct" : "fixed",
        value: couponData.discount_value,
        id: couponData.id,
      });

      const discountAmt = couponData.discount_type === "percentage"
        ? Math.round((price * couponData.discount_value) / 100)
        : Math.min(couponData.discount_value, price);

      toast.success(`Coupon "${code}" applied! You save ${couponData.discount_type === "percentage" ? couponData.discount_value + "%" : formatPrice(discountAmt)}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to apply coupon");
    } finally {
      setValidatingCoupon(false);
    }
  };

  const isCash = paymentMethod === "cash_in_hand";

  // UPI ID validation regex
  const validateUpiId = (id: string) => {
    // Standard UPI format: alphanumeric@bank (e.g., name@upi, 1234567890@paytm)
    const upiRegex = /^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z0-9]{2,}$/;
    return upiRegex.test(id.trim());
  };

  const handlePay = async () => {
    // Validate UPI ID if payment method is UPI
    if (paymentMethod === "upi") {
      if (!upiId.trim()) {
        toast.error("Please enter your UPI ID");
        return;
      }
      if (!validateUpiId(upiId)) {
        toast.error("You entered an invalid UPI ID. Please enter a valid UPI ID (e.g., yourname@upi)");
        return;
      }
    }
    setIsProcessing(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salonId,
          serviceId,
          staffId: staffId || null,
          date,
          timeSlot: time,
          couponCode: appliedCoupon?.code || null,
          paymentMethod,
          // Cash bookings stay pending until salon scans QR
          paymentStatus: isCash ? "pending" : "paid",
          paymentId: isCash ? null : "pay_" + Math.random().toString(36).substring(2, 11).toUpperCase(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create booking");
      }

      setCreatedBooking(data.booking);
      setCreatedBookingId(data.booking.booking_id);
      setIsSuccess(true);
      toast.success(isCash ? "Booking confirmed! Pay at the salon 💵" : "Booking confirmed successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to complete booking. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadReceipt = async () => {
    if (!createdBooking) return;
    setIsProcessing(true);
    try {
      // Find the loaded base64 QR code image from the success page screen
      const qrImg = document.querySelector('img[alt="Booking QR Code"]') as HTMLImageElement;
      const qrUrl = qrImg ? qrImg.src : "";

      const pointsEarned = Math.floor(createdBooking.final_amount / 100) * 10;
      const bookingDateFmt = new Date(createdBooking.booking_date + "T00:00:00").toLocaleDateString("en-IN", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
      });
      const createdFmt = new Date(createdBooking.created_at).toLocaleString("en-IN", {
        day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
      });

      const bookingDataForPrint: ReceiptBooking = {
        id: createdBooking.id || "",
        booking_id: createdBooking.booking_id,
        booking_date: createdBooking.booking_date,
        time_slot: createdBooking.time_slot,
        status: createdBooking.status || "confirmed",
        payment_status: createdBooking.payment_status || "paid",
        payment_method: paymentMethod,
        total_amount: createdBooking.total_amount || price,
        discount_amount: createdBooking.discount_amount || discount,
        final_amount: createdBooking.final_amount || total,
        coupon_code: createdBooking.coupon_code || (appliedCoupon?.code || null),
        created_at: createdBooking.created_at || new Date().toISOString(),
        glam_points_earned: pointsEarned,
        user_name: profile?.full_name || "",
        user_email: profile?.email || "",
        user_phone: profile?.phone || "",
        salon: {
          name: salonName,
          address: "Linking Road, Bandra West",
          area: "Bandra",
          city: "Mumbai",
          phone: "+91 98765 00000",
        },
        service: {
          name: serviceName,
          category: "Hair",
          duration: 30,
        },
        staff: {
          name: staffName,
          role: "Stylist",
        },
      };

      const htmlContent = buildPrintHTML({
        booking: bookingDataForPrint,
        bookingDateFmt,
        createdFmt,
        pointsEarned,
        qrUrl,
      });

      // Create a temporary hidden iframe to render the standard hex styled HTML
      const iframe = document.createElement("iframe");
      iframe.style.position = "absolute";
      iframe.style.width = "480px";
      iframe.style.height = "1000px";
      iframe.style.left = "-9999px";
      iframe.style.top = "-9999px";
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
      if (!iframeDoc) throw new Error("Could not access iframe document");

      iframeDoc.open();
      iframeDoc.write(htmlContent);
      iframeDoc.close();

      // Wait for image loading
      await new Promise((resolve) => {
        const checkLoaded = () => {
          const imgs = iframeDoc.querySelectorAll("img");
          let loadedCount = 0;
          if (imgs.length === 0) {
            resolve(true);
            return;
          }
          imgs.forEach((img) => {
            if (img.complete) {
              loadedCount++;
            } else {
              img.addEventListener("load", () => {
                loadedCount++;
                if (loadedCount === imgs.length) resolve(true);
              });
              img.addEventListener("error", () => {
                loadedCount++;
                if (loadedCount === imgs.length) resolve(true);
              });
            }
          });
          if (loadedCount === imgs.length) resolve(true);
        };
        setTimeout(checkLoaded, 150);
      });

      const receiptElement = iframeDoc.querySelector(".receipt") as HTMLElement;
      if (!receiptElement) throw new Error("Receipt element not found in iframe");

      const canvas = await html2canvas(receiptElement, {
        scale: 2.5,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
      });

      document.body.removeChild(iframe);

      const imgData = canvas.toDataURL("image/jpeg", 1.0);
      
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: [canvas.width / 2.5, canvas.height / 2.5],
      });
      
      const width = pdf.internal.pageSize.getWidth();
      const height = pdf.internal.pageSize.getHeight();
      
      pdf.addImage(imgData, "JPEG", 0, 0, width, height);
      pdf.save(`CuraStyl-Receipt-${createdBooking.booking_id}.pdf`);
      toast.success("Receipt downloaded as PDF!");
    } catch (err: any) {
      console.error("PDF generation failed:", err);
      toast.error("Failed to generate PDF receipt.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (isSuccess) {
    const qrPayload = createdBooking ? JSON.stringify({
      bookingId: createdBooking.booking_id,
      salonId: salonName,
      service: serviceName,
      date: createdBooking.booking_date,
      time: createdBooking.time_slot,
      amount: createdBooking.final_amount,
      paymentStatus: createdBooking.payment_status,
    }) : "";

    const pointsEarned = createdBooking ? Math.floor(createdBooking.final_amount / 100) * 10 : 0;
    const bookingDateFmt = createdBooking ? new Date(createdBooking.booking_date + "T00:00:00").toLocaleDateString("en-IN", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    }) : "";
    const createdFmt = createdBooking ? new Date(createdBooking.created_at).toLocaleString("en-IN", {
      day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    }) : "";
    const qrUrl = createdBooking ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(qrPayload)}&ecc=M&format=png&color=7c3aed&bgcolor=ffffff` : "";

    return (
      <div className="min-h-screen gradient-hero pt-24 pb-16 flex items-center justify-center px-4">
        <div className="text-center max-w-md w-full">
          <div className="relative w-20 h-20 mx-auto mb-5">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-2 border-emerald-500/40 flex items-center justify-center animate-glow">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <div className="absolute -inset-1.5 rounded-full border border-emerald-500/20 animate-ping opacity-30" />
          </div>

          <h1 className="text-3xl font-bold text-white mb-2 font-display">Booking Confirmed!</h1>
          
          <div className="flex justify-center mb-5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Status: Active &amp; Confirmed (Paid)
            </span>
          </div>

          {createdBooking && (
            <div className="glass-card p-5 mb-5 inline-block mx-auto w-auto">
              <QRImage data={qrPayload} size={160} className="shadow-purple-500/10" />
              <p className="text-white/40 text-[10px] mt-2 max-w-[200px] mx-auto leading-tight">📱 Present this QR at the salon for verification</p>
            </div>
          )}

          <div className="glass-card p-6 text-left space-y-3 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-white/40">Booking ID</span>
              <span className="text-purple-300 font-mono font-bold">{createdBookingId || bookingId}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/40">Salon</span>
              <span className="text-white font-medium">{salonName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/40">Service</span>
              <span className="text-white">{serviceName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/40">Date &amp; Time</span>
              <span className="text-white">{new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} at {time}</span>
            </div>
            <div className="border-t border-white/10 pt-3 flex justify-between">
              <span className="text-white/60 font-medium">Amount Paid</span>
              <span className="text-xl font-bold gradient-text">{formatPrice(total)}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={downloadReceipt}
              disabled={isProcessing}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg shadow-purple-500/20 gap-2 shrink-0"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating PDF…
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download Receipt (PDF)
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard/bookings")}
              className="border-white/10 hover:bg-white/5 hover:text-white"
            >
              View My Bookings
            </Button>
            <Button
              variant="ghost"
              onClick={() => router.push("/salons")}
              className="text-purple-300 hover:text-purple-200 hover:bg-purple-500/10"
            >
              Book Another
            </Button>
          </div>
        </div>

      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-hero pt-20 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-white mb-8">Complete Your Booking</h1>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* Left: Payment */}
          <div className="md:col-span-3 space-y-5">
            {/* Coupon */}
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Tag className="w-4 h-4 text-purple-400" />
                <h2 className="font-semibold text-white">Promo Code</h2>
              </div>
              {appliedCoupon ? (
                <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="font-mono font-bold text-emerald-300">{appliedCoupon.code}</span>
                    <span className="text-emerald-400 text-sm">applied</span>
                  </div>
                  <button
                    onClick={() => setAppliedCoupon(null)}
                    className="text-xs text-white/40 hover:text-white transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter promo code (e.g., GLAM123ABC)"
                    value={coupon}
                    onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && !validatingCoupon && applyCoupon()}
                    disabled={validatingCoupon}
                    className="font-mono uppercase"
                  />
                  <Button
                    onClick={applyCoupon}
                    disabled={validatingCoupon}
                    variant="outline"
                    className="shrink-0"
                  >
                    {validatingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                  </Button>
                </div>
              )}
            </div>

            {/* Payment Methods */}
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-4 h-4 text-purple-400" />
                <h2 className="font-semibold text-white">Payment Method</h2>
              </div>
              <div className="space-y-2">
                {PAYMENT_METHODS.map(({ id, label, icon: Icon, desc }) => (
                  <button
                    key={id}
                    onClick={() => setPaymentMethod(id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all duration-200 text-left",
                      paymentMethod === id
                        ? "border-purple-400/60 bg-purple-500/10"
                        : "border-white/10 bg-white/3 hover:border-purple-500/30"
                    )}
                  >
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", paymentMethod === id ? "bg-purple-500/20" : "bg-white/5")}>
                      <Icon className={cn("w-5 h-5", paymentMethod === id ? "text-purple-400" : "text-white/40")} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-white text-sm">{label}</p>
                      <p className="text-xs text-white/40">{desc}</p>
                    </div>
                    <div className={cn("w-4 h-4 rounded-full border-2 shrink-0", paymentMethod === id ? "border-purple-400 bg-purple-400" : "border-white/20")} />
                  </button>
                ))}
              </div>
            </div>

            {/* UPI field */}
            {paymentMethod === "upi" && (
              <div className="glass-card p-5">
                <label className="block text-sm text-white/60 mb-2">UPI ID</label>
                <Input 
                  placeholder="yourname@upi" 
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !isProcessing && handlePay()}
                />
                <p className="text-xs text-white/30 mt-2">We&apos;ll send a payment request to your UPI app</p>
              </div>
            )}

            {/* Cash in Hand info banner */}
            {paymentMethod === "cash_in_hand" && (
              <div className="glass-card p-5 border border-emerald-500/25 bg-emerald-500/5">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <Banknote className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-medium text-emerald-300 text-sm">Pay at the Salon</p>
                    <p className="text-xs text-emerald-400/70 mt-1 leading-relaxed">
                      No online payment needed right now. Simply show your <strong>QR code</strong> to the salon staff when you arrive, and pay in cash on the spot. Your booking is instantly confirmed!
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-xs text-emerald-400/60">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Booking confirmed immediately</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-emerald-400/60">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>QR code sent to your notifications</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Summary */}
          <div className="md:col-span-2">
            <div className="glass-dark rounded-2xl border border-purple-500/20 p-5 sticky top-24">
              <h2 className="font-semibold text-white mb-4">Order Summary</h2>

              <div className="space-y-3 mb-5">
                {[
                  { icon: Building2, label: "Salon", value: salonName },
                  { icon: Scissors, label: "Service", value: serviceName },
                  { icon: User, label: "Stylist", value: staffName },
                  { icon: Calendar, label: "Date", value: date ? new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "" },
                  { icon: Clock, label: "Time", value: time },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-2.5 text-sm">
                    <Icon className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span className="text-white/40 w-16 shrink-0">{label}</span>
                    <span className="text-white/80 font-medium truncate">{value}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/10 pt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/50">Service price</span>
                  <span className="text-white">{formatPrice(price)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Promo discount</span>
                    <span>-{formatPrice(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-white/50">GST (5%)</span>
                  <span className="text-white">{formatPrice(taxes)}</span>
                </div>
                <div className="border-t border-white/10 pt-2 flex justify-between font-semibold text-base">
                  <span className="text-white">Total</span>
                  <span className="gradient-text text-xl">{formatPrice(total)}</span>
                </div>
              </div>

              <Button
                onClick={handlePay}
                disabled={isProcessing}
                className={cn(
                  "w-full h-12 mt-5 text-base font-semibold gap-2",
                  isCash && "bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 shadow-emerald-500/20"
                )}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Confirming…
                  </>
                ) : isCash ? (
                  <>
                    <Banknote className="w-5 h-5" />
                    Confirm Booking (Pay at Salon)
                  </>
                ) : (
                  <>
                    Pay {formatPrice(total)}
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </Button>

              <p className="text-xs text-white/25 text-center mt-3">
                🔒 Secured by 256-bit SSL encryption
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
