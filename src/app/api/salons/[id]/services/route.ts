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

async function verifySalonOwner(supabase: ReturnType<typeof createServerClient>, salonId: string, userId: string) {
  const { data } = await supabase
    .from("salons")
    .select("id, owner_id")
    .eq("id", salonId)
    .single();
  return data?.owner_id === userId;
}

// GET /api/salons/[id]/services
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await getSupabase();

  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("salon_id", id)
    .order("category")
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ services: data ?? [] });
}

// POST /api/salons/[id]/services — add service
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await getSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Auth required" }, { status: 401 });

  if (!(await verifySalonOwner(supabase, id, user.id))) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await req.json();
  const { name, description, category, price, duration } = body;

  if (!name || !category || !price || !duration) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("services")
    .insert({ salon_id: id, name, description, category, price, duration })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ service: data }, { status: 201 });
}

// PUT /api/salons/[id]/services — update service
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await getSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Auth required" }, { status: 401 });

  if (!(await verifySalonOwner(supabase, id, user.id))) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await req.json();
  const { serviceId, ...updates } = body;

  if (!serviceId) return NextResponse.json({ error: "serviceId required" }, { status: 400 });

  const { data, error } = await supabase
    .from("services")
    .update(updates)
    .eq("id", serviceId)
    .eq("salon_id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ service: data });
}

// DELETE /api/salons/[id]/services — soft-delete service
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await getSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Auth required" }, { status: 401 });

  if (!(await verifySalonOwner(supabase, id, user.id))) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { serviceId } = await req.json();
  if (!serviceId) return NextResponse.json({ error: "serviceId required" }, { status: 400 });

  const { error } = await supabase
    .from("services")
    .update({ is_active: false })
    .eq("id", serviceId)
    .eq("salon_id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
