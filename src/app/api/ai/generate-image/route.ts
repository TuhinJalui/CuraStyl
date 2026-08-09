import { NextRequest, NextResponse } from 'next/server';
import { generateWithRetry } from '@/lib/ai/gemini-client';

export async function POST(req: NextRequest) {
  try {
    const { prompt, count = 1 } = await req.json();
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt required' }, { status: 400 });
    }

    // Best-effort: try to call Gemini image generation (may not be available)
    try {
      const model = 'gemini-image-alpha';
      const result = await generateWithRetry(model, `Generate ${count} image(s) for: ${prompt}`, { maxRetries: 3, temperature: 0.8 });
      // If model returns URLs or base64, try to extract them
      const urls: string[] = [];
      const mdImgs = result.match(/!\[[^\]]*\]\((https?:\/\/[^)]+)\)/g);
      if (mdImgs) {
        mdImgs.forEach((m) => {
          const u = m.match(/\((https?:\/\/[^)]+)\)/);
          if (u && u[1]) urls.push(u[1]);
        });
      }

      // Fallback: look for plain URLs
      const urlMatches = result.match(/https?:\/\/[^\s"'<>]+(?:png|jpe?g|webp|gif)/gi) || [];
      urlMatches.forEach((u) => { if (!urls.includes(u)) urls.push(u); });

      if (urls.length > 0) return NextResponse.json({ images: urls.slice(0, count) });
    } catch (err) {
      // ignore and fallback to placeholders
    }

    // Fallback images from project assets
    const placeholders = [
      '/images/hero/slide1.jpg',
      '/images/hero/slide2.jpg',
      '/images/hero/slide3.jpg',
    ];

    const chosen = [] as string[];
    for (let i = 0; i < count; i++) chosen.push(placeholders[i % placeholders.length]);

    return NextResponse.json({ images: chosen });
  } catch (error: any) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
