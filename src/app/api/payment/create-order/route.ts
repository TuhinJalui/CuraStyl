import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import crypto from "crypto";

const UPI_ID = "7507075722@mbk";
const MERCHANT_NAME = "CuraStyl";

// Authenticated client (respects RLS — used to verify user)
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

// Service role client — bypasses RLS for DB writes
function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * POST /api/payment/create-order
 * Creates a UPI payment order record.
 *
 * Body:
 *   amount      - amount in rupees (number)
 *   type        - "booking" | "plan_upgrade"
 *   description - display label for QR code
 *   metadata    - {
 *       For booking:      salonId, serviceId, staffId, date, timeSlot, couponCode, paymentMethod
 *       For plan_upgrade: salonId, tier
 *     }
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Verify user is authenticated
    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await req.json();
    const { amount, type, metadata = {}, description = "CuraStyl Payment" } = body;

    // 2. Validate inputs
    if (!amount || Number(amount) <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }
    if (!type || !["booking", "plan_upgrade"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid payment type. Must be 'booking' or 'plan_upgrade'" },
        { status: 400 }
      );
    }

    const amountRupees = Math.round(Number(amount));

    // 3. Generate unique order ID
    const orderId = `CS${Date.now()}${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

    // 4. Build UPI deep link & QR URL
    const upiParams = new URLSearchParams({
      pa: UPI_ID,
      pn: MERCHANT_NAME,
      am: amountRupees.toString(),
      cu: "INR",
      tn: `${description} | ${orderId.slice(-8)}`,
    });
    const upiDeepLink = `upi://pay?${upiParams.toString()}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiDeepLink)}&ecc=M&format=png&color=7c3aed&bgcolor=ffffff&margin=10`;

    // 5. Store payment record using service role (bypasses RLS)
    const serviceSupabase = getServiceSupabase();
    const { data: payment, error } = await serviceSupabase
      .from("payments")
      .insert({
        user_id: user.id,
        order_id: orderId,
        amount: amountRupees,
        currency: "INR",
        status: "created",
        payment_type: type,
        metadata: { ...metadata, description, userId: user.id },
      })
      .select()
      .single();

    if (error) {
      console.error("[create-order] DB insert error:", JSON.stringify(error));
      return NextResponse.json(
        { error: `Failed to create payment order: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      orderId: payment.order_id,
      amount: payment.amount,
      currency: payment.currency,
      upiId: UPI_ID,
      merchantName: MERCHANT_NAME,
      upiDeepLink,
      qrUrl,
      description,
    });

  } catch (err: any) {
    console.error("[create-order] Unexpected error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
