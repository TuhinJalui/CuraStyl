import { NextResponse } from "next/server";
import { getKeyStatus, discoverSupportedModel, generateWithRetry } from '@/lib/ai/gemini-client';

export async function GET() {
  try {
    const status = getKeyStatus();

    // Attempt a light-weight model discovery (best-effort)
    let supportedModel: string | null = null;
    try {
      supportedModel = await discoverSupportedModel();
    } catch (err) {
      // ignore discovery failure
    }

    // Optional quick ping generation to validate keys
    let providerReply: string | null = null;
    if (status?.totalKeys && status.totalKeys > 0) {
      try {
        providerReply = await generateWithRetry('gemini-1.5-flash', 'Ping', { maxRetries: 2, temperature: 0.0, maxTokens: 4 });
      } catch (err) {
        providerReply = `ping-failed: ${String(err).slice(0, 200)}`;
      }
    }

    return NextResponse.json({ ok: true, provider: 'gemini', status, supportedModel, providerReply });
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error?.message ?? String(error) }, { status: 500 });
  }
}
