import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server-helpers";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const area = searchParams.get("area");
  const service = searchParams.get("service");
  const category = searchParams.get("category");
  const sort = searchParams.get("sort") ?? "recommended";
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");
  const minRating = searchParams.get("minRating");
  const query = searchParams.get("query");
  const limit = searchParams.get("limit");

  try {
    const supabase = createServiceClient();

    let q = supabase
      .from("salons")
      .select("*")
      .eq("is_active", true);

    // Text search across name and area
    if (query) {
      q = q.or(`name.ilike.%${query}%,area.ilike.%${query}%,description.ilike.%${query}%`);
    }

    // Area filter - use ilike for partial matching (e.g., "Bandra" matches "Bandra West")
    if (area) q = q.ilike("area", `%${area}%`);
    if (category) q = q.eq("category", category);
    if (minPrice) q = q.gte("starting_price", Number(minPrice));
    if (maxPrice) q = q.lte("starting_price", Number(maxPrice));
    if (minRating) q = q.gte("rating", Number(minRating));

    // Service filter - check if salon name or amenities contain the service
    // This is a flexible search for service-related keywords
    if (service) {
      q = q.or(`amenities.cs.{${service}},name.ilike.%${service}%,description.ilike.%${service}%`);
    }

    // Sorting
    switch (sort) {
      case "rating":
        q = q.order("rating", { ascending: false });
        break;
      case "price_low":
        q = q.order("starting_price", { ascending: true });
        break;
      case "price_high":
        q = q.order("starting_price", { ascending: false });
        break;
      default:
        // recommended = weighted score (rating × review_count)
        q = q.order("review_count", { ascending: false }).order("rating", { ascending: false });
    }

    if (limit) q = q.limit(Number(limit));

    const { data, error } = await q;

    if (error) {
      console.error("[/api/salons] Supabase error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      salons: data ?? [],
      total: data?.length ?? 0,
      page: 1,
      pageSize: data?.length ?? 0,
    });
  } catch (err) {
    console.error("[/api/salons] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
