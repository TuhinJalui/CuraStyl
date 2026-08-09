import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { generateBookingId } from "@/lib/utils";

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

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

export async function POST(req: NextRequest) {
  try {
    const supabase = await getSupabase();

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await req.json();
    const { salonId, serviceId, staffId, date, timeSlot, couponCode, paymentMethod, paymentStatus, paymentId } = body;

    // Validate required fields
    if (!salonId || !serviceId || !date || !timeSlot) {
      return NextResponse.json(
        { error: "Missing required booking fields" },
        { status: 400 }
      );
    }

    // Prevent past bookings
    const bookingDate = new Date(`${date}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (bookingDate < today) {
      return NextResponse.json(
        { error: "Cannot book a date in the past" },
        { status: 400 }
      );
    }

    // Get service details for pricing
    const { data: service } = await supabase
      .from("services")
      .select("id, price, name, salon_id")
      .eq("id", serviceId)
      .single();

    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    if (service.salon_id !== salonId) {
      return NextResponse.json({ error: "Service does not belong to this salon" }, { status: 400 });
    }

    // Check slot availability
    const { data: existingBookings } = await supabase
      .from("bookings")
      .select("id")
      .eq("salon_id", salonId)
      .eq("booking_date", date)
      .eq("time_slot", timeSlot)
      .neq("status", "cancelled");

    if (existingBookings && existingBookings.length > 0) {
      // If staff is specified, check staff-specific availability
      if (staffId) {
        const conflicting = await supabase
          .from("bookings")
          .select("id")
          .eq("salon_id", salonId)
          .eq("booking_date", date)
          .eq("time_slot", timeSlot)
          .eq("staff_id", staffId)
          .neq("status", "cancelled");

        if (conflicting.data && conflicting.data.length > 0) {
          return NextResponse.json(
            { error: "This time slot is no longer available for the selected stylist." },
            { status: 409 }
          );
        }
      }
    }

    // Calculate pricing
    let totalAmount = service.price;
    let discountAmount = 0;

    // Apply coupon if provided
    if (couponCode) {
      const { data: coupon } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", couponCode.toUpperCase())
        .eq("is_active", true)
        .single();

      if (coupon) {
        const now = new Date();
        const validFrom = new Date(coupon.valid_from);
        const validUntil = new Date(coupon.valid_until);

        if (now >= validFrom && now <= validUntil) {
          if (!coupon.usage_limit || coupon.used_count < coupon.usage_limit) {
            if (totalAmount >= (coupon.min_order_amount ?? 0)) {
              if (coupon.discount_type === "percentage") {
                discountAmount = Math.round((totalAmount * coupon.discount_value) / 100);
                if (coupon.max_discount_amount) {
                  discountAmount = Math.min(discountAmount, coupon.max_discount_amount);
                }
              } else {
                discountAmount = Math.min(coupon.discount_value, totalAmount);
              }

              // Increment coupon usage
              await supabase
                .from("coupons")
                .update({ used_count: (coupon.used_count ?? 0) + 1 })
                .eq("id", coupon.id);
            }
          }
        }
      }
    }

    const finalAmount = totalAmount - discountAmount;
    const bookingId = generateBookingId();

    // Create booking
    const { data: booking, error } = await supabase
      .from("bookings")
      .insert({
        booking_id: bookingId,
        user_id: user.id,
        salon_id: salonId,
        service_id: serviceId,
        staff_id: staffId ?? null,
        booking_date: date,
        time_slot: timeSlot,
        status: "confirmed",
        total_amount: totalAmount,
        discount_amount: discountAmount,
        final_amount: finalAmount,
        coupon_code: couponCode?.toUpperCase() ?? null,
        payment_status: paymentStatus ?? "pending",
        payment_method: paymentMethod ?? "upi",
        payment_id: paymentId ?? null,
      })
      .select("*")
      .single();

    if (error) {
      console.error("Booking insert error:", error);
      return NextResponse.json({ error: "Failed to create booking. " + error.message }, { status: 500 });
    }

    // Fetch salon info for notifications and glam points
    const { data: salonInfo } = await supabase
      .from("salons")
      .select("name, owner_id")
      .eq("id", salonId)
      .single();
    const salonName = salonInfo?.name ?? "the salon";

    // ── Auto-send booking confirmation notification ───────────────────────
    try {
      // Get staff name if selected
      let staffName = "Any available";
      if (staffId) {
        const { data: staffInfo } = await supabase
          .from("staff")
          .select("name")
          .eq("id", staffId)
          .single();
        if (staffInfo) staffName = staffInfo.name;
      }

      // Get user profile name
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", user.id)
        .single();

      const bookingDateFmt = new Date(date + "T00:00:00").toLocaleDateString("en-IN", {
        weekday: "long", day: "numeric", month: "long",
      });

      const paymentLabel = paymentMethod === "cash_in_hand"
        ? "Cash in Hand"
        : paymentMethod === "upi" ? "UPI"
        : paymentMethod ?? "Online";

      // 1️⃣ Notify CUSTOMER — booking confirmed
      await supabase.from("notifications").insert({
        user_id: user.id,
        type: "booking_confirmed",
        title: "Booking Confirmed! 🎉",
        message: `Your appointment at ${salonName} for ${service.name} on ${bookingDateFmt} at ${timeSlot} with ${staffName} is confirmed. Payment: ${paymentLabel}. Show your QR code when you arrive. (ID: ${bookingId})`,
        link: "/dashboard/bookings",
        is_read: false,
      });

      // 2️⃣ Notify SALON OWNER — new booking alert
      if (salonInfo?.owner_id) {
        const customerName = userProfile?.full_name ?? user.email ?? "A customer";
        const customerPhone = userProfile?.phone ? ` | 📞 ${userProfile.phone}` : "";
        await supabase.from("notifications").insert({
          user_id: salonInfo.owner_id,
          type: "new_booking",
          title: `📅 New Booking! ${customerName}`,
          message: `${customerName}${customerPhone} booked ${service.name} on ${bookingDateFmt} at ${timeSlot} with ${staffName}. Amount: ₹${finalAmount} (${paymentLabel}). Booking ID: ${bookingId}`,
          link: "/salon-owner/dashboard",
          is_read: false,
        });
      }

      // 3️⃣ Same-day reminder for customer (cron handles exact timing too)
      const todayStr = new Date().toISOString().split("T")[0];
      if (date === todayStr) {
        await supabase.from("notifications").insert({
          user_id: user.id,
          type: "booking_reminder",
          title: "📅 Your appointment is today!",
          message: `Reminder: You have ${service.name} at ${salonName} today at ${timeSlot} with ${staffName}. Show your QR code when you arrive! (ID: ${bookingId})`,
          link: "/dashboard/bookings",
          is_read: false,
        });
      }
    } catch (notifErr) {
      // Notification failure should not fail the booking
      console.warn("Notification insert failed:", notifErr);
    }

    // ── Award GlamPoints for online payments (cash handled on QR scan) ────────
    // 10 points per ₹100 spent
    if (paymentMethod !== "cash_in_hand") {
      try {
        const serviceSupabase = getServiceSupabase();
        const pointsToAward = Math.floor(finalAmount / 100) * 10;
        if (pointsToAward > 0) {
          await serviceSupabase.rpc("award_glam_points", {
            p_user_id: user.id,
            p_points: pointsToAward,
            p_type: "earned",
            p_description: `Earned ${pointsToAward} pts for ${service.name} at ${salonName} (₹${finalAmount} paid)`,
            p_booking_id: bookingId,
          });
        }
        // Increment total_spent (lifetime spend tracker)
        await serviceSupabase.rpc("increment_total_spent", {
          p_user_id: user.id,
          p_amount: finalAmount,
        }).maybeSingle(); // non-fatal if function doesn't exist yet
      } catch (pointsErr) {
        console.warn("GlamPoints award failed (non-fatal):", pointsErr);
      }
    }

    return NextResponse.json({ booking, message: "Booking confirmed!" }, { status: 201 });

  } catch (error) {
    console.error("Booking error:", error);
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const supabase = await getSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const limit = parseInt(searchParams.get("limit") ?? "20");

  let query = supabase
    .from("bookings")
    .select(`
      *,
      salon:salons(name, cover_image, slug, address, area, city, phone),
      service:services(name, category, duration),
      staff:staff(name, role)
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get user profile for receipt
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, phone")
    .eq("id", user.id)
    .single();

  // Attach glam_points_earned per booking (10 pts per ₹100)
  const bookings = (data ?? []).map((b: any) => ({
    ...b,
    glam_points_earned: Math.floor((b.final_amount ?? 0) / 100) * 10,
    user_name: profile?.full_name ?? "",
    user_email: profile?.email ?? user.email ?? "",
    user_phone: profile?.phone ?? "",
  }));

  return NextResponse.json({ bookings });
}
