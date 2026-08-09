import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { RAZORPAY_CONFIG, validateRazorpayConfig } from "@/lib/razorpay/config";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    // Validate Razorpay configuration
    validateRazorpayConfig();

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { amount, currency = "INR", notes = {} } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid amount" },
        { status: 400 }
      );
    }

    // Initialize Razorpay
    const razorpay = new Razorpay({
      key_id: RAZORPAY_CONFIG.keyId,
      key_secret: RAZORPAY_CONFIG.keySecret,
    });

    // Create order
    const options = {
      amount: Math.round(amount * 100), // Amount in paise
      currency,
      receipt: `rcpt_${Date.now()}_${user.id.slice(0, 8)}`,
      notes: {
        user_id: user.id,
        ...notes,
      },
    };

    const order = await razorpay.orders.create(options);

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: RAZORPAY_CONFIG.keyId,
    });
  } catch (error: any) {
    console.error("Razorpay create order error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create order" },
      { status: 500 }
    );
  }
}
