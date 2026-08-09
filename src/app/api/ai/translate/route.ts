import { NextRequest, NextResponse } from "next/server";
import { generateWithRetry } from "@/lib/ai/gemini-client";

const LANG_NAMES: Record<string, string> = {
  en: "English",
  hi: "Hindi",
  mr: "Marathi",
  gu: "Gujarati",
  bn: "Bengali",
  ta: "Tamil",
  te: "Telugu",
  kn: "Kannada",
  ml: "Malayalam",
  pa: "Punjabi",
  ur: "Urdu",
};

const LIBRE_URL = process.env.LIBRETRANSLATE_URL || "https://libretranslate.de/translate";

async function translateWithLibre(text: string, target: string) {
  const res = await fetch(LIBRE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q: text, source: "auto", target, format: "text" }),
  });
  if (!res.ok) throw new Error(`LibreTranslate error: ${res.status}`);
  const j = await res.json();
  return j.translatedText || j.translated || j.result || j.translation || null;
}

function hasGeminiKey() {
  return !!(
    process.env.GEMINI_API_KEY_1 || process.env.GEMINI_API_KEY_2 || process.env.GEMINI_API_KEY_3 ||
    process.env.GEMINI_API_KEY_4 || process.env.GEMINI_API_KEY_5 || process.env.GEMINI_API_KEY_6 ||
    process.env.GEMINI_API_KEY_7 || process.env.GEMINI_API_KEY_8 || process.env.GEMINI_API_KEY_9 ||
    process.env.GEMINI_API_KEY_10
  );
}

export async function POST(req: NextRequest) {
  try {
    const { messages, targetLanguage } = await req.json();
    if (!messages || !Array.isArray(messages)) return NextResponse.json({ ok: false, error: "messages array required" }, { status: 400 });
    if (!targetLanguage) return NextResponse.json({ ok: false, error: "targetLanguage required" }, { status: 400 });

    const target = targetLanguage;

    // Try LibreTranslate (free) first
    try {
      const translatedMessages = [] as any[];
      for (const m of messages) {
        const translated = await translateWithLibre(m.content || "", target);
        translatedMessages.push({ ...m, content: translated ?? m.content });
      }
      return NextResponse.json({ ok: true, data: translatedMessages });
    } catch (libErr) {
      console.warn('LibreTranslate failed, falling back to Gemini if available', libErr);
    }

    // Fallback: use Gemini to translate if available
    if (!hasGeminiKey()) {
      return NextResponse.json({ ok: false, error: 'Translation failed and no Gemini key available for fallback' }, { status: 500 });
    }

    const langName = LANG_NAMES[targetLanguage] || targetLanguage;
    const convoText = messages.map((m: any) => `${m.role.toUpperCase()}: ${m.content}`).join("\n");
    const prompt = `Translate the following conversation into ${langName}. Preserve roles (user/assistant/system) and return ONLY a valid JSON array (no explanation) where each item is an object with keys: role, content, timestamp (optional). Keep formatting (markdown, links) intact but translate the visible text. Example output:\n[ { "role": "user", "content": "...", "timestamp": "2023-01-01T00:00:00Z" } ]\n\nConversation:\n${convoText}`;

    const reply = await generateWithRetry("gemini-1.5-flash", prompt, { maxTokens: 800, temperature: 0.0 });

    try {
      const jsonBlockMatch = reply.match(/```json\s*([\s\S]*?)\s*```/i);
      let candidate = jsonBlockMatch ? jsonBlockMatch[1] : null;
      if (!candidate) {
        const arrMatch = reply.match(/(\[[\s\S]*\])/);
        candidate = arrMatch ? arrMatch[1] : null;
      }
      if (!candidate) return NextResponse.json({ ok: false, error: 'No JSON array found in translation response', raw: reply }, { status: 500 });

      const cleaned = candidate.replace(/,\s*\]/g, "]").replace(/,\s*\}/g, "}");
      const parsed = JSON.parse(cleaned);
      return NextResponse.json({ ok: true, data: parsed });
    } catch (err: any) {
      console.warn('Translate parse failed:', err);
      return NextResponse.json({ ok: false, error: 'Failed to parse translation result', raw: reply }, { status: 500 });
    }
  } catch (err: any) {
    console.error('Translate route error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
