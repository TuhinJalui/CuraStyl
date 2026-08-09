import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const PLANS = {
  free: {
    name: "Free",
    price: 0,
    tier: "free",
    services: 5,
    staff: 3,
    photos: 3,
    analytics: "basic",
    featured: false,
    priorityRanking: false,
    customBookingUrl: false,
    ai: false,
    whatsappReminders: false,
    exportReports: false,
    support: "Community",
    color: "gray",
    emoji: "🆓",
  },
  premium: {
    name: "Premium",
    price: 999,
    tier: "premium",
    services: 20,
    staff: 10,
    photos: 10,
    analytics: "advanced",
    featured: true,
    priorityRanking: true,
    customBookingUrl: true,
    ai: false,
    whatsappReminders: false,
    exportReports: false,
    support: "Email Priority",
    color: "purple",
    emoji: "⭐",
  },
  ultra: {
    name: "Ultra Premium",
    price: 2499,
    tier: "ultra",
    services: -1, // unlimited
    staff: -1,
    photos: 30,
    analytics: "full",
    featured: true,
    priorityRanking: true,
    customBookingUrl: true,
    ai: true,
    whatsappReminders: true,
    exportReports: true,
    support: "Priority 24/7",
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

// GET /api/salon-owner/plan — get current plan + all plan info
export async function GET() {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Auth required" }, { status: 401 });

  const { data: salon } = await supabase
    .from("salons")
    .select("id, plan_tier, plan_expires_at, name")
    .eq("owner_id", user.id)
    .single();

  if (!salon) return NextResponse.json({ error: "No salon found" }, { status: 404 });

  const currentTier = (salon.plan_tier as keyof typeof PLANS) ?? "free";
  const current = PLANS[currentTier] ?? PLANS.free;

  // Get usage stats
  const [{ count: serviceCount }, { count: staffCount }] = await Promise.all([
    supabase.from("services").select("id", { count: "exact", head: true }).eq("salon_id", salon.id).eq("is_active", true),
    supabase.from("staff").select("id", { count: "exact", head: true }).eq("salon_id", salon.id).eq("is_active", true),
  ]);

  return NextResponse.json({
    current,
    plans: Object.values(PLANS),
    usage: {
      services: serviceCount ?? 0,
      staff: staffCount ?? 0,
    },
    planExpiresAt: salon.plan_expires_at,
  });
}

// POST /api/salon-owner/plan — initiate plan upgrade (creates payment order)
export async function POST(req: NextRequest) {
  try {
    console.log('[SalonPlan] ===== START =====');
    const supabase = await getSupabase();
    console.log('[SalonPlan] Supabase client created');
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('[SalonPlan] Auth check:', { hasUser: !!user, authError });
    
    if (authError) {
      console.error('[SalonPlan] Auth error:', authError);
      return NextResponse.json({ error: "Authentication error", details: authError.message }, { status: 401 });
    }
    
    if (!user) {
      console.error('[SalonPlan] No user authenticated');
      return NextResponse.json({ error: "Auth required" }, { status: 401 });
    }

    console.log('[SalonPlan] Reading request body...');
    const body = await req.json();
    const { tier } = body;
    console.log('[SalonPlan] Requested tier:', tier, 'Full body:', body);
  
  if (!tier || !PLANS[tier as keyof typeof PLANS]) {
    console.error('[SalonPlan] Invalid tier:', tier);
    return NextResponse.json({ error: "Invalid plan tier" }, { status: 400 });
  }

  console.log('[SalonPlan] Fetching salon for user:', user.id);
  const { data: salon, error: salonError } = await supabase
    .from("salons")
    .select("id, plan_tier, name")
    .eq("owner_id", user.id)
    .single();

  if (salonError) {
    console.error('[SalonPlan] Error fetching salon:', salonError);
    return NextResponse.json({ error: "Failed to fetch salon data" }, { status: 500 });
  }

  if (!salon) {
    console.error('[SalonPlan] No salon found for user:', user.id);
    return NextResponse.json({ error: "No salon found" }, { status: 404 });
  }

  console.log('[SalonPlan] Salon found:', salon);

  const plan = PLANS[tier as keyof typeof PLANS];
  console.log('[SalonPlan] Plan details:', plan);
  
  if (plan.price === 0) {
    console.error('[SalonPlan] Attempted to upgrade to free plan');
    return NextResponse.json({ error: "Cannot upgrade to free plan" }, { status: 400 });
  }

  // Create payment order
  console.log('[SalonPlan] Creating payment order with:', {
    amount: plan.price,
    type: "plan_upgrade_salon",
    metadata: {
      tier,
      tierName: plan.name,
      salonId: salon.id,
      salonName: salon.name,
    },
  });

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
        type: "plan_upgrade_salon",
        metadata: {
          tier,
          tierName: plan.name,
          salonId: salon.id,
          salonName: salon.name,
        },
      }),
    }
  );

  console.log('[SalonPlan] Payment order response status:', orderResponse.status);

  if (!orderResponse.ok) {
    const errorData = await orderResponse.json().catch(() => ({}));
    console.error('[SalonPlan] Payment order creation failed:', errorData);
    return NextResponse.json({ 
      error: "Failed to create payment order",
      details: errorData 
    }, { status: 500 });
  }

  const orderData = await orderResponse.json();
  console.log('[SalonPlan] Payment order created successfully:', orderData);

  return NextResponse.json({
    ...orderData,
    planName: plan.name,
    planPrice: plan.price,
    message: "Payment order created. Complete payment to upgrade.",
  });
  
  } catch (error) {
    console.error('[SalonPlan] ===== UNEXPECTED ERROR =====');
    console.error('[SalonPlan] Error type:', error?.constructor?.name);
    console.error('[SalonPlan] Error message:', error instanceof Error ? error.message : String(error));
    console.error('[SalonPlan] Error stack:', error instanceof Error ? error.stack : 'No stack');
    console.error('[SalonPlan] ===== END ERROR =====');
    
    return NextResponse.json({ 
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
      type: error?.constructor?.name || "Unknown"
    }, { status: 500 });
  }
}
