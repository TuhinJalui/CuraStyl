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

/** Computes points for an amount in rupees: 10 pts per ₹100 spent */
export function computeGlamPoints(amountRupees: number): number {
  return Math.floor(amountRupees / 100) * 10;
}

/** Computes rupee discount for points redemption: 100 pts = ₹10 (i.e. 10:1 ratio) */
export function pointsToRupees(points: number): number {
  return Math.floor(points / 100) * 10;
}

// GET /api/glam-points — get balance + history
export async function GET(req: NextRequest) {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Auth required" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") ?? "20");

  // Fetch balance from profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("glam_points, membership_tier, total_spent")
    .eq("id", user.id)
    .single();

  // Fetch history
  const { data: history } = await supabase
    .from("glam_points_history")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  const balance = profile?.glam_points ?? 0;
  const tier = profile?.membership_tier ?? "basic";
  const totalSpent = profile?.total_spent ?? 0;

  // Points needed for next tier
  const nextTierThresholds = { basic: 1000, premium: 5000, vip: null };
  const nextThreshold = nextTierThresholds[tier as keyof typeof nextTierThresholds] ?? null;
  const pointsToNextTier = nextThreshold ? Math.max(0, nextThreshold - balance) : null;

  return NextResponse.json({
    balance,
    tier,
    totalSpent,
    history: history ?? [],
    rupeesValue: pointsToRupees(balance),   // how much they can redeem right now
    pointsToNextTier,
    nextTier: tier === "basic" ? "premium" : tier === "premium" ? "vip" : null,
    tierThresholds: { basic: 0, premium: 1000, vip: 5000 },
  });
}

// POST /api/glam-points — redeem points
export async function POST(req: NextRequest) {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Auth required" }, { status: 401 });

  const body = await req.json();
  const { action, points, bookingId } = body;

  if (!action || !["earn", "redeem"].includes(action)) {
    return NextResponse.json({ error: "Invalid action. Use 'earn' or 'redeem'" }, { status: 400 });
  }

  if (!points || points <= 0) {
    return NextResponse.json({ error: "Points must be positive" }, { status: 400 });
  }

  // Use service role to bypass RLS for the atomic function
  const serviceSupabase = getServiceSupabase();

  // Fetch current balance
  const { data: profile } = await serviceSupabase
    .from("profiles")
    .select("glam_points")
    .eq("id", user.id)
    .single();

  const currentBalance = profile?.glam_points ?? 0;

  if (action === "redeem") {
    if (currentBalance < points) {
      return NextResponse.json({
        error: `Insufficient GlamPoints. You have ${currentBalance} pts but need ${points} pts.`,
      }, { status: 400 });
    }

    const minRedeem = 100; // minimum 100 pts = ₹10
    if (points < minRedeem) {
      return NextResponse.json({
        error: `Minimum redemption is ${minRedeem} GlamPoints (₹${pointsToRupees(minRedeem)}).`,
      }, { status: 400 });
    }

    const rupeesValue = pointsToRupees(points);

    // Call the atomic function
    const { data: newBalance, error } = await serviceSupabase
      .rpc("award_glam_points", {
        p_user_id: user.id,
        p_points: -points,
        p_type: "redeemed",
        p_description: `Redeemed ${points} pts for ₹${rupeesValue} discount${bookingId ? ` on booking ${bookingId}` : ""}`,
        p_booking_id: bookingId ?? null,
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      action: "redeemed",
      pointsRedeemed: points,
      rupeesValue,
      newBalance,
      message: `✅ Redeemed ${points} GlamPoints for ₹${rupeesValue} discount!`,
    });
  }

  // action === "earn" (called server-to-server, for manually awarding points)
  const { data: newBalance, error } = await serviceSupabase
    .rpc("award_glam_points", {
      p_user_id: user.id,
      p_points: points,
      p_type: "earned",
      p_description: `Earned ${points} GlamPoints${bookingId ? ` from booking ${bookingId}` : ""}`,
      p_booking_id: bookingId ?? null,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    action: "earned",
    pointsEarned: points,
    newBalance,
    message: `🎉 Earned ${points} GlamPoints!`,
  });
}
