import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}

// POST /api/bookings/[id]/verify-qr
// Called by the salon owner's dashboard when they scan a customer QR code.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await getSupabase();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  // Fetch the booking with salon + service + user + staff info
  const { data: booking, error: fetchErr } = await supabase
    .from("bookings")
    .select(`
      id,
      booking_id,
      user_id,
      salon_id,
      status,
      qr_verified,
      time_slot,
      booking_date,
      payment_method,
      final_amount,
      salon:salons(id, name, owner_id),
      service:services(name),
      staff:staff(name)
    `)
    .eq("id", id)
    .single();

  if (fetchErr || !booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  // Verify the caller is the salon owner
  const salon = booking.salon as any;
  if (salon?.owner_id !== user.id) {
    return NextResponse.json({ error: "Only the salon owner can verify QR codes" }, { status: 403 });
  }

  // Already verified
  if (booking.qr_verified) {
    return NextResponse.json({ message: "Already verified", booking });
  }

  // Update booking: mark verified + set status to completed
  const { data: updated, error: updateErr } = await supabase
    .from("bookings")
    .update({
      qr_verified: true,
      qr_scanned_at: new Date().toISOString(),
      status: "completed",
      payment_status: booking.payment_method === "cash_in_hand" ? "paid" : undefined,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // ── Notifications ──────────────────────────────────────────────────────────
  const service = booking.service as any;
  const staff = booking.staff as any;
  const salonName = salon?.name ?? "the salon";
  const serviceName = service?.name ?? "your service";
  const staffName = staff?.name ?? "staff";

  // Get customer name for the owner notification
  const { data: customerProfile } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", booking.user_id)
    .single();

  const customerName = customerProfile?.full_name ?? "Customer";
  const customerPhone = customerProfile?.phone ? ` | 📞 ${customerProfile.phone}` : "";

  const bookingDateFmt = new Date(booking.booking_date + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short",
  });

  const paymentLabel = booking.payment_method === "cash_in_hand"
    ? "Cash in Hand 💵 (Collected)"
    : booking.payment_method === "upi" ? "UPI (Paid Online)"
    : "Paid Online";

  // 1️⃣ Notify CUSTOMER — checked in successfully
  const pointsEarned = Math.floor((booking.final_amount ?? 0) / 100) * 10;
  const cashPointsMsg = booking.payment_method === "cash_in_hand" && pointsEarned > 0
    ? ` You earned ${pointsEarned} GlamPoints! 🌟`
    : "";

  await supabase.from("notifications").insert({
    user_id: booking.user_id,
    type: "qr_verified",
    title: "✅ Checked In Successfully!",
    message: `The salon owner at ${salonName} has verified your arrival for ${serviceName}. Enjoy your session! 🎉${cashPointsMsg} (Booking: ${booking.booking_id})`,
    link: "/dashboard/bookings",
    is_read: false,
  });

  // 2️⃣ Notify SALON OWNER — customer arrived
  await supabase.from("notifications").insert({
    user_id: user.id,
    type: "customer_arrived",
    title: `✅ Customer Arrived: ${customerName}`,
    message: `${customerName}${customerPhone} has been checked in for ${serviceName} on ${bookingDateFmt} at ${booking.time_slot}${staff?.name ? ` with ${staffName}` : ""}. Amount: ₹${booking.final_amount ?? 0} (${paymentLabel}). Booking: ${booking.booking_id}`,
    link: "/salon-owner/dashboard",
    is_read: false,
  });

  // 3️⃣ Award GlamPoints for cash payment bookings (since they pay at salon, points awarded on verification)
  if (booking.payment_method === "cash_in_hand" && pointsEarned > 0) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const serviceSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      await serviceSupabase.rpc("award_glam_points", {
        p_user_id: booking.user_id,
        p_points: pointsEarned,
        p_type: "earned",
        p_description: `Earned ${pointsEarned} pts for ${serviceName} at ${salonName} (Cash payment verified)`,
        p_booking_id: booking.booking_id,
      });
    } catch (pointsErr) {
      console.warn("GlamPoints award (cash) failed (non-fatal):", pointsErr);
    }
  }

  return NextResponse.json({
    success: true,
    message: "QR verified — customer and owner notified",
    pointsAwarded: booking.payment_method === "cash_in_hand" ? pointsEarned : 0,
    booking: updated,
  });
}
