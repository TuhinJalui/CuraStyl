/**
 * Image Sources — Pexels Only
 *
 * Single responsibility: fetch images from Pexels API.
 * - Hard 10-second timeout via AbortController
 * - Returns empty array on any failure (no throws)
 * - Caller is responsible for retry / fallback logic
 */

export interface ImageResult {
  url: string;
  alt: string;
}

interface PexelsPhoto {
  src?: {
    large2x?: string;
    large?: string;
    medium?: string;
  };
  alt?: string;
}

/**
 * Search Pexels for the given query.
 * Returns [] when the API key is missing, the request fails, or times out.
 */
export async function searchPexels(query: string, limit = 8): Promise<ImageResult[]> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    console.warn('[Pexels] PEXELS_API_KEY is not configured — skipping image fetch');
    return [];
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  try {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${limit}`;
    const res = await fetch(url, {
      headers: { Authorization: apiKey },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[Pexels] HTTP ${res.status} for "${query}"`);
      return [];
    }

    const data = await res.json();
    const photos: PexelsPhoto[] = data?.photos ?? [];

    return photos
      .map((photo): ImageResult | null => {
        const imageUrl = photo.src?.large2x || photo.src?.large || photo.src?.medium;
        if (!imageUrl) return null;
        return { url: imageUrl, alt: photo.alt || query };
      })
      .filter((item): item is ImageResult => item !== null)
      .slice(0, limit);

  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err?.name === 'AbortError') {
      console.warn(`[Pexels] Request timed out for "${query}"`);
    } else {
      console.error('[Pexels] Unexpected error:', err?.message ?? err);
    }
    return [];
  }
}