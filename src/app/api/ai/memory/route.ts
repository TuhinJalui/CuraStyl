import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const { userId, sessionId, memory } = await req.json();

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
      return NextResponse.json({ ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 501 });
    }

    const supabase = createClient(url, serviceKey);

    const row: any = {
      user_id: userId || null,
      session_id: sessionId || null,
      memory,
      updated_at: new Date().toISOString(),
    };

    if (userId) {
      // Upsert by user_id when possible
      const { data, error } = await supabase.from('ai_memory').upsert([row], { onConflict: 'user_id' });
      if (error) {
        console.error('Memory upsert failed:', error.message || error);
        return NextResponse.json({ ok: false, error: error.message || String(error) }, { status: 500 });
      }
      return NextResponse.json({ ok: true, data });
    }

    // If no userId, insert a new memory record for the session
    const { data, error } = await supabase.from('ai_memory').insert([row]);
    if (error) {
      console.error('Memory insert failed:', error.message || error);
      return NextResponse.json({ ok: false, error: error.message || String(error) }, { status: 500 });
    }
    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    console.error('Memory route error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const urlObj = new URL(req.url);
    const userId = urlObj.searchParams.get('userId');
    const sessionId = urlObj.searchParams.get('sessionId');

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) return NextResponse.json({ ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 501 });

    const supabase = createClient(url, serviceKey);

    let query = supabase.from('ai_memory').select('user_id,session_id,memory,updated_at').order('updated_at', { ascending: false }).limit(1);
    if (userId) query = query.eq('user_id', userId);
    else if (sessionId) query = query.eq('session_id', sessionId);
    else return NextResponse.json({ ok: false, error: 'userId or sessionId required' }, { status: 400 });

    const { data, error } = await query;
    if (error) return NextResponse.json({ ok: false, error: error.message || String(error) }, { status: 500 });
    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    console.error('Memory GET error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
