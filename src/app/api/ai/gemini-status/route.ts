import { NextResponse } from "next/server";
import { getKeyStatus, discoverSupportedModel } from '@/lib/ai/gemini-client';

export async function GET() {
  try {
    const status = getKeyStatus();

    // Attempt a light-weight model discovery (best-effort)
    let supportedModel: string | null = null;
    try {
      supportedModel = await discoverSupportedModel();
    } catch (err) {
      // discovery may fail if keys are invalid or network issues; ignore
    }

    return NextResponse.json({ ok: true, status, supportedModel });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || String(error) }, { status: 500 });
  }
}
