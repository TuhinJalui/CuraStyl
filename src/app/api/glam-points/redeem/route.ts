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

/** Convert points to rupees: 100 pts = ₹10 (10:1 ratio) */
function pointsToRupees(points: number): number {
  return Math.floor(points / 100) * 10;
}

/** Generate a unique coupon code */
function generateCouponCode(prefix: string = "GLAM"): string {
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${randomPart}`;
}

/**
 * POST /api/glam-points/redeem
 * Redeems GlamPoints for discount coupons
 * Creates a reusable coupon code that can be applied during checkout
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await req.json();
    const { points, rewardId } = body;

    // Validation
    if (!points || points <= 0) {
      return NextResponse.json({ error: "Points must be positive" }, { status: 400 });
    }

    const minRedeem = 100; // minimum 100 pts = ₹10
    if (points < minRedeem) {
      return NextResponse.json({
        error: `Minimum redemption is ${minRedeem} GlamPoints (₹${pointsToRupees(minRedeem)})`,
      }, { status: 400 });
    }

    const serviceSupabase = getServiceSupabase();

    // Get current balance
    const { data: profile } = await serviceSupabase
      .from("profiles")
      .select("glam_points, full_name, email")
      .eq("id", user.id)
      .single();

    const currentBalance = profile?.glam_points ?? 0;

    if (currentBalance < points) {
      return NextResponse.json({
        error: `Insufficient GlamPoints. You have ${currentBalance} pts but need ${points} pts.`,
      }, { status: 400 });
    }

    // Calculate discount value
    const discountAmount = pointsToRupees(points);

    // Generate unique coupon code
    const couponCode = generateCouponCode("GLAM");

    // Create coupon validity (30 days from now)
    const validFrom = new Date();
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);

    // Create coupon in database
    const { data: coupon, error: couponError } = await serviceSupabase
      .from("coupons")
      .insert({
        code: couponCode,
        discount_type: "fixed",
        discount_value: discountAmount,
        min_order_amount: 0,
        max_discount_amount: discountAmount,
        usage_limit: 1, // Single use coupon
        used_count: 0,
        is_active: true,
        valid_from: validFrom.toISOString(),
        valid_until: validUntil.toISOString(),
        created_by: user.id,
        description: `Redeemed from ${points} GlamPoints`,
      })
      .select()
      .single();

    if (couponError) {
      console.error("Coupon creation error:", couponError);
      return NextResponse.json({ error: "Failed to create coupon" }, { status: 500 });
    }

    // Deduct points using the atomic function
    const { data: newBalance, error: pointsError } = await serviceSupabase
      .rpc("award_glam_points", {
        p_user_id: user.id,
        p_points: -points,
        p_type: "redeemed",
        p_description: `Redeemed ${points} pts for ₹${discountAmount} coupon (${couponCode})`,
        p_booking_id: null,
      });

    if (pointsError) {
      // Rollback: Delete the coupon if points deduction fails
      await serviceSupabase.from("coupons").delete().eq("id", coupon.id);
      return NextResponse.json({ error: "Failed to deduct points" }, { status: 500 });
    }

    // Send notification
    await serviceSupabase.from("notifications").insert({
      user_id: user.id,
      type: "glam_points",
      title: `🎟️ Coupon Unlocked: ${couponCode}`,
      message: `You've successfully redeemed ${points} GlamPoints for a ₹${discountAmount} discount coupon! Use code "${couponCode}" at checkout. Valid for 30 days.`,
      link: "/rewards",
      is_read: false,
    });

    return NextResponse.json({
      success: true,
      pointsRedeemed: points,
      rupeesValue: discountAmount,
      newBalance,
      coupon: {
        code: couponCode,
        discountAmount,
        validUntil: validUntil.toISOString(),
        minOrderAmount: 0,
      },
      message: `✅ Redeemed ${points} GlamPoints for ₹${discountAmount} coupon!`,
    });
  } catch (error: any) {
    console.error("Redemption error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/glam-points/redeem
 * Get user's redeemed coupons history
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Fetch coupons created by this user (from GlamPoints redemption)
    const { data: coupons, error } = await supabase
      .from("coupons")
      .select("*")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch coupons error:", error);
      return NextResponse.json({ coupons: [] });
    }

    return NextResponse.json({ 
      coupons: coupons ?? [],
      message: "Coupons fetched successfully"
    });
  } catch (error: any) {
    console.error("Get coupons error:", error);
    return NextResponse.json({ coupons: [] });
  }
}
