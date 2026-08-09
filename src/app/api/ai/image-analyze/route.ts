import { NextRequest, NextResponse } from 'next/server';
import { generateWithImage } from '@/lib/ai/gemini-client';

/**
 * POST /api/ai/image-analyze
 * Body: { image: dataUrlBase64, purpose?: 'face'|'hair'|'general' }
 * Returns structured JSON analysis extracted from Gemini vision model
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image, purpose = 'general' } = body as { image?: string; purpose?: string };

    if (!image || typeof image !== 'string') {
      return NextResponse.json({ error: 'Image (data URL) required' }, { status: 400 });
    }

    // Strip data URL header
    const imageBase64 = image.replace(/^data:image\/\w+;base64,/, '');
    const mimeType = image.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/jpeg';

    const prompt = `You are GlamAI, an expert beauty assistant. Analyze the provided image (headshot or portrait) and return ONLY a JSON object with the following fields:\n\n{
  "gender": "male|female|unknown",
  "faceShape": "oval|round|square|heart|diamond|long|unknown",
  "skinTone": "light|medium|tan|deep|unknown",
  "eyeColor": "brown|black|blue|green|unknown",
  "hairColor": "#hex or color name or unknown",
  "hairTexture": "straight|wavy|curly|coily|unknown",
  "hairLength": "short|medium|long|unknown",
  "confidence": { "gender": 0.0, "face": 0.0, "hair": 0.0 },
  "notes": ["short human-readable recommendations"],
  "suggestedStyles": [ { "id": "", "name": "", "reason": "" } ]
}\n\nIMPORTANT: Always detect and include the "gender" field (male/female/unknown) based on facial features, hairstyle, and overall appearance. This is critical for providing appropriate style recommendations.\n\nDo not include any other text, explanation, or markdown. If you cannot determine a value, use \"unknown\". Provide numeric confidences between 0 and 1.`;

    const reply = await generateWithImage('gemini-1.5-flash', prompt, { inlineData: { data: imageBase64, mimeType } }, { maxRetries: 3, temperature: 0.2 });

    // Try to extract JSON block from response
    const jsonMatch = reply.match(/\{[\s\S]*\}/);
    let parsed: any = null;
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch (err) {
        // parsing failed; return raw
        console.warn('Failed to parse image analysis JSON:', err);
      }
    }

    return NextResponse.json({ analysis: parsed, raw: reply });
  } catch (error: any) {
    console.error('Image analyze error:', error);
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 });
  }
}
