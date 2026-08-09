"use client";

import { useEffect, useRef, useState } from "react";
import {
  Download, X, CheckCircle2, MapPin, Phone,
  Calendar, Clock, User, Scissors, CreditCard, Sparkles, QrCode, Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice, cn } from "@/lib/utils";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

import toast from "react-hot-toast";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface ReceiptBooking {
  id: string;
  booking_id: string;
  booking_date: string;
  time_slot: string;
  status: string;
  payment_status: string;
  payment_method?: string;
  total_amount: number;
  discount_amount: number;
  final_amount: number;
  coupon_code?: string | null;
  created_at: string;
  glam_points_earned?: number;
  // user info (from enriched API)
  user_name?: string;
  user_email?: string;
  user_phone?: string;
  salon: {
    name: string;
    address?: string;
    area?: string;
    city?: string;
    phone?: string;
    cover_image?: string;
    slug?: string;
  } | null;
  service: {
    name: string;
    category?: string;
    duration?: number;
  } | null;
  staff?: { name: string; role?: string } | null;
}

interface ReceiptProps {
  booking: ReceiptBooking;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// QR Code renderer — pure SVG, no external library
// Uses the free qrserver.com API (read-only image, no key needed)
// ---------------------------------------------------------------------------
export function QRImage({
  data,
  size = 160,
  className,
}: {
  data: string;
  size?: number;
  className?: string;
}) {
  const [src, setSrc] = useState<string>("");

  useEffect(() => {
    if (!data) return;
    const encoded = encodeURIComponent(data);
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&ecc=M&format=png&color=7c3aed&bgcolor=ffffff`;

    let active = true;
    fetch(url)
      .then((res) => res.blob())
      .then((blob) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (active) {
            setSrc(reader.result as string);
          }
        };
        reader.readAsDataURL(blob);
      })
      .catch((err) => {
        console.error("Failed to load QR code as base64:", err);
        if (active) {
          setSrc(url); // fallback
        }
      });

    return () => {
      active = false;
    };
  }, [data, size]);

  if (!src) {
    return (
      <div
        style={{ width: size, height: size }}
        className={cn(
          "rounded-xl border-4 border-purple-200 bg-purple-50 flex items-center justify-center animate-pulse mx-auto",
          className
        )}
      >
        <QrCode className="w-8 h-8 text-purple-300 animate-spin" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt="Booking QR Code"
      width={size}
      height={size}
      className={cn(
        "rounded-xl border-4 border-purple-500 shadow-lg shadow-purple-500/20 mx-auto",
        className
      )}
    />
  );
}

// ---------------------------------------------------------------------------
// Receipt Modal
// ---------------------------------------------------------------------------
export default function BookingReceiptModal({ booking, onClose }: ReceiptProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const bookingDateFmt = new Date(booking.booking_date + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const createdFmt = new Date(booking.created_at).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  const pointsEarned = booking.glam_points_earned ?? Math.floor((booking.final_amount ?? 0) / 100) * 10;

  const qrPayload = JSON.stringify({
    bookingId: booking.booking_id,
    salonId: booking.salon?.name ?? "",
    service: booking.service?.name ?? "",
    date: booking.booking_date,
    time: booking.time_slot,
    amount: booking.final_amount,
    paymentStatus: booking.payment_status,
  });

  // ── Download as PDF file ──────────────────────────────────
  const handleDownload = async () => {
    if (!printRef.current) return;
    setDownloading(true);
    try {
      // Find the loaded base64 QR code image to pass into the print HTML
      const qrImg = printRef.current.querySelector('img[alt="Booking QR Code"]') as HTMLImageElement;
      const qrUrl = qrImg ? qrImg.src : "";

      const htmlContent = buildPrintHTML({
        booking,
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

      // Wait for image loading inside the iframe
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
        scale: 2.5, // High resolution
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
      });

      // Clean up the iframe
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
      pdf.save(`CuraStyl-Receipt-${booking.booking_id}.pdf`);
      toast.success("Receipt downloaded as PDF!");
    } catch (err: any) {
      console.error("PDF generation failed:", err);
      toast.error("Failed to generate PDF receipt. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-lg max-h-[95vh] overflow-y-auto rounded-3xl bg-white shadow-2xl shadow-purple-900/50">

        {/* ── Floating Action Buttons ── */}
        <div className="sticky top-3 right-3 z-10 flex justify-end gap-2 px-4 pt-3">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="p-2.5 rounded-xl bg-white/90 border border-gray-200 shadow-sm hover:bg-purple-50 transition-colors disabled:opacity-50"
            title="Download Receipt"
          >
            <Download className="w-4 h-4 text-purple-600" />
          </button>
          <button
            onClick={onClose}
            className="p-2.5 rounded-xl bg-white/90 border border-gray-200 shadow-sm hover:bg-red-50 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* ── Printable Receipt Body ── */}
        <div ref={printRef} className="px-6 pb-8">

          {/* Header */}
          <div className="text-center pt-2 pb-6 border-b-2 border-purple-100">
            {/* Logo / Brand */}
            <div className="inline-flex items-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center shadow-md">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-black bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
                CuraStyl
              </span>
            </div>
            <p className="text-gray-500 text-xs">Premium Beauty &amp; Salon Booking Platform</p>
            <p className="text-gray-400 text-[11px]">www.curastyl.in</p>
          </div>

          {/* Status Banner */}
          <div className="flex justify-center py-5">
            <div className={cn(
              "inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm shadow-sm border-2",
              booking.status === "confirmed" || booking.status === "completed"
                ? "bg-emerald-50 border-emerald-400 text-emerald-700"
                : booking.status === "cancelled"
                ? "bg-red-50 border-red-400 text-red-700"
                : "bg-amber-50 border-amber-400 text-amber-700"
            )}>
              <CheckCircle2 className="w-5 h-5" />
              {booking.status === "confirmed"
                ? "BOOKING CONFIRMED"
                : booking.status === "completed"
                ? "APPOINTMENT COMPLETED"
                : booking.status === "cancelled"
                ? "BOOKING CANCELLED"
                : "BOOKING PENDING"}
            </div>
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center mb-6 gap-2">
            <QRImage data={qrPayload} size={160} />
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <QrCode className="w-3.5 h-3.5" />
              Show this QR at the salon for verification
            </p>
          </div>

          {/* Booking ID + Transaction */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-5 mb-4 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Booking ID</p>
            <p className="text-2xl font-black font-mono text-purple-700 tracking-wider">{booking.booking_id}</p>
            <div className="flex justify-center gap-6 mt-3 text-xs text-gray-500">
              <div>
                <span className="block text-gray-400">Payment Status</span>
                <span className={cn("font-semibold", booking.payment_status === "paid" ? "text-emerald-600" : "text-amber-600")}>
                  {booking.payment_status?.toUpperCase()}
                </span>
              </div>
              <div>
                <span className="block text-gray-400">Method</span>
                <span className="font-semibold text-gray-700 uppercase">
                  {booking.payment_method ?? "UPI"}
                </span>
              </div>
              <div>
                <span className="block text-gray-400">Booked On</span>
                <span className="font-semibold text-gray-700">{createdFmt}</span>
              </div>
            </div>
          </div>

          {/* Appointment Details */}
          <Section icon={<Calendar className="w-4 h-4 text-purple-500" />} title="Appointment Details">
            <Row label="Date" value={bookingDateFmt} />
            <Row label="Time" value={booking.time_slot} />
            {booking.service && (
              <>
                <Row label="Service" value={booking.service.name} />
                {booking.service.category && <Row label="Category" value={booking.service.category} />}
                {booking.service.duration && <Row label="Duration" value={`${booking.service.duration} min`} />}
              </>
            )}
            {booking.staff && (
              <Row
                label="Stylist"
                value={`${booking.staff.name}${booking.staff.role ? ` (${booking.staff.role})` : ""}`}
              />
            )}
          </Section>

          {/* Salon Details */}
          {booking.salon && (
            <Section icon={<MapPin className="w-4 h-4 text-pink-500" />} title="Salon">
              <p className="font-bold text-gray-800 text-base mb-1">{booking.salon.name}</p>
              {booking.salon.address && (
                <p className="text-sm text-gray-500">{booking.salon.address}</p>
              )}
              {(booking.salon.area || booking.salon.city) && (
                <p className="text-sm text-gray-500">
                  {[booking.salon.area, booking.salon.city].filter(Boolean).join(", ")}
                </p>
              )}
              {booking.salon.phone && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Phone className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-sm text-gray-600">{booking.salon.phone}</span>
                </div>
              )}
            </Section>
          )}

          {/* Customer Details */}
          {(booking.user_name || booking.user_email) && (
            <Section icon={<User className="w-4 h-4 text-blue-500" />} title="Customer">
              {booking.user_name && <Row label="Name" value={booking.user_name} />}
              {booking.user_email && <Row label="Email" value={booking.user_email} />}
              {booking.user_phone && <Row label="Phone" value={booking.user_phone} />}
            </Section>
          )}

          {/* Payment Breakdown */}
          <Section icon={<CreditCard className="w-4 h-4 text-emerald-500" />} title="Payment Summary">
            <Row label="Service Amount" value={formatPrice(booking.total_amount)} />
            {booking.discount_amount > 0 && (
              <Row
                label={`Discount${booking.coupon_code ? ` (${booking.coupon_code})` : ""}`}
                value={`- ${formatPrice(booking.discount_amount)}`}
                valueClass="text-emerald-600"
              />
            )}
            <div className="border-t border-gray-200 my-2" />
            <div className="flex justify-between items-center">
              <span className="font-bold text-gray-800">Total Paid</span>
              <span className="text-xl font-black text-purple-700">{formatPrice(booking.final_amount)}</span>
            </div>
          </Section>

          {/* Glam Points */}
          {pointsEarned > 0 && (
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-2xl p-4 mb-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shrink-0 shadow-md shadow-amber-200">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-amber-600 uppercase font-semibold tracking-wider mb-0.5">Glam Points Earned</p>
                <p className="text-2xl font-black text-amber-700">+{pointsEarned} pts</p>
                <p className="text-xs text-amber-500">Use points on your next booking!</p>
              </div>
            </div>
          )}

          {/* Terms */}
          <div className="bg-gray-50 rounded-xl p-4 mb-4 text-xs text-gray-400 space-y-1">
            <p className="font-semibold text-gray-500 mb-2">Terms &amp; Conditions</p>
            <p>• Please arrive 10 minutes before your appointment</p>
            <p>• Cancellations allowed up to 6 hours before appointment time</p>
            <p>• Show this receipt or QR code at the salon for verification</p>
            <p>• For queries: support@curastyl.in | 1800-000-GLAM</p>
          </div>

          {/* Footer */}
          <div className="text-center text-gray-400 text-xs pt-2 border-t border-gray-100">
            <p className="font-medium text-gray-500">Thank you for choosing CuraStyl! ✨</p>
            <p className="mt-0.5">Your beauty journey starts here</p>
            <p className="mt-2 text-[10px]">Generated on {new Date().toLocaleString("en-IN")}</p>
          </div>

        </div>

        {/* Bottom Actions */}
        <div className="flex gap-3 px-6 pb-6 pt-2 border-t border-gray-100">
          <Button
            onClick={handleDownload}
            disabled={downloading}
            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg shadow-purple-500/20 gap-2"
          >
            <Download className="w-4 h-4" />
            {downloading ? "Preparing PDF…" : "Download Receipt (PDF)"}
          </Button>
        </div>

      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper UI sub-components
// ---------------------------------------------------------------------------
function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
        {icon}
        <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">{title}</span>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Row({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className={cn("font-semibold text-gray-800 text-right max-w-[60%]", valueClass)}>{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Self-contained print/download HTML
// ---------------------------------------------------------------------------
export function buildPrintHTML({
  booking,
  bookingDateFmt,
  createdFmt,
  pointsEarned,
  qrUrl,
}: {
  booking: ReceiptBooking;
  bookingDateFmt: string;
  createdFmt: string;
  pointsEarned: number;
  qrUrl: string;
}): string {
  const statusColor = booking.status === "confirmed" || booking.status === "completed"
    ? "#10b981" : booking.status === "cancelled" ? "#ef4444" : "#f59e0b";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>CuraStyl Receipt – ${booking.booking_id}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',Arial,sans-serif;background:#f5f3ff;min-height:100vh;display:flex;justify-content:center;padding:32px 16px}
    .receipt{background:white;max-width:480px;width:100%;border-radius:24px;box-shadow:0 20px 60px rgba(124,58,237,.15);overflow:hidden}
    .header{background:linear-gradient(135deg,#7c3aed,#db2777);color:white;padding:28px 24px;text-align:center}
    .logo{font-size:28px;font-weight:900;letter-spacing:-1px;margin-bottom:2px}
    .logo span{opacity:.85;font-weight:400;font-size:13px;display:block;margin-top:2px}
    .status-pill{display:inline-flex;align-items:center;gap:6px;margin:20px auto;padding:10px 24px;border-radius:50px;border:2px solid ${statusColor};color:${statusColor};background:${statusColor}10;font-weight:700;font-size:13px}
    .qr-wrap{text-align:center;padding:8px 0 16px}
    .qr-wrap img{border:4px solid #7c3aed;border-radius:16px;box-shadow:0 8px 24px rgba(124,58,237,.2)}
    .qr-hint{font-size:11px;color:#9ca3af;margin-top:8px}
    .id-box{background:linear-gradient(135deg,#f5f3ff,#fdf2f8);border-radius:16px;padding:20px;margin:0 16px 16px;text-align:center}
    .id-label{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#9ca3af;margin-bottom:4px}
    .id-value{font-size:26px;font-weight:900;font-family:monospace;color:#7c3aed;letter-spacing:.05em}
    .meta-grid{display:flex;justify-content:space-between;margin-top:12px;padding:0 8px}
    .meta-item{text-align:center;font-size:11px}
    .meta-item .mk{color:#9ca3af;display:block;margin-bottom:2px}
    .meta-item .mv{font-weight:700;color:#374151}
    .section{margin:0 16px 12px;border:1px solid #f3f4f6;border-radius:16px;overflow:hidden}
    .section-header{display:flex;align-items:center;gap:8px;padding:10px 14px;background:#f9fafb;border-bottom:1px solid #f3f4f6;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#6b7280}
    .section-body{padding:12px 14px;space-y:6px}
    .row{display:flex;justify-content:space-between;font-size:13px;padding:4px 0;border-bottom:1px solid #f9fafb}
    .row:last-child{border-bottom:none}
    .row .lbl{color:#9ca3af}
    .row .val{font-weight:600;color:#1f2937;text-align:right;max-width:60%}
    .total-row{display:flex;justify-content:space-between;align-items:center;margin-top:8px;padding-top:8px;border-top:2px solid #f3f4f6}
    .total-row .tl{font-weight:700;color:#1f2937;font-size:15px}
    .total-row .tv{font-size:22px;font-weight:900;color:#7c3aed}
    .points-box{margin:0 16px 12px;background:linear-gradient(135deg,#fef3c7,#fef9c3);border:2px solid #fcd34d;border-radius:16px;padding:16px;display:flex;align-items:center;gap:12px}
    .points-icon{width:44px;height:44px;background:linear-gradient(135deg,#f59e0b,#eab308);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0}
    .pts-label{font-size:10px;text-transform:uppercase;font-weight:700;color:#92400e;letter-spacing:.08em}
    .pts-value{font-size:26px;font-weight:900;color:#78350f}
    .pts-sub{font-size:11px;color:#b45309}
    .terms{margin:0 16px 16px;background:#f9fafb;border-radius:12px;padding:12px 14px;font-size:11px;color:#9ca3af;line-height:1.6}
    .terms strong{display:block;color:#6b7280;margin-bottom:4px}
    .footer{text-align:center;padding:16px 24px;border-top:1px solid #f3f4f6;font-size:12px;color:#9ca3af}
    .footer strong{display:block;color:#6b7280;font-size:13px}
    @media print{body{background:white;padding:0}body *{visibility:visible}.receipt{box-shadow:none;border-radius:0;max-width:100%}}
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <div class="logo">✨ CuraStyl<span>Premium Beauty &amp; Salon Platform</span></div>
    </div>

    <div style="padding:0 16px">
      <div class="status-pill">✓ ${booking.status === "confirmed" ? "BOOKING CONFIRMED" : booking.status === "completed" ? "APPOINTMENT COMPLETED" : booking.status.toUpperCase()}</div>
    </div>

    <div class="qr-wrap">
      <img src="${qrUrl}" width="160" height="160" alt="QR Code"/>
      <div class="qr-hint">📱 Show this QR at the salon for verification</div>
    </div>

    <div class="id-box">
      <div class="id-label">Booking ID</div>
      <div class="id-value">${booking.booking_id}</div>
      <div class="meta-grid">
        <div class="meta-item"><span class="mk">Payment</span><span class="mv" style="color:${booking.payment_status === "paid" ? "#10b981" : "#f59e0b"}">${(booking.payment_status ?? "pending").toUpperCase()}</span></div>
        <div class="meta-item"><span class="mk">Method</span><span class="mv">${(booking.payment_method ?? "UPI").toUpperCase()}</span></div>
        <div class="meta-item"><span class="mk">Booked</span><span class="mv">${createdFmt}</span></div>
      </div>
    </div>

    <div class="section">
      <div class="section-header">📅 Appointment Details</div>
      <div class="section-body">
        <div class="row"><span class="lbl">Date</span><span class="val">${bookingDateFmt}</span></div>
        <div class="row"><span class="lbl">Time</span><span class="val">${booking.time_slot}</span></div>
        ${booking.service ? `<div class="row"><span class="lbl">Service</span><span class="val">${booking.service.name}</span></div>` : ""}
        ${booking.service?.duration ? `<div class="row"><span class="lbl">Duration</span><span class="val">${booking.service.duration} min</span></div>` : ""}
        ${booking.staff ? `<div class="row"><span class="lbl">Stylist</span><span class="val">${booking.staff.name}${booking.staff.role ? ` (${booking.staff.role})` : ""}</span></div>` : ""}
      </div>
    </div>

    ${booking.salon ? `
    <div class="section">
      <div class="section-header">📍 Salon</div>
      <div class="section-body">
        <div style="font-weight:700;color:#1f2937;font-size:15px;padding-bottom:8px">${booking.salon.name}</div>
        ${booking.salon.address ? `<div class="row"><span class="lbl">Address</span><span class="val">${booking.salon.address}</span></div>` : ""}
        ${booking.salon.area || booking.salon.city ? `<div class="row"><span class="lbl">Location</span><span class="val">${[booking.salon.area, booking.salon.city].filter(Boolean).join(", ")}</span></div>` : ""}
        ${booking.salon.phone ? `<div class="row"><span class="lbl">Phone</span><span class="val">${booking.salon.phone}</span></div>` : ""}
      </div>
    </div>` : ""}

    ${booking.user_name || booking.user_email ? `
    <div class="section">
      <div class="section-header">👤 Customer</div>
      <div class="section-body">
        ${booking.user_name ? `<div class="row"><span class="lbl">Name</span><span class="val">${booking.user_name}</span></div>` : ""}
        ${booking.user_email ? `<div class="row"><span class="lbl">Email</span><span class="val">${booking.user_email}</span></div>` : ""}
        ${booking.user_phone ? `<div class="row"><span class="lbl">Phone</span><span class="val">${booking.user_phone}</span></div>` : ""}
      </div>
    </div>` : ""}

    <div class="section">
      <div class="section-header">💳 Payment Summary</div>
      <div class="section-body">
        <div class="row"><span class="lbl">Service Amount</span><span class="val">₹${booking.total_amount.toLocaleString("en-IN")}</span></div>
        ${booking.discount_amount > 0 ? `<div class="row"><span class="lbl">Discount${booking.coupon_code ? ` (${booking.coupon_code})` : ""}</span><span class="val" style="color:#10b981">- ₹${booking.discount_amount.toLocaleString("en-IN")}</span></div>` : ""}
        <div class="total-row"><span class="tl">Total Paid</span><span class="tv">₹${booking.final_amount.toLocaleString("en-IN")}</span></div>
      </div>
    </div>

    ${pointsEarned > 0 ? `
    <div class="points-box">
      <div class="points-icon">✨</div>
      <div>
        <div class="pts-label">Glam Points Earned</div>
        <div class="pts-value">+${pointsEarned} pts</div>
        <div class="pts-sub">Redeem on your next booking!</div>
      </div>
    </div>` : ""}

    <div class="terms">
      <strong>Terms &amp; Conditions</strong>
      • Arrive 10 min early • Cancellations up to 6 hrs before • Show QR at salon<br/>
      • Queries: support@curastyl.in
    </div>

    <div class="footer">
      <strong>Thank you for choosing CuraStyl! ✨</strong>
      Your beauty journey starts here · Generated ${new Date().toLocaleString("en-IN")}
    </div>
  </div>
</body>
</html>`;
}
