import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const CUSTOMER_PLANS = {
  basic: {
    name: "Basic",
    price: 0,
    tier: "basic",
    pointsMultiplier: 1,
    birthdayDiscount: 5,
    perks: ["1 pt per ₹100 spent", "Birthday discount 5%", "Early access to offers"],
    color: "gray",
    emoji: "🌟",
  },
  premium: {
    name: "Premium",
    price: 499,
    tier: "premium",
    pointsMultiplier: 1.5,
    birthdayDiscount: 10,
    perks: ["1.5x points on all bookings", "Birthday discount 10%", "Priority customer support", "Exclusive member deals"],
    color: "purple",
    emoji: "💎",
  },
  vip: {
    name: "VIP",
    price: 999,
    tier: "vip",
    pointsMultiplier: 2,
    birthdayDiscount: 20,
    perks: ["2x points on all bookings", "Birthday discount 20%", "Free monthly service", "VIP-only time slots", "Personal style consultant"],
    color: "gold",
    emoji: "👑",
  },
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

// GET /api/customer/plan — get current plan + all plan info
export async function GET() {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Auth required" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("membership_tier, membership_expires_at, glam_points")
    .eq("id", user.id)
    .single();

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const currentTier = (profile.membership_tier as keyof typeof CUSTOMER_PLANS) ?? "basic";
  const current = CUSTOMER_PLANS[currentTier] ?? CUSTOMER_PLANS.basic;

  return NextResponse.json({
    current,
    plans: Object.values(CUSTOMER_PLANS),
    glamPoints: profile.glam_points || 0,
    membershipExpiresAt: profile.membership_expires_at,
  });
}

// POST /api/customer/plan — initiate customer plan upgrade (creates payment order)
export async function POST(req: NextRequest) {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Auth required" }, { status: 401 });

  const { tier } = await req.json();
  if (!tier || !CUSTOMER_PLANS[tier as keyof typeof CUSTOMER_PLANS]) {
    return NextResponse.json({ error: "Invalid plan tier" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("membership_tier, full_name")
    .eq("id", user.id)
    .single();

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const plan = CUSTOMER_PLANS[tier as keyof typeof CUSTOMER_PLANS];
  
  if (plan.price === 0) {
    // Basic plan - no payment needed
    return NextResponse.json({ error: "Cannot downgrade to basic plan via payment" }, { status: 400 });
  }

  // Create payment order
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const origin = host ? `${proto}://${host}` : new URL(req.url).origin;
  const siteUrl = !origin.includes("localhost") 
    ? origin 
    : (process.env.NEXT_PUBLIC_SITE_URL || origin);

  const orderResponse = await fetch(
    `${siteUrl}/api/payment/create-order`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: req.headers.get("cookie") || "",
      },
      body: JSON.stringify({
        amount: plan.price,
        type: "plan_upgrade_customer",
        metadata: {
          tier,
          tierName: plan.name,
          userName: profile.full_name,
        },
      }),
    }
  );

  if (!orderResponse.ok) {
    return NextResponse.json({ error: "Failed to create payment order" }, { status: 500 });
  }

  const orderData = await orderResponse.json();

  return NextResponse.json({
    ...orderData,
    planName: plan.name,
    planPrice: plan.price,
    message: "Payment order created. Complete payment to upgrade.",
  });
}
