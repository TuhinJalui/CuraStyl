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

async function verifyAdmin(supabase: ReturnType<typeof createServerClient>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return profile?.role === "admin" ? user : null;
}

// GET /api/admin/salons — all salons including inactive
export async function GET() {
  const supabase = await getSupabase();
  if (!(await verifyAdmin(supabase))) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("salons")
    .select("*, owner:profiles(full_name, email)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const salons = data ?? [];
  const stats = {
    total: salons.length,
    active: salons.filter((s: { is_active: boolean }) => s.is_active).length,
    verified: salons.filter((s: { is_verified: boolean }) => s.is_verified).length,
    pending: salons.filter((s: { is_active: boolean; is_verified: boolean }) => s.is_active && !s.is_verified).length,
  };

  return NextResponse.json({ salons, stats });
}

// PATCH /api/admin/salons — approve/reject/suspend
export async function PATCH(req: NextRequest) {
  const supabase = await getSupabase();
  if (!(await verifyAdmin(supabase))) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { salonId, action } = await req.json();

  if (!salonId || !action) {
    return NextResponse.json({ error: "salonId and action required" }, { status: 400 });
  }

  let update: Record<string, boolean> = {};
  switch (action) {
    case "approve":
      update = { is_verified: true, is_active: true };
      break;
    case "reject":
      update = { is_verified: false, is_active: false };
      break;
    case "suspend":
      update = { is_active: false };
      break;
    case "activate":
      update = { is_active: true };
      break;
    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("salons")
    .update(update)
    .eq("id", salonId)
    .select("id, name, is_active, is_verified")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ salon: data });
}
