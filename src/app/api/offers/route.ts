import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server-helpers";

export async function GET() {
  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .eq("is_active", true)
      .gt("valid_until", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[/api/offers] Supabase error:", error.message);
      return NextResponse.json({ offers: [] });
    }

    return NextResponse.json({ offers: data ?? [] });
  } catch (err) {
    console.error("[/api/offers] Unexpected error:", err);
    return NextResponse.json({ offers: [] });
  }
}
