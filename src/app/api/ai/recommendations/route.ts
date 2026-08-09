import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server-helpers";
import { generateWithRetry } from "@/lib/ai/gemini-client";

export async function POST(req: NextRequest) {
  try {
    const { budget, area, service } = await req.json();

    const supabase = createServiceClient();

    // Fetch active salons from Supabase with filters
    let query = supabase
      .from("salons")
      .select("*")
      .eq("is_active", true)
      .order("rating", { ascending: false });

    if (area) query = query.eq("area", area);
    if (budget) query = query.lte("starting_price", Number(budget));

    const { data: allSalons } = await query.limit(20);
    let candidates = allSalons ?? [];

    // Service filter on amenities
    if (service && candidates.length > 0) {
      candidates = candidates.filter((s: any) =>
        s.amenities?.some((a: string) => a.toLowerCase().includes(service.toLowerCase()))
      );
    }

    const top3 = candidates.slice(0, 3);

    // Prefer Gemini keys for AI insight; otherwise return static recommendations
    const hasGeminiKey = !!(
      process.env.GEMINI_API_KEY_1 || process.env.GEMINI_API_KEY_2 || process.env.GEMINI_API_KEY_3 ||
      process.env.GEMINI_API_KEY_4 || process.env.GEMINI_API_KEY_5 || process.env.GEMINI_API_KEY_6 ||
      process.env.GEMINI_API_KEY_7 || process.env.GEMINI_API_KEY_8 || process.env.GEMINI_API_KEY_9 ||
      process.env.GEMINI_API_KEY_10
    );

    let aiInsight: any = null;

    if (hasGeminiKey) {
      const salonDescriptions = top3.map((s) =>
        `${s.name} (${s.area}) - Rating: ${s.rating}, Price from ₹${s.starting_price}, Category: ${s.category}`
      ).join("\n");

      const prompt = `You are a concise salon recommendation expert. Given the user's preferences (budget: ₹${budget || 'any'}, area: ${area || 'any'}, service: ${service || 'general'}) and the following salons:\n${salonDescriptions}\n\nReturn a JSON array of objects with keys {"slug","salonName","reason"} explaining in one short sentence why each salon suits the user. Respond ONLY with valid JSON.`;

      try {
        const gen = await generateWithRetry('gemini-1.5-flash', prompt, { maxRetries: 3, temperature: 0.6 });
        const cleaned = gen.replace(/```json/g, "").replace(/```/g, "").trim();
        try {
          aiInsight = JSON.parse(cleaned);
        } catch (e) {
          // fallback to raw text if JSON parse fails
          aiInsight = cleaned;
        }
      } catch (err) {
        console.warn('Gemini recommendation generation failed:', err);
      }
    }

    return NextResponse.json({
      recommendations: top3.map((s) => ({
        salonId: s.id,
        salonName: s.name,
        slug: s.slug,
        rating: s.rating,
        startingPrice: s.starting_price,
        area: s.area,
        coverImage: s.cover_image,
        reason: `Highly rated salon with ${s.review_count} reviews. Starting from ₹${s.starting_price}.`,
      })),
      aiInsight,
    });

  } catch (error) {
    console.error("Recommendations error:", error);
    return NextResponse.json({ recommendations: [], error: "Failed to generate recommendations" }, { status: 200 });
  }
}
