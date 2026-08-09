/**
 * Beauty Compatibility Scoring API Route
 * 
 * Server-side endpoint for scoring hairstyle compatibility using OpenAI API.
 * This route handles API key security and provides a clean interface for the client.
 * 
 * @see Requirements: 4.2, 4.3, 7.7
 */

import { NextRequest, NextResponse } from 'next/server';
import { CompatibilityScoringEngine } from '@/lib/ai-beauty/compatibility-scoring';
import { getKeyStatus } from '@/lib/ai/gemini-client';
import type { FaceAnalysisData, HairAnalysisData } from '@/lib/ai-beauty/types';
import type { HairstyleAsset } from '@/lib/ai-beauty/ar-overlay-renderer';

/**
 * POST /api/ai/beauty-score
 * 
 * Score hairstyle compatibility for given face and hair analysis
 * 
 * Request body:
 * {
 *   faceAnalysis: FaceAnalysisData,
 *   hairAnalysis: HairAnalysisData,
 *   styles: HairstyleAsset[]
 * }
 * 
 * Response:
 * {
 *   scores: StyleCompatibilityScore[],
 *   cached: boolean,
 *   duration: number
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { faceAnalysis, hairAnalysis, styles } = body as {
      faceAnalysis: FaceAnalysisData;
      hairAnalysis: HairAnalysisData;
      styles: HairstyleAsset[];
    };

    // Validate required fields
    if (!faceAnalysis || !hairAnalysis || !styles || !Array.isArray(styles)) {
      return NextResponse.json(
        { error: 'Missing required fields: faceAnalysis, hairAnalysis, styles' },
        { status: 400 }
      );
    }

    // Prefer Gemini API keys for scoring; if none configured, return fallback
    const hasGeminiKey = !!(
      process.env.GEMINI_API_KEY_1 || process.env.GEMINI_API_KEY_2 || process.env.GEMINI_API_KEY_3 ||
      process.env.GEMINI_API_KEY_4 || process.env.GEMINI_API_KEY_5 || process.env.GEMINI_API_KEY_6 ||
      process.env.GEMINI_API_KEY_7 || process.env.GEMINI_API_KEY_8 || process.env.GEMINI_API_KEY_9 ||
      process.env.GEMINI_API_KEY_10
    );

    if (!hasGeminiKey) {
      console.warn('No Gemini API key configured — using fallback scoring');
      // Fall back to rule-based scoring without calling external API
      const scoringEngine = new CompatibilityScoringEngine({ enableCache: true, maxConcurrent: 3 });
      const scores = await scoringEngine.scoreMultipleStyles(faceAnalysis, hairAnalysis, styles as HairstyleAsset[]);

      return NextResponse.json({ scores, cached: false, duration: 0, fallback: true });
    }

    const startTime = Date.now();

    // Initialize scoring engine (uses Gemini client internally)
    const scoringEngine = new CompatibilityScoringEngine({
      model: 'gemini-1.5-flash',
      enableCache: true,
      maxConcurrent: 3,
    });

    // Score all styles
    const scores = await scoringEngine.scoreMultipleStyles(
      faceAnalysis,
      hairAnalysis,
      styles
    );

    const duration = Date.now() - startTime;
    const cacheSize = scoringEngine.getCacheSize();

    return NextResponse.json({
      scores,
      cached: cacheSize > 0,
      duration,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Beauty scoring error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to score hairstyle compatibility',
        message: error instanceof Error ? error.message : 'Unknown error',
        fallback: true
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/beauty-score
 * 
 * Health check endpoint
 */
export async function GET() {
  const status = getKeyStatus();
  const geminiConfigured = !!(status?.totalKeys && status.totalKeys > 0);

  return NextResponse.json({
    status: 'ok',
    service: 'beauty-compatibility-scoring',
    geminiConfigured,
    timestamp: new Date().toISOString(),
  });
}
