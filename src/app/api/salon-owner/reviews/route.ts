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

// GET /api/salon-owner/reviews - Get all reviews for salon owner's salon
export async function GET(req: NextRequest) {
  const supabase = await getSupabase();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  // Get salon owned by this user
  const { data: salon } = await supabase
    .from("salons")
    .select("id, name")
    .eq("owner_id", user.id)
    .single();

  if (!salon) {
    return NextResponse.json({ error: "No salon found" }, { status: 404 });
  }

  // Get all reviews for this salon with user details
  const serviceSupabase = createServiceClient();
  const { data: reviews, error } = await serviceSupabase
    .from("reviews")
    .select(`
      *,
      user:profiles(id, full_name, avatar_url)
    `)
    .eq("salon_id", salon.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Calculate statistics
  const totalReviews = reviews?.length || 0;
  const distribution = [0, 0, 0, 0, 0]; // 1-5 stars
  let totalRating = 0;

  reviews?.forEach((review) => {
    if (review.rating >= 1 && review.rating <= 5) {
      distribution[review.rating - 1]++;
      totalRating += review.rating;
    }
  });

  const averageRating = totalReviews > 0 ? (totalRating / totalReviews).toFixed(1) : "0";

  return NextResponse.json({
    reviews: reviews || [],
    statistics: {
      total: totalReviews,
      average: parseFloat(averageRating),
      distribution,
    },
    salonName: salon.name,
  });
}
