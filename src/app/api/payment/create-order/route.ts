import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import crypto from "crypto";

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

/**
 * POST /api/payment/create-order
 * Creates a payment order for booking or plan upgrade
 * Supports UPI direct payment (7507075722@mbk) and Razorpay
 */
export async function POST(req: NextRequest) {
  try {
    console.log('[PaymentOrder] Starting payment order creation');
    const supabase = await getSupabase();

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.error('[PaymentOrder] Auth error:', authError);
      return NextResponse.json({ error: "Authentication error" }, { status: 401 });
    }
    if (!user) {
      console.error('[PaymentOrder] No user found');
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    console.log('[PaymentOrder] User authenticated:', user.id);

    const body = await req.json();
    console.log('[PaymentOrder] Request body:', body);
    const { amount, type, metadata } = body;

    if (!amount || amount <= 0) {
      console.error('[PaymentOrder] Invalid amount:', amount);
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    if (!type || !["booking", "plan_upgrade_customer", "plan_upgrade_salon"].includes(type)) {
      console.error('[PaymentOrder] Invalid payment type:', type);
      return NextResponse.json({ error: "Invalid payment type" }, { status: 400 });
    }

    // Generate a unique order ID
    const orderId = `order_${Date.now()}_${crypto.randomBytes(8).toString("hex")}`;
    console.log('[PaymentOrder] Generated order ID:', orderId);

    // Create payment record in database
    console.log('[PaymentOrder] Inserting payment record:', {
      user_id: user.id,
      order_id: orderId,
      amount,
      currency: "INR",
      status: "created",
      payment_type: type,
      metadata: metadata || {},
    });

    const { data: payment, error } = await supabase
      .from("payments")
      .insert({
        user_id: user.id,
        order_id: orderId,
        amount,
        currency: "INR",
        status: "created",
        payment_type: type,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) {
      console.error("[PaymentOrder] Database error creating payment:", error);
      console.error("[PaymentOrder] Error details:", JSON.stringify(error, null, 2));
      return NextResponse.json({ 
        error: "Failed to create payment order", 
        details: error.message,
        code: error.code 
      }, { status: 500 });
    }

    console.log('[PaymentOrder] Payment record created successfully:', payment);

    // Return payment details with UPI ID
    const response = {
      orderId: payment.order_id,
      amount: payment.amount,
      currency: payment.currency,
      // UPI details for direct payment
      upiId: "7507075722@mbk",
      upiName: "CuraStyl",
      // For Razorpay integration (optional)
      razorpayKey: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "",
      razorpayOrderId: orderId,
    };
    console.log('[PaymentOrder] Returning response:', response);

    return NextResponse.json(response);
  } catch (error) {
    console.error("[PaymentOrder] Unexpected error:", error);
    console.error("[PaymentOrder] Error stack:", error instanceof Error ? error.stack : "No stack trace");
    return NextResponse.json({ 
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
