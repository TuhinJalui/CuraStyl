import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { generateBookingId } from "@/lib/utils";

const PLANS: Record<string, { name: string; price: number; emoji: string }> = {
  free:    { name: "Free",          price: 0,    emoji: "🆓" },
  premium: { name: "Premium",       price: 999,  emoji: "⭐" },
  ultra:   { name: "Ultra Premium", price: 2499, emoji: "👑" },
};

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

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * POST /api/payment/verify
 * Verifies UPI payment via UTR number and processes the action.
 *
 * Body:
 *   orderId      - the order ID from create-order
 *   utrNumber    - UTR / Transaction ID entered by user
 *   type         - "booking" | "plan_upgrade"
 *
 * For booking type, also needs booking params if not in metadata:
 *   salonId, serviceId, staffId, date, timeSlot, couponCode, paymentMethod
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await getSupabase();
    const serviceSupabase = getServiceSupabase();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await req.json();
    const { orderId, utrNumber } = body;

    if (!orderId) {
      return NextResponse.json({ error: "Order ID required" }, { status: 400 });
    }
    if (!utrNumber || utrNumber.trim().length < 6) {
      return NextResponse.json({ error: "Valid UTR number required" }, { status: 400 });
    }

    // Look up the payment record
    const { data: payment, error: payErr } = await supabase
      .from("payments")
      .select("*")
      .eq("order_id", orderId)
      .single();

    if (payErr || !payment) {
      return NextResponse.json({ error: "Payment order not found" }, { status: 404 });
    }

    if (payment.user_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Already completed
    if (payment.status === "completed") {
      return NextResponse.json({
        success: true,
        alreadyCompleted: true,
        message: "Payment already verified",
      });
    }

    // Mark payment as completed (use service role to bypass RLS)
    const { error: updatePayErr } = await serviceSupabase
      .from("payments")
      .update({
        status: "completed",
        payment_id: utrNumber.trim(),
        payment_method: "upi",
        verified_at: new Date().toISOString(),
      })
      .eq("id", payment.id);

    if (updatePayErr) {
      console.error("[verify] Failed to update payment:", JSON.stringify(updatePayErr));
      return NextResponse.json({ error: "Failed to update payment status: " + updatePayErr.message }, { status: 500 });
    }

    const meta = payment.metadata || {};

    // ─── BOOKING PAYMENT ──────────────────────────────────────────────────────
    if (payment.payment_type === "booking") {
      const {
        salonId, serviceId, staffId, date, timeSlot,
        couponCode, paymentMethod = "upi",
      } = meta;

      if (!salonId || !serviceId || !date || !timeSlot) {
        return NextResponse.json({ error: "Missing booking details in payment metadata" }, { status: 400 });
      }

      // Get service details
      const { data: service } = await supabase
        .from("services")
        .select("id, price, name, salon_id")
        .eq("id", serviceId)
        .single();

      if (!service) {
        return NextResponse.json({ error: "Service not found" }, { status: 404 });
      }

      // Calculate discount
      let totalAmount = service.price;
      let discountAmount = 0;

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
                // Update coupon usage
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

      // Create the booking
      const { data: booking, error: bookingErr } = await supabase
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
          payment_status: "paid",
          payment_method: paymentMethod,
          payment_id: utrNumber.trim(),
        })
        .select("*")
        .single();

      if (bookingErr) {
        console.error("Booking insert error:", bookingErr);
        return NextResponse.json({ error: "Failed to create booking: " + bookingErr.message }, { status: 500 });
      }

      // Update payment record with booking ID
      await supabase
        .from("payments")
        .update({ metadata: { ...meta, bookingId } })
        .eq("id", payment.id);

      // Get salon info for notifications
      const { data: salonInfo } = await supabase
        .from("salons")
        .select("name, owner_id")
        .eq("id", salonId)
        .single();
      const salonName = salonInfo?.name ?? "the salon";

      // Get staff name
      let staffName = "Any available";
      if (staffId) {
        const { data: staffInfo } = await supabase
          .from("staff")
          .select("name")
          .eq("id", staffId)
          .single();
        if (staffInfo) staffName = staffInfo.name;
      }

      // Get user profile
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", user.id)
        .single();

      const bookingDateFmt = new Date(date + "T00:00:00").toLocaleDateString("en-IN", {
        weekday: "long", day: "numeric", month: "long",
      });

      // 1️⃣ Notify customer — confirmed
      await supabase.from("notifications").insert({
        user_id: user.id,
        type: "booking_confirmed",
        title: "🎉 Booking Confirmed & Payment Received!",
        message: `Your appointment at ${salonName} for ${service.name} on ${bookingDateFmt} at ${timeSlot} with ${staffName} is confirmed. UPI payment of ₹${finalAmount} received (UTR: ${utrNumber.trim()}). Show your QR when you arrive. (ID: ${bookingId})`,
        link: "/dashboard/bookings",
        is_read: false,
      });

      // 2️⃣ Notify salon owner
      if (salonInfo?.owner_id) {
        const customerName = userProfile?.full_name ?? user.email ?? "A customer";
        const customerPhone = userProfile?.phone ? ` | 📞 ${userProfile.phone}` : "";
        await supabase.from("notifications").insert({
          user_id: salonInfo.owner_id,
          type: "new_booking",
          title: `💰 New Paid Booking! ${customerName}`,
          message: `${customerName}${customerPhone} booked ${service.name} on ${bookingDateFmt} at ${timeSlot} with ${staffName}. ₹${finalAmount} paid via UPI. Booking ID: ${bookingId}`,
          link: "/salon-owner/dashboard",
          is_read: false,
        });
      }

      // 3️⃣ Award GlamPoints (10 pts per ₹100)
      const pointsToAward = Math.floor(finalAmount / 100) * 10;
      if (pointsToAward > 0) {
        try {
          await serviceSupabase.rpc("award_glam_points", {
            p_user_id: user.id,
            p_points: pointsToAward,
            p_type: "earned",
            p_description: `Earned ${pointsToAward} pts for ${service.name} at ${salonName} (₹${finalAmount} UPI)`,
            p_booking_id: bookingId,
          });
        } catch (err) {
          console.warn("GlamPoints award failed (non-fatal):", err);
        }
      }

      // 4️⃣ Update total_spent
      try {
        await serviceSupabase.rpc("increment_total_spent", {
          p_user_id: user.id,
          p_amount: finalAmount,
        });
      } catch (err) {
        console.warn("increment_total_spent failed (non-fatal):", err);
      }

      return NextResponse.json({
        success: true,
        message: "Payment verified & booking confirmed!",
        booking,
        pointsEarned: pointsToAward,
        paymentId: utrNumber.trim(),
      });
    }

    // ─── PLAN UPGRADE PAYMENT ─────────────────────────────────────────────────
    if (payment.payment_type === "plan_upgrade") {
      const { salonId, tier } = meta;

      if (!salonId || !tier || !PLANS[tier]) {
        return NextResponse.json({ error: "Missing plan upgrade details in metadata" }, { status: 400 });
      }

      // Verify salon belongs to user
      const { data: salon } = await supabase
        .from("salons")
        .select("id, name")
        .eq("id", salonId)
        .eq("owner_id", user.id)
        .single();

      if (!salon) {
        return NextResponse.json({ error: "Salon not found or unauthorized" }, { status: 404 });
      }

      // Set expiry 1 month from now
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      const { error: planErr } = await supabase
        .from("salons")
        .update({
          plan_tier: tier,
          plan_expires_at: expiresAt.toISOString(),
        })
        .eq("id", salonId);

      if (planErr) {
        return NextResponse.json({ error: planErr.message }, { status: 500 });
      }

      const plan = PLANS[tier];

      // Notify salon owner — plan upgraded
      await supabase.from("notifications").insert({
        user_id: user.id,
        type: "plan_upgrade",
        title: `${plan.emoji} ${plan.name} Plan Activated!`,
        message: `Your salon "${salon.name}" has been upgraded to ${plan.name}! Payment of ₹${payment.amount} received via UPI (UTR: ${utrNumber.trim()}). Plan valid until ${expiresAt.toLocaleDateString("en-IN")}. Enjoy all premium features!`,
        link: "/salon-owner/dashboard",
        is_read: false,
      });

      return NextResponse.json({
        success: true,
        message: `${plan.name} plan activated successfully!`,
        tier,
        planName: plan.name,
        expiresAt: expiresAt.toISOString(),
        paymentId: utrNumber.trim(),
      });
    }

    return NextResponse.json({ error: "Unknown payment type" }, { status: 400 });

  } catch (error) {
    console.error("Payment verify error:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
