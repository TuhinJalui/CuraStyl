import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const PLAN_LIMITS: Record<string, { staff: number }> = {
  free:    { staff: 3  },
  premium: { staff: 10 },
  ultra:   { staff: Infinity },
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

async function getOwnerSalon(supabase: any, userId: string) {
  const { data } = await supabase
    .from("salons")
    .select("id, plan_tier")
    .eq("owner_id", userId)
    .single();
  return data as { id: string; plan_tier: string } | null;
}

// GET /api/salon-owner/staff
export async function GET() {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Auth required" }, { status: 401 });

  const salon = await getOwnerSalon(supabase, user.id);
  if (!salon) return NextResponse.json({ error: "No salon found" }, { status: 404 });

  const { data: staff, error } = await supabase
    .from("staff")
    .select("*")
    .eq("salon_id", salon.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const plan = salon.plan_tier ?? "free";
  const limit = PLAN_LIMITS[plan]?.staff ?? 3;

  return NextResponse.json({
    staff: staff ?? [],
    plan,
    limit,
    canAdd: (staff?.length ?? 0) < limit,
  });
}

// POST /api/salon-owner/staff — create new staff member
export async function POST(req: NextRequest) {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Auth required" }, { status: 401 });

  const salon = await getOwnerSalon(supabase, user.id);
  if (!salon) return NextResponse.json({ error: "No salon found" }, { status: 404 });

  // Check plan limit
  const { count } = await supabase
    .from("staff")
    .select("id", { count: "exact", head: true })
    .eq("salon_id", salon.id)
    .eq("is_active", true);

  const plan = salon.plan_tier ?? "free";
  const limit = PLAN_LIMITS[plan]?.staff ?? 3;

  if ((count ?? 0) >= limit) {
    return NextResponse.json({
      error: `Your ${plan} plan allows max ${limit} staff members. Please upgrade to add more.`,
      upgradePlan: true,
    }, { status: 403 });
  }

  const body = await req.json();
  const { name, role, specialization, avatar_url, experience_years } = body;

  if (!name || !role) {
    return NextResponse.json({ error: "Name and role are required" }, { status: 400 });
  }

  const { data: member, error } = await supabase
    .from("staff")
    .insert({
      salon_id: salon.id,
      name,
      role,
      specialization: Array.isArray(specialization) ? specialization : [],
      avatar_url: avatar_url ?? null,
      experience_years: Number(experience_years ?? 0),
      rating: 0,
      is_active: true,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ member }, { status: 201 });
}

// PATCH /api/salon-owner/staff — update staff member
export async function PATCH(req: NextRequest) {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Auth required" }, { status: 401 });

  const salon = await getOwnerSalon(supabase, user.id);
  if (!salon) return NextResponse.json({ error: "No salon found" }, { status: 404 });

  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: "Staff ID required" }, { status: 400 });

  // Verify belongs to this salon
  const { data: existing } = await supabase
    .from("staff")
    .select("id")
    .eq("id", id)
    .eq("salon_id", salon.id)
    .single();

  if (!existing) return NextResponse.json({ error: "Staff not found" }, { status: 404 });

  const allowed = ["name", "role", "specialization", "avatar_url", "experience_years", "is_active"];
  const patch: Record<string, unknown> = {};
  for (const k of allowed) {
    if (k in updates) patch[k] = updates[k];
  }

  const { data: member, error } = await supabase
    .from("staff")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ member });
}

// DELETE /api/salon-owner/staff?id=...
export async function DELETE(req: NextRequest) {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Auth required" }, { status: 401 });

  const salon = await getOwnerSalon(supabase, user.id);
  if (!salon) return NextResponse.json({ error: "No salon found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Staff ID required" }, { status: 400 });

  const { data: existing } = await supabase
    .from("staff")
    .select("id")
    .eq("id", id)
    .eq("salon_id", salon.id)
    .single();

  if (!existing) return NextResponse.json({ error: "Staff not found" }, { status: 404 });

  // Soft delete
  const { error } = await supabase
    .from("staff")
    .update({ is_active: false })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, message: "Staff member removed" });
}
