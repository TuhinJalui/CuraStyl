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

// GET /api/reviews?salonId=xxx&cursor=xxx&sort=recent|helpful|highest
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const salonId = searchParams.get("salonId");
  const cursor = searchParams.get("cursor");
  const sort = searchParams.get("sort") ?? "recent";
  const limit = 10;

  if (!salonId) {
    return NextResponse.json({ error: "salonId required" }, { status: 400 });
  }

  const supabase = await getSupabase();

  let query = supabase
    .from("reviews")
    .select("*, user:profiles(id, full_name, avatar_url)")
    .eq("salon_id", salonId);

  // Sorting
  if (sort === "helpful") {
    query = query.order("helpful_count", { ascending: false });
  } else if (sort === "highest") {
    query = query.order("rating", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  // Cursor-based pagination
  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  query = query.limit(limit);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const nextCursor = data && data.length === limit
    ? data[data.length - 1].created_at
    : null;

  // Get rating distribution
  const { data: distData } = await supabase
    .from("reviews")
    .select("rating")
    .eq("salon_id", salonId);

  const distribution = [0, 0, 0, 0, 0]; // index 0 = 1 star, index 4 = 5 stars
  if (distData) {
    distData.forEach((r: { rating: number }) => {
      if (r.rating >= 1 && r.rating <= 5) {
        distribution[r.rating - 1]++;
      }
    });
  }

  return NextResponse.json({
    reviews: data ?? [],
    nextCursor,
    distribution,
    total: distData?.length ?? 0,
  });
}

// POST /api/reviews
export async function POST(req: NextRequest) {
  const supabase = await getSupabase();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = await req.json();
  const { salon_id, booking_id, rating, comment } = body;

  // Validate
  if (!salon_id || !rating || !comment) {
    return NextResponse.json({ error: "salon_id, rating, and comment are required" }, { status: 400 });
  }

  if (rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
  }

  if (comment.length < 20) {
    return NextResponse.json({ error: "Review must be at least 20 characters" }, { status: 400 });
  }

  if (comment.length > 500) {
    return NextResponse.json({ error: "Review must be under 500 characters" }, { status: 400 });
  }

  // If booking_id provided, verify user owns that booking and it's completed
  if (booking_id) {
    const { data: booking } = await supabase
      .from("bookings")
      .select("id, user_id, status, salon_id")
      .eq("id", booking_id)
      .single();

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.user_id !== user.id) {
      return NextResponse.json({ error: "Not your booking" }, { status: 403 });
    }

    if (booking.status !== "completed") {
      return NextResponse.json({ error: "Can only review completed bookings" }, { status: 400 });
    }

    if (booking.salon_id !== salon_id) {
      return NextResponse.json({ error: "Booking does not match salon" }, { status: 400 });
    }

    // Check if already reviewed
    const { data: existing } = await supabase
      .from("reviews")
      .select("id")
      .eq("booking_id", booking_id)
      .single();

    if (existing) {
      return NextResponse.json({ error: "You already reviewed this booking" }, { status: 409 });
    }
  }

  // Create review
  const { data: review, error } = await supabase
    .from("reviews")
    .insert({
      user_id: user.id,
      salon_id,
      booking_id: booking_id ?? null,
      rating,
      comment,
      is_verified: !!booking_id,
    })
    .select("*, user:profiles(id, full_name, avatar_url)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get salon owner info to send notification
  const { data: salon } = await supabase
    .from("salons")
    .select("owner_id, name")
    .eq("id", salon_id)
    .single();

  // Send notification to salon owner about the new review
  if (salon && salon.owner_id) {
    const { data: userProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const customerName = userProfile?.full_name ?? "A customer";
    const stars = "⭐".repeat(rating);
    
    await supabase.from("notifications").insert({
      user_id: salon.owner_id,
      type: "new_review",
      title: `New ${rating}-Star Review!`,
      message: `${customerName} left a ${rating}-star review ${stars} for ${salon.name}: "${comment.substring(0, 80)}${comment.length > 80 ? "..." : ""}"`,
      link: `/salon-owner/dashboard?tab=reviews`,
    });
  }

  return NextResponse.json({ review }, { status: 201 });
}

// PATCH /api/reviews — for helpful votes
export async function PATCH(req: NextRequest) {
  const supabase = await getSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { review_id } = await req.json();
  if (!review_id) {
    return NextResponse.json({ error: "review_id required" }, { status: 400 });
  }

  // Increment helpful count
  const { error } = await supabase.rpc("increment_helpful_count", {
    rid: review_id,
  });

  // If the RPC doesn't exist yet, fall back to manual increment
  if (error) {
    const { data: review } = await supabase
      .from("reviews")
      .select("helpful_count")
      .eq("id", review_id)
      .single();

    if (review) {
      await supabase
        .from("reviews")
        .update({ helpful_count: (review.helpful_count ?? 0) + 1 })
        .eq("id", review_id);
    }
  }

  return NextResponse.json({ success: true });
}
