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

// PATCH /api/bookings/[id] — update booking status
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await getSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = await req.json();
  const { status, cancellation_reason } = body;

  if (!status || !["confirmed", "completed", "cancelled"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  // Get booking to check ownership
  const { data: booking } = await supabase
    .from("bookings")
    .select(`
      id,
      booking_id,
      user_id,
      salon_id,
      status,
      service:services(name),
      salon:salons(name, owner_id)
    `)
    .eq("id", id)
    .single();

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const isBookingOwner = booking.user_id === user.id;
  const salon = booking.salon as any;
  const isSalonOwner = salon?.owner_id === user.id;

  if (!isBookingOwner && !isSalonOwner) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // Customer can only cancel
  if (isBookingOwner && !isSalonOwner && status !== "cancelled") {
    return NextResponse.json({ error: "Customers can only cancel bookings" }, { status: 403 });
  }

  // Can't update already cancelled bookings
  if (booking.status === "cancelled") {
    return NextResponse.json({ error: "Booking is already cancelled" }, { status: 400 });
  }

  const updateData: Record<string, any> = { status };
  if (status === "cancelled" && cancellation_reason) {
    updateData.cancellation_reason = cancellation_reason;
  }
  if (status === "completed") {
    updateData.payment_status = "paid";
    updateData.qr_verified = true;
    updateData.qr_scanned_at = new Date().toISOString();
  }

  const { data: updated, error } = await supabase
    .from("bookings")
    .update(updateData)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Send status update notification
  try {
    const salonName = salon?.name ?? "the salon";
    const serviceName = (booking.service as any)?.name ?? "your service";

    if (status === "completed") {
      await supabase.from("notifications").insert({
        user_id: booking.user_id,
        type: "qr_verified",
        title: "✅ Booking Completed!",
        message: `Your appointment at ${salonName} for ${serviceName} has been completed. Thank you for visiting! 🎉`,
        link: "/dashboard/bookings",
        is_read: false,
      });
    } else if (status === "cancelled") {
      const cancelledBy = isSalonOwner ? "The salon owner" : "You";
      await supabase.from("notifications").insert({
        user_id: booking.user_id,
        type: "no_show_warning",
        title: "❌ Booking Cancelled",
        message: `${cancelledBy} cancelled your booking for ${serviceName} at ${salonName}.${cancellation_reason ? ` Reason: ${cancellation_reason}` : ""}`,
        link: "/dashboard/bookings",
        is_read: false,
      });

      if (isBookingOwner && salon?.owner_id) {
        await supabase.from("notifications").insert({
          user_id: salon.owner_id,
          type: "no_show_warning",
          title: "🚨 Booking Cancelled by Customer",
          message: `Customer cancelled booking ${booking.booking_id} for ${serviceName}.${cancellation_reason ? ` Reason: ${cancellation_reason}` : ""}`,
          link: "/salon-owner/dashboard",
          is_read: false,
        });
      }
    }
  } catch (notifErr) {
    console.error("Failed to send status update notification:", notifErr);
  }

  return NextResponse.json({ booking: updated });
}
