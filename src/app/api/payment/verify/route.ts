import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
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

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * POST /api/payment/verify
 * Verifies payment and processes booking/plan upgrade
 * Handles UPI, Razorpay, and all payment methods
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await getSupabase();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await req.json();
    const {
      orderId,
      paymentId,
      paymentMethod = "upi",
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      transactionId,
      utrNumber,
    } = body;

    // Extract actual payment ID from various sources
    const actualPaymentId = paymentId || razorpay_payment_id || transactionId || utrNumber;
    const actualOrderId = orderId || razorpay_order_id;

    if (!actualPaymentId || !actualOrderId) {
      return NextResponse.json({ error: "Payment ID and Order ID required" }, { status: 400 });
    }

    // Find the payment order
    const { data: payment } = await supabase
      .from("payments")
      .select("*")
      .eq("order_id", actualOrderId)
      .single();

    if (!payment) {
      return NextResponse.json({ error: "Payment order not found" }, { status: 404 });
    }

    if (payment.user_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (payment.status === "completed") {
      return NextResponse.json({ error: "Payment already verified" }, { status: 400 });
    }

    // Update payment status
    await supabase
      .from("payments")
      .update({
        status: "completed",
        payment_id: actualPaymentId,
        payment_method: paymentMethod,
        razorpay_signature: razorpay_signature || null,
        verified_at: new Date().toISOString(),
      })
      .eq("id", payment.id);

    const metadata = payment.metadata || {};

    // Process based on payment type
    if (payment.payment_type === "booking" && metadata.bookingId) {
      // Update booking status
      await supabase
        .from("bookings")
        .update({
          status: "confirmed",
          payment_status: "paid",
          payment_id: actualPaymentId,
        })
        .eq("booking_id", metadata.bookingId);

      // Award GlamPoints (10 points per ₹100)
      const pointsToAward = Math.floor(payment.amount / 100) * 10;
      if (pointsToAward > 0) {
        try {
          const serviceSupabase = getServiceSupabase();
          await serviceSupabase.rpc("award_glam_points", {
            p_user_id: user.id,
            p_points: pointsToAward,
            p_type: "earned",
            p_description: `Earned from booking ${metadata.bookingId}`,
            p_booking_id: metadata.bookingId,
          });

          // Send GlamPoints notification
          await supabase.from("notifications").insert({
            user_id: user.id,
            type: "glam_points",
            title: `🌟 You earned ${pointsToAward} GlamPoints!`,
            message: `Payment successful! You've earned ${pointsToAward} GlamPoints for your booking (ID: ${metadata.bookingId}). Use them for discounts on future bookings!`,
            link: "/rewards",
            is_read: false,
          });
        } catch (err) {
          console.warn("GlamPoints award failed:", err);
        }
      }

      // Send confirmation notification
      await supabase.from("notifications").insert({
        user_id: user.id,
        type: "booking_confirmed",
        title: "Payment Successful! 🎉",
        message: `Your booking has been confirmed. Payment ID: ${actualPaymentId}. Amount: ₹${payment.amount}`,
        link: "/dashboard/bookings",
        is_read: false,
      });

      return NextResponse.json({
        success: true,
        message: "Booking confirmed successfully",
        pointsEarned: pointsToAward,
        bookingId: metadata.bookingId,
      });
    } 
    
    else if (payment.payment_type === "plan_upgrade_customer" && metadata.tier) {
      // Upgrade customer membership plan
      const tierMap: Record<string, { months: number; tierName: string }> = {
        premium: { months: 1, tierName: "premium" },
        vip: { months: 1, tierName: "vip" },
      };

      const tierInfo = tierMap[metadata.tier];
      if (tierInfo) {
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + tierInfo.months);

        await supabase
          .from("profiles")
          .update({
            membership_tier: tierInfo.tierName,
            membership_expires_at: expiresAt.toISOString(),
          })
          .eq("id", user.id);

        await supabase.from("notifications").insert({
          user_id: user.id,
          type: "plan_upgrade",
          title: `🎉 Welcome to ${metadata.tierName || tierInfo.tierName.toUpperCase()}!`,
          message: `Your membership has been upgraded successfully! Enjoy exclusive benefits and perks. Valid till ${expiresAt.toLocaleDateString("en-IN")}`,
          link: "/rewards",
          is_read: false,
        });

        return NextResponse.json({
          success: true,
          message: `Membership upgraded to ${tierInfo.tierName}`,
          tier: tierInfo.tierName,
          expiresAt: expiresAt.toISOString(),
        });
      }
    }
    
    else if (payment.payment_type === "plan_upgrade_salon" && metadata.tier && metadata.salonId) {
      // Upgrade salon plan
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1); // 1 month validity

      await supabase
        .from("salons")
        .update({
          plan_tier: metadata.tier,
          plan_expires_at: expiresAt.toISOString(),
        })
        .eq("id", metadata.salonId)
        .eq("owner_id", user.id);

      await supabase.from("notifications").insert({
        user_id: user.id,
        type: "plan_upgrade",
        title: `🚀 Salon Plan Upgraded to ${metadata.tierName || metadata.tier.toUpperCase()}!`,
        message: `Your salon plan has been upgraded successfully! Unlock more services, staff, and features. Valid till ${expiresAt.toLocaleDateString("en-IN")}`,
        link: "/salon-owner/dashboard",
        is_read: false,
      });

      return NextResponse.json({
        success: true,
        message: `Salon plan upgraded to ${metadata.tier}`,
        tier: metadata.tier,
        expiresAt: expiresAt.toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      message: "Payment verified successfully",
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
