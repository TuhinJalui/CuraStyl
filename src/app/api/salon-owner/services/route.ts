import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Plan limits
const PLAN_LIMITS: Record<string, { services: number; staff: number; photos: number }> = {
  free:    { services: 5,          staff: 3,          photos: 3  },
  premium: { services: 20,         staff: 10,         photos: 10 },
  ultra:   { services: Infinity,   staff: Infinity,   photos: 30 },
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

async function getOwnerSalon(supabase: ReturnType<typeof createServerClient> | Awaited<ReturnType<typeof getSupabase>>, userId: string) {
  const { data } = await (supabase as any)
    .from("salons")
    .select("id, plan_tier")
    .eq("owner_id", userId)
    .single();
  return data as { id: string; plan_tier: string } | null;
}

// GET /api/salon-owner/services
export async function GET() {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Auth required" }, { status: 401 });

  const salon = await getOwnerSalon(supabase, user.id);
  if (!salon) return NextResponse.json({ error: "No salon found" }, { status: 404 });

  const { data: services, error } = await supabase
    .from("services")
    .select("*")
    .eq("salon_id", salon.id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const plan = salon.plan_tier ?? "free";
  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;

  return NextResponse.json({
    services: services ?? [],
    plan,
    limit: limits.services,
    canAdd: (services?.length ?? 0) < limits.services,
  });
}

// POST /api/salon-owner/services — create new service
export async function POST(req: NextRequest) {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Auth required" }, { status: 401 });

  const salon = await getOwnerSalon(supabase, user.id);
  if (!salon) return NextResponse.json({ error: "No salon found" }, { status: 404 });

  // Check plan limit
  const { count } = await supabase
    .from("services")
    .select("id", { count: "exact", head: true })
    .eq("salon_id", salon.id)
    .eq("is_active", true);

  const plan = salon.plan_tier ?? "free";
  const limit = PLAN_LIMITS[plan]?.services ?? 5;

  if ((count ?? 0) >= limit) {
    return NextResponse.json({
      error: `Your ${plan} plan allows max ${limit} services. Please upgrade to add more.`,
      upgradePlan: true,
    }, { status: 403 });
  }

  const body = await req.json();
  const { name, description, category, price, duration, image_url } = body;

  if (!name || !category || price === undefined || !duration) {
    return NextResponse.json({ error: "Missing required fields: name, category, price, duration" }, { status: 400 });
  }

  const { data: service, error } = await supabase
    .from("services")
    .insert({
      salon_id: salon.id,
      name,
      description: description ?? "",
      category,
      price: Number(price),
      duration: Number(duration),
      image_url: image_url ?? null,
      is_active: true,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ service }, { status: 201 });
}

// PATCH /api/salon-owner/services — update service
export async function PATCH(req: NextRequest) {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Auth required" }, { status: 401 });

  const salon = await getOwnerSalon(supabase, user.id);
  if (!salon) return NextResponse.json({ error: "No salon found" }, { status: 404 });

  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) return NextResponse.json({ error: "Service ID required" }, { status: 400 });

  // Verify service belongs to this salon
  const { data: existing } = await supabase
    .from("services")
    .select("id")
    .eq("id", id)
    .eq("salon_id", salon.id)
    .single();

  if (!existing) return NextResponse.json({ error: "Service not found" }, { status: 404 });

  const allowed = ["name", "description", "category", "price", "duration", "image_url", "is_active"];
  const patch: Record<string, unknown> = {};
  for (const k of allowed) {
    if (k in updates) patch[k] = updates[k];
  }

  const { data: service, error } = await supabase
    .from("services")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ service });
}

// DELETE /api/salon-owner/services?id=...
export async function DELETE(req: NextRequest) {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Auth required" }, { status: 401 });

  const salon = await getOwnerSalon(supabase, user.id);
  if (!salon) return NextResponse.json({ error: "No salon found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Service ID required" }, { status: 400 });

  // Verify ownership
  const { data: existing } = await supabase
    .from("services")
    .select("id")
    .eq("id", id)
    .eq("salon_id", salon.id)
    .single();

  if (!existing) return NextResponse.json({ error: "Service not found" }, { status: 404 });

  // Soft-delete (set inactive) so historical bookings remain valid
  const { error } = await supabase
    .from("services")
    .update({ is_active: false })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, message: "Service removed" });
}
