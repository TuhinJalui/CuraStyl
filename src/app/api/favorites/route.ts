import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/route-guards";

// GET /api/favorites — get user's favorited salons
export const GET = withAuth(async (req, { user, supabase }) => {
  const { data, error } = await supabase
    .from("favorites")
    .select("id, salon_id, created_at, salon:salons(id, name, slug, cover_image, area, rating, review_count, starting_price, category, is_verified)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    favorites: data ?? [],
    favoriteIds: (data ?? []).map((f: { salon_id: string }) => f.salon_id),
  });
});

// POST /api/favorites — toggle favorite
export const POST = withAuth(async (req, { user, supabase }) => {
  const { salon_id } = await req.json();
  
  if (!salon_id) {
    return NextResponse.json({ error: "salon_id required" }, { status: 400 });
  }

  // Check if already favorited
  const { data: existing } = await supabase
    .from("favorites")
    .select("id")
    .eq("user_id", user.id)
    .eq("salon_id", salon_id)
    .single();

  if (existing) {
    // Remove favorite
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("id", existing.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ action: "removed", salon_id });
  } else {
    // Add favorite
    const { error } = await supabase
      .from("favorites")
      .insert({ user_id: user.id, salon_id });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ action: "added", salon_id });
  }
});
