import { NextRequest, NextResponse } from "next/server";

// Returns available time slots for a given salon, date, and service
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const serviceId = searchParams.get("serviceId");

  if (!date) {
    return NextResponse.json({ error: "date is required" }, { status: 400 });
  }

  // In production, query Supabase for existing bookings on that date:
  // const { data: existingBookings } = await supabase
  //   .from("bookings")
  //   .select("time_slot")
  //   .eq("salon_id", id)
  //   .eq("booking_date", date)
  //   .neq("status", "cancelled");
  //
  // const bookedSlots = existingBookings.map(b => b.time_slot);

  const allSlots = [
    "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
    "12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM",
    "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM",
    "04:00 PM", "04:30 PM", "05:00 PM", "05:30 PM",
    "06:00 PM", "06:30 PM", "07:00 PM", "07:30 PM",
  ];

  // Simulate some booked slots
  const bookedSlots = new Set(["11:00 AM", "12:00 PM", "01:30 PM", "03:00 PM", "05:30 PM"]);

  const slots = allSlots.map((time) => ({
    time,
    is_available: !bookedSlots.has(time),
  }));

  return NextResponse.json({ salonId: id, date, serviceId, slots });
}
