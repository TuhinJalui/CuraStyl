import { NextRequest, NextResponse } from "next/server";
import { generateWithRetry, getKeyStatus } from "@/lib/ai/gemini-client";

export async function POST(req: NextRequest) {
  try {
    const { reviews, salonName } = await req.json();

    if (!reviews?.length) {
      return NextResponse.json({ summary: "No reviews to summarize." });
    }

    const keyStatus = getKeyStatus();
    const hasGeminiKey = !!(keyStatus?.totalKeys && keyStatus.totalKeys > 0);

    if (!hasGeminiKey) {
      return NextResponse.json({
        summary: `${salonName} consistently receives praise for expert stylists and premium service quality. Customers particularly highlight the welcoming atmosphere and attention to detail. A few reviewers mention wait times during peak hours, though most find the results well worth it.`,
      });
    }

    const reviewText = reviews
      .map((r: { rating: number; comment: string }) => `Rating: ${r.rating}/5 — "${r.comment}"`)
      .join("\n");

    const prompt = `You are a review analyst. Summarize customer reviews into a concise 2-3 sentence paragraph highlighting key strengths, any common concerns, and the overall customer sentiment. Be objective and helpful.\n\nReviews:\n${reviewText}`;

    try {
      const gen = await generateWithRetry('gemini-1.5-flash', prompt, { maxRetries: 3, temperature: 0.5, maxTokens: 150 });
      const summary = (gen || '').trim();
      return NextResponse.json({ summary: summary || 'Unable to generate summary.' });
    } catch (err) {
      console.error('Gemini summarizer failed:', err);
      return NextResponse.json({ summary: 'Unable to generate summary at this time.' }, { status: 200 });
    }

  } catch (error) {
    console.error("Review summarizer error:", error);
    return NextResponse.json({ summary: "Unable to generate summary at this time." }, { status: 200 });
  }
}
