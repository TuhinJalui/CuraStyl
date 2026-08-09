/**
 * /api/ai/images
 *
 * Dedicated image-search endpoint. Completely independent of the chat/text endpoint.
 *
 * Architecture:
 *  - Accepts: { query, intentType, gender }
 *  - Runs keyword chain: tries Pexels with progressively simpler terms
 *  - Returns: { images: ImageResult[], usedKeywords: string }
 *  - Never returns a 500 to the client — always returns { images: [] } on error
 *
 * Retry logic:
 *  primary keywords → simplified keywords → single noun → generic fallback
 *  Each step is only attempted if the previous returned 0 results.
 */

import { NextRequest, NextResponse } from 'next/server';
import { searchPexels, type ImageResult } from '@/lib/ai/image-sources';
import { buildKeywordChain, type IntentType } from '@/lib/ai/keyword-extractor';

const IMAGE_LIMIT = 8;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query: string       = typeof body.query      === 'string' ? body.query.trim()    : '';
    const intentType          = (body.intentType       ?? 'beauty_general') as IntentType;
    const gender              = (body.gender           ?? null)             as 'male' | 'female' | null;

    if (!query) {
      return NextResponse.json({ images: [], usedKeywords: '' });
    }

    const keywordChain = buildKeywordChain(query, intentType, gender);
    let images: ImageResult[] = [];
    let usedKeywords = '';

    // Walk through keyword chain — stop as soon as we get results
    for (const keywords of keywordChain) {
      console.log(`[Images API] Trying: "${keywords}"`);
      images = await searchPexels(keywords, IMAGE_LIMIT);

      if (images.length > 0) {
        usedKeywords = keywords;
        console.log(`[Images API] ✓ ${images.length} images for "${keywords}"`);
        break;
      }

      console.log(`[Images API] ✗ No results for "${keywords}", trying next…`);
    }

    return NextResponse.json({ images, usedKeywords });

  } catch (err: any) {
    // Never crash — the client must always get a usable response
    console.error('[Images API] Unexpected error:', err?.message ?? err);
    return NextResponse.json({ images: [], usedKeywords: '' });
  }
}
