import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const events: any[] = Array.isArray(body) ? body : [body];

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
      return NextResponse.json({ ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 501 });
    }

    const supabase = createClient(url, serviceKey);

    const rows = events.map((e: any) => ({
      event_type: e.event || e.type || 'unknown',
      metadata: e.metadata || e,
      created_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase.from('ai_analytics').insert(rows);
    if (error) {
      console.error('Analytics insert failed:', error.message || error);
      return NextResponse.json({ ok: false, error: error.message || String(error) }, { status: 500 });
    }

    return NextResponse.json({ ok: true, inserted: rows.length });
  } catch (err: any) {
    console.error('Analytics route error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, note: 'POST events to this endpoint to store AI analytics in Supabase (requires SUPABASE_SERVICE_ROLE_KEY).' });
}
