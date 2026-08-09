import { NextRequest, NextResponse } from 'next/server';

// Allowed origins to prevent open-proxy abuse
const ALLOWED_HOSTS_BLOCKLIST = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
];

/**
 * GET /api/ai/image-proxy?url=<encoded-image-url>
 *
 * Proxies an external image through the Next.js server so the browser
 * can display it without being blocked by hotlink / Referer restrictions
 * on 3rd-party image hosts (e.g. DuckDuckGo image results).
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawUrl = searchParams.get('url');

    if (!rawUrl) {
      return new NextResponse('Missing url parameter', { status: 400 });
    }

    // Decode and validate URL
    let targetUrl: URL;
    try {
      targetUrl = new URL(decodeURIComponent(rawUrl));
    } catch {
      return new NextResponse('Invalid url parameter', { status: 400 });
    }

    // Only proxy http/https URLs
    if (targetUrl.protocol !== 'http:' && targetUrl.protocol !== 'https:') {
      return new NextResponse('Only http/https URLs are allowed', { status: 400 });
    }

    // Block SSRF to localhost / private ranges
    if (ALLOWED_HOSTS_BLOCKLIST.some((h) => targetUrl.hostname.includes(h))) {
      return new NextResponse('Blocked hostname', { status: 403 });
    }

    // Fetch the image server-side with browser-like headers to bypass hotlink protection
    const response = await fetch(targetUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': `${targetUrl.protocol}//${targetUrl.host}/`,
        'Sec-Fetch-Dest': 'image',
        'Sec-Fetch-Mode': 'no-cors',
        'Sec-Fetch-Site': 'cross-site',
      },
    });

    if (!response.ok) {
      console.warn(`[Image Proxy] Upstream failed: ${response.status} for ${targetUrl.hostname}`);
      return new NextResponse('Failed to fetch image', { status: 502 });
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';

    // Only stream image content types
    if (!contentType.startsWith('image/') && !contentType.startsWith('application/octet-stream')) {
      return new NextResponse('Upstream did not return an image', { status: 502 });
    }

    const imageData = await response.arrayBuffer();

    return new NextResponse(imageData, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800', // cache 1 day
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: any) {
    console.error('[Image Proxy] Error:', err?.message || err);
    return new NextResponse('Internal proxy error', { status: 500 });
  }
}
