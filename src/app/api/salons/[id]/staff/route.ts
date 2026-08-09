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
  const { data } = await supabase.from("salons").select("owner_id").eq("id", salonId).single();
  return data?.owner_id === userId;
}

// GET /api/salons/[id]/staff
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await getSupabase();

  const { data, error } = await supabase
    .from("staff")
    .select("*")
    .eq("salon_id", id)
    .eq("is_active", true)
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ staff: data ?? [] });
}

// POST /api/salons/[id]/staff
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
  const { name, role, specialization, experience_years } = body;

  if (!name || !role) {
    return NextResponse.json({ error: "name and role required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("staff")
    .insert({
      salon_id: id,
      name,
      role,
      specialization: specialization ?? [],
      experience_years: experience_years ?? 0,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ staff: data }, { status: 201 });
}

// DELETE /api/salons/[id]/staff
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

  const { staffId } = await req.json();
  if (!staffId) return NextResponse.json({ error: "staffId required" }, { status: 400 });

  const { error } = await supabase
    .from("staff")
    .update({ is_active: false })
    .eq("id", staffId)
    .eq("salon_id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
