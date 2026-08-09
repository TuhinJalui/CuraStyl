import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
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

// GET /api/salon-owner/salon — fetch owner's full salon data
export async function GET() {
  const supabase = await getSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { data: salon, error } = await supabase
    .from("salons")
    .select("*")
    .eq("owner_id", user.id)
    .single();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ salon: salon ?? null });
}

// PATCH /api/salon-owner/salon — update salon info
export async function PATCH(req: NextRequest) {
  const supabase = await getSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  // Verify salon belongs to this owner
  const { data: existing } = await supabase
    .from("salons")
    .select("id, owner_id")
    .eq("owner_id", user.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "No salon found for this owner" }, { status: 404 });
  }

  const body = await req.json();

  // Whitelist of updatable fields
  const allowed = [
    "name", "tagline", "description", "category",
    "address", "area", "pincode", "phone", "email",
    "website", "cover_image", "gallery_images",
    "amenities", "working_hours", "is_active",
    "instagram", "social_links", "cancellation_policy",
    "starting_price", "lat", "lng",
  ];

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  const { data: salon, error } = await supabase
    .from("salons")
    .update(updates)
    .eq("id", existing.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ salon, message: "Salon updated successfully" });
}
