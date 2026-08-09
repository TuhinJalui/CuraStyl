import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server-helpers";

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

// GET /api/salon-owner/bookings - Fetch all bookings for the salon owner's salon
export async function GET(req: NextRequest) {
  try {
    const supabase = await getSupabase();

    // 1. Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // 2. Get salon owned by this user
    const { data: salon, error: salonError } = await supabase
      .from("salons")
      .select("id, name")
      .eq("owner_id", user.id)
      .single();

    if (salonError || !salon) {
      return NextResponse.json({ error: "No salon found for this owner" }, { status: 404 });
    }

    // 3. Query bookings for this salon using the service client to bypass profile RLS
    const serviceSupabase = createServiceClient();
    const { data: bookings, error: bookingsError } = await serviceSupabase
      .from("bookings")
      .select(`
        *,
        user:profiles(id, full_name, email, phone, avatar_url),
        service:services(id, name, category, duration),
        staff:staff(id, name, role)
      `)
      .eq("salon_id", salon.id)
      .order("booking_date", { ascending: false })
      .order("time_slot", { ascending: false })
      .limit(200);

    if (bookingsError) {
      return NextResponse.json({ error: bookingsError.message }, { status: 500 });
    }

    return NextResponse.json({ bookings: bookings || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
