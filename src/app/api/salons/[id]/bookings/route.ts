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

// GET /api/salons/[id]/bookings — salon owner fetches bookings
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await getSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Auth required" }, { status: 401 });

  // Verify salon owner
  const { data: salon } = await supabase
    .from("salons")
    .select("owner_id")
    .eq("id", id)
    .single();

  if (salon?.owner_id !== user.id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const dateFilter = searchParams.get("date"); // "today", "week", or specific date

  let query = supabase
    .from("bookings")
    .select("*, user:profiles(full_name, email, phone), service:services(name, category, price)")
    .eq("salon_id", id)
    .order("booking_date", { ascending: false })
    .order("time_slot", { ascending: true })
    .limit(50);

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  if (dateFilter === "today") {
    const today = new Date().toISOString().split("T")[0];
    query = query.eq("booking_date", today);
  } else if (dateFilter === "week") {
    const today = new Date();
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() + 7);
    query = query.gte("booking_date", today.toISOString().split("T")[0])
                 .lte("booking_date", weekEnd.toISOString().split("T")[0]);
  } else if (dateFilter) {
    query = query.eq("booking_date", dateFilter);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Compute stats
  const all = data ?? [];
  const todayStr = new Date().toISOString().split("T")[0];
  const todayBookings = all.filter((b: { booking_date: string }) => b.booking_date === todayStr);

  const stats = {
    total: all.length,
    todayCount: todayBookings.length,
    todayRevenue: todayBookings
      .filter((b: { status: string }) => b.status !== "cancelled")
      .reduce((sum: number, b: { final_amount: number }) => sum + (b.final_amount ?? 0), 0),
    pending: all.filter((b: { status: string }) => b.status === "pending").length,
    confirmed: all.filter((b: { status: string }) => b.status === "confirmed").length,
    completed: all.filter((b: { status: string }) => b.status === "completed").length,
    cancelled: all.filter((b: { status: string }) => b.status === "cancelled").length,
    totalRevenue: all
      .filter((b: { status: string }) => b.status !== "cancelled")
      .reduce((sum: number, b: { final_amount: number }) => sum + (b.final_amount ?? 0), 0),
  };

  return NextResponse.json({ bookings: all, stats });
}

// PATCH /api/salons/[id]/bookings — update booking status (owner)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await getSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Auth required" }, { status: 401 });

  const { data: salon } = await supabase
    .from("salons")
    .select("owner_id")
    .eq("id", id)
    .single();

  if (salon?.owner_id !== user.id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { bookingId, status } = await req.json();

  if (!bookingId || !status) {
    return NextResponse.json({ error: "bookingId and status required" }, { status: 400 });
  }

  const updateData: Record<string, string> = { status };
  if (status === "completed") {
    updateData.payment_status = "paid";
  }

  const { data, error } = await supabase
    .from("bookings")
    .update(updateData)
    .eq("id", bookingId)
    .eq("salon_id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ booking: data });
}
