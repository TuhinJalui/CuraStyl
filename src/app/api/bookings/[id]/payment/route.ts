import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

async function getSupabase() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)!;

  return createServerClient(
    url,
    anonKey,
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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: bookingId } = await params;
  const supabase = await getSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { status, paymentId } = await req.json();

  // 1. Fetch the booking to get its internal uuid id, final_amount, and payment_method
  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select("id, final_amount, payment_method")
    .eq("booking_id", bookingId)
    .single();

  if (fetchError || !booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  // 2. Update booking payment status
  const { error: updateError } = await supabase
    .from("bookings")
    .update({
      payment_status: status === "paid" ? "paid" : "failed",
      updated_at: new Date().toISOString(),
    })
    .eq("booking_id", bookingId)
    .eq("user_id", user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // 3. Insert payment record into public.payments
  const { error: paymentInsertError } = await supabase
    .from("payments")
    .insert({
      booking_id: booking.id,
      user_id: user.id,
      amount: booking.final_amount,
      currency: "INR",
      payment_method: booking.payment_method || "upi",
      payment_provider: "simulated",
      provider_id: paymentId || `pay_${Date.now()}`,
      status: status === "paid" ? "success" : "failed",
    });

  if (paymentInsertError) {
    console.error("Failed to insert payment record:", paymentInsertError);
  }

  return NextResponse.json({ success: true });
}
