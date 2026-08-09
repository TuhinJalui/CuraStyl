import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

async function getAuthenticatedClient() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, title, language, messages, preview, pinned } = body || {};
    const { supabase, user } = await getAuthenticatedClient();

    const row: any = {
      user_id: user?.id || null,
      session_id: sessionId || null,
      title: title || (Array.isArray(messages) && messages.find((m:any)=>m.role==='user')?.content?.slice(0,120)) || 'Chat',
      language: language || null,
      messages: messages || [],
      preview: preview || (Array.isArray(messages) ? messages[messages.length-1]?.content : null) || null,
      pinned: !!pinned,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from('ai_conversations').insert([row]).select('*').limit(1);
    if (error) {
      console.error('Conversations insert failed:', error.message || error);
      return NextResponse.json({ ok: false, error: error.message || String(error) }, { status: 500 });
    }
    return NextResponse.json({ ok: true, data: data?.[0] ?? null });
  } catch (err: any) {
    console.error('Conversations POST error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, sessionId, title, language, messages, preview, pinned } = body || {};
    const { supabase, user } = await getAuthenticatedClient();

    if (!id) {
      return NextResponse.json({ ok: false, error: 'Conversation ID is required' }, { status: 400 });
    }

    const row: any = {
      user_id: user?.id || null,
      session_id: sessionId || null,
      title: title || (Array.isArray(messages) && messages.find((m:any)=>m.role==='user')?.content?.slice(0,120)) || 'Chat',
      language: language || null,
      messages: messages || [],
      preview: preview || (Array.isArray(messages) ? messages[messages.length-1]?.content : null) || null,
      pinned: !!pinned,
      updated_at: new Date().toISOString(),
    };

    let q = supabase.from('ai_conversations').update(row).eq('id', id).select('*').limit(1);
    if (user?.id) {
      q = q.eq('user_id', user.id);
    }

    const { data, error } = await q;
    if (error) {
      console.error('Conversations update failed:', error.message || error);
      return NextResponse.json({ ok: false, error: error.message || String(error) }, { status: 500 });
    }
    return NextResponse.json({ ok: true, data: data?.[0] ?? null });
  } catch (err: any) {
    console.error('Conversations PUT error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get('sessionId');
    const limit = Number(url.searchParams.get('limit') || 50);
    const { supabase, user } = await getAuthenticatedClient();

    let q = supabase.from('ai_conversations').select('*').order('updated_at', { ascending: false }).limit(limit);
    if (user?.id) {
      q = q.eq('user_id', user.id);
    } else if (sessionId) {
      q = q.eq('session_id', sessionId);
    } else {
      return NextResponse.json({ ok: true, data: [] });
    }

    const { data, error } = await q;
    if (error) return NextResponse.json({ ok: false, error: error.message || String(error) }, { status: 500 });
    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    console.error('Conversations GET error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    const { supabase, user } = await getAuthenticatedClient();

    if (!id) {
      return NextResponse.json({ ok: false, error: 'Conversation ID is required' }, { status: 400 });
    }

    let q = supabase.from('ai_conversations').delete().eq('id', id);
    if (user?.id) {
      q = q.eq('user_id', user.id);
    }

    const { error } = await q;
    if (error) return NextResponse.json({ ok: false, error: error.message || String(error) }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Conversations DELETE error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}