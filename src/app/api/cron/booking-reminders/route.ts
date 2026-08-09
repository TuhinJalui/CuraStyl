import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Parse "10:30 AM" / "14:00" style time strings into { hours, minutes } */
function parseTime(timeStr: string): { hours: number; minutes: number } {
  const ampm = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampm) {
    let h = parseInt(ampm[1]);
    const m = parseInt(ampm[2]);
    const period = ampm[3].toUpperCase();
    if (period === "AM" && h === 12) h = 0;
    if (period === "PM" && h !== 12) h += 12;
    return { hours: h, minutes: m };
  }
  const parts = timeStr.split(":");
  return { hours: parseInt(parts[0]), minutes: parseInt(parts[1] ?? "0") };
}

/** Build a Date from booking_date (YYYY-MM-DD) + time_slot string */
function buildAppointmentDate(dateStr: string, timeStr: string): Date {
  const { hours, minutes } = parseTime(timeStr);
  const d = new Date(`${dateStr}T00:00:00`);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

// ─── Route ────────────────────────────────────────────────────────────────────

/**
 * GET /api/cron/booking-reminders
 *
 * Call every 15–30 min via Vercel Cron, GitHub Actions, or any scheduler.
 *
 * Handles TWO notification types:
 *   1. REMINDER  – sent 1.5 – 3.25 hours before appointment (once per booking).
 *   2. NO-SHOW   – sent 45 min after slot if QR was never scanned (once per booking).
 *
 * Uses `reminder_sent` and `noshow_sent` boolean columns on bookings
 * to prevent duplicate notifications (reliable DB-level dedup).
 *
 * Protect with: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(req: NextRequest) {
  // ── Secret guard ──────────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // ── Supabase (service role for unrestricted access) ────────────────────────
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const now = new Date();
  const stats = { reminders: 0, noShows: 0, errors: 0 };

  // ── Fetch confirmed, unverified bookings within a 5-day rolling window ────
  const windowStart = new Date(now);
  windowStart.setDate(windowStart.getDate() - 1); // 1 day ago (for no-shows)

  const windowEnd = new Date(now);
  windowEnd.setDate(windowEnd.getDate() + 4); // 4 days ahead (for reminders)

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(`
      id,
      booking_id,
      user_id,
      booking_date,
      time_slot,
      status,
      qr_verified,
      reminder_sent,
      noshow_sent,
      salon:salons(name, owner_id),
      service:services(name),
      staff:staff(name)
    `)
    .eq("status", "confirmed")
    .eq("qr_verified", false)
    .gte("booking_date", windowStart.toISOString().split("T")[0])
    .lte("booking_date", windowEnd.toISOString().split("T")[0]);

  if (error) {
    console.error("Cron: failed to fetch bookings", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  for (const booking of bookings ?? []) {
    try {
      const salon = booking.salon as any;
      const service = booking.service as any;
      const staff = booking.staff as any;
      const salonName = salon?.name ?? "the salon";
      const serviceName = service?.name ?? "your service";
      const staffName = staff?.name ? ` with ${staff.name}` : "";

      const apptDate = buildAppointmentDate(booking.booking_date, booking.time_slot);
      const diffMs = apptDate.getTime() - now.getTime();
      const diffMins = diffMs / 60000;

      const bookingDateFmt = new Date(booking.booking_date + "T00:00:00").toLocaleDateString("en-IN", {
        weekday: "short", day: "numeric", month: "short",
      });

      // ── 1. REMINDER: appointment is 90–195 minutes away (1.5 – 3.25 hrs) ──
      // Use reminder_sent DB flag to prevent duplicates (reliable)
      if (diffMins >= 90 && diffMins <= 195 && !booking.reminder_sent) {
        const hoursAway = Math.round(diffMins / 60);

        await supabase.from("notifications").insert({
          user_id: booking.user_id,
          type: "booking_reminder",
          title: `⏰ Salon appointment in ~${hoursAway} hour${hoursAway !== 1 ? "s" : ""}!`,
          message: `Don't forget! You have ${serviceName} at ${salonName} today at ${booking.time_slot}${staffName}. Show your QR code at reception. (Booking: ${booking.booking_id})`,
          link: "/dashboard/bookings",
          is_read: false,
        });

        // Mark as sent in DB
        await supabase
          .from("bookings")
          .update({ reminder_sent: true })
          .eq("id", booking.id);

        stats.reminders++;
      }

      // ── 2. NO-SHOW: appointment was >45 min ago and QR still unscanned ────
      // Use noshow_sent DB flag to prevent duplicates
      if (diffMins < -45 && !booking.noshow_sent) {
        // Notify user
        await supabase.from("notifications").insert({
          user_id: booking.user_id,
          type: "no_show_warning",
          title: "😔 You missed your salon appointment",
          message: `It looks like you didn't make it to ${salonName} for ${serviceName} at ${booking.time_slot} on ${bookingDateFmt}. Your QR code was not scanned. Please contact the salon if this is a mistake. (Booking: ${booking.booking_id})`,
          link: "/dashboard/bookings",
          is_read: false,
        });

        // Notify salon owner too
        if (salon?.owner_id) {
          await supabase.from("notifications").insert({
            user_id: salon.owner_id,
            type: "no_show_warning",
            title: `⚠️ No-Show: Booking ${booking.booking_id}`,
            message: `A customer did not arrive for ${serviceName} at ${booking.time_slot} on ${bookingDateFmt}. The booking has been marked as cancelled (no-show).`,
            link: "/salon-owner/dashboard",
            is_read: false,
          });
        }

        // Mark as no-show in DB and cancel the booking
        await supabase
          .from("bookings")
          .update({
            status: "cancelled",
            cancellation_reason: "No-show: customer did not arrive",
            noshow_sent: true,
          })
          .eq("id", booking.id);

        stats.noShows++;
      }
    } catch (e) {
      console.error(`Cron: error processing booking ${booking.id}`, e);
      stats.errors++;
    }
  }

  return NextResponse.json({
    success: true,
    processed: bookings?.length ?? 0,
    ...stats,
    timestamp: now.toISOString(),
  });
}
