/**
 * /api/ai/chat — Text Generation Only
 *
 * Architecture:
 *  - Calls Gemini API for natural language text ONLY
 *  - NEVER asks Gemini for JSON, image URLs, or structured data
 *  - NEVER fetches images (that is the /api/ai/images endpoint's job)
 *  - Strips any accidental image URLs / markdown images Gemini outputs
 *  - Parses a single optional <cta> block from the reply
 *  - Returns: { reply: string, cta?: CTAData, intentType: string, gender: string | null }
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateWithRetry } from '@/lib/ai/gemini-client';
import { createServerClient } from '@supabase/ssr';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface CTAData {
  label: string;
  link: string;
  intro?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// System Prompt — plain language only, no JSON instructions
// ─────────────────────────────────────────────────────────────────────────────

const BASE_SYSTEM_PROMPT = `You are AuraAI ✨, an expert beauty advisor for CuraStyl — a premium salon marketplace in Mumbai, India.

Your job:
1. 💅 Help users find the best salons (budget, location, service, rating)
2. 💇 Recommend beauty treatments tailored to their needs
3. 👗 Give beauty tips and styling advice
4. 💍 Help with bridal and event styling queries
5. 🧴 Explain treatments for specific hair/skin types

Available areas: Bandra, Andheri, Powai, Juhu, Versova, Malad, Borivali, Dadar, Worli, Lower Parel, Colaba, Santacruz, Vile Parle, Chembur.
Services: Haircut, Hair Color, Facial, Makeup, Spa, Manicure, Pedicure, Waxing, Threading, Massage, Bridal Package, Hair Treatment, Nail Art.

RESPONSE RULES:
- Write in friendly, natural language only — NO JSON, NO HTML, NO code blocks
- If the user mentions "women/female/girl" → give women's recommendations immediately
- If the user mentions "men/male/guy/barber" → give men's recommendations immediately
- Only ask for gender if the query has absolutely zero gender indication
- Give concrete, specific recommendations — no excessive follow-up questions
- For salons: include name, area, rating, price range, and a booking link like [Book at Salon Name](/salons/salon-slug)
- Use emojis naturally (💇‍♀️ hair, 💄 makeup, 🧴 skincare, 💅 nails, 👰 bridal, 📍 salon)
- Keep responses concise and helpful — avoid walls of text
- IMPORTANT: Never output image URLs, never output markdown image syntax like ![...](...), never output JSON`;

// ─────────────────────────────────────────────────────────────────────────────
// Gender & Intent detection (server-side, for CTA URL only)
// ─────────────────────────────────────────────────────────────────────────────

const MALE_RE   = /\bmen\b|\bmale\b|\bman\b|\bboy\b|\bguy\b|\bbeard\b|\bmustache\b|\bbarber\b/i;
const FEMALE_RE = /\bwomen\b|\bfemale\b|\bwoman\b|\bgirl\b|\blady\b|\bladies\b/i;

const HAIRSTYLE_RE = /hair(cut|style|color)?|haircut|bob|pixie|fade|undercut|bangs|braid|layers|curly|wavy/i;
const MAKEUP_RE    = /makeup|lipstick|foundation|eyeshadow|contour|blush|eyeliner|mascara/i;
const SKINCARE_RE  = /skin(care)?|acne|pimple|facial|glow|dark circle|wrinkle|moistur|sunscreen/i;
const SALON_RE     = /\bsalon\b|beauty parlou?r|spa\b/i;

type IntentType = 'hairstyle' | 'makeup' | 'skincare' | 'salon_search' | 'general';

function detectGender(text: string, imageGender?: 'male' | 'female' | null): 'male' | 'female' | null {
  if (imageGender === 'male')   return 'male';
  if (imageGender === 'female') return 'female';
  if (MALE_RE.test(text))       return 'male';
  if (FEMALE_RE.test(text))     return 'female';
  return null;
}

function detectIntent(text: string): IntentType {
  if (HAIRSTYLE_RE.test(text)) return 'hairstyle';
  if (MAKEUP_RE.test(text))    return 'makeup';
  if (SKINCARE_RE.test(text))  return 'skincare';
  if (SALON_RE.test(text))     return 'salon_search';
  return 'general';
}

function buildCTA(text: string, intent: IntentType, gender: 'male' | 'female' | null): CTAData | null {
  if (intent !== 'hairstyle' && intent !== 'makeup') return null;

  const genderPath = gender === 'male' ? 'men' : 'women';
  return {
    label: intent === 'hairstyle' ? 'Virtual Try-On 💇' : 'Virtual Makeup 💄',
    link:  `/virtual-tryon/${genderPath}`,
    intro: 'See how this look suits you — try it virtually!',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Text cleaning — strip accidental image content from Gemini output
// ─────────────────────────────────────────────────────────────────────────────

const IMAGE_EXT_RE = /https?:\/\/\S+\.(jpg|jpeg|png|gif|webp|svg|bmp|avif)(\?\S*)?/gi;
const PEXELS_RE    = /https?:\/\/images\.(pexels|unsplash)\.com\S*/gi;
const MD_IMAGE_RE  = /!\[[^\]]*\]\([^)]+\)/g;
const CODE_BLOCK_RE = /```[\s\S]*?```/g;
const CTA_BLOCK_RE  = /<cta>[\s\S]*?<\/cta>/i;

/** Strip image URLs, markdown image syntax, code blocks from AI text. */
function cleanReply(text: string): string {
  return text
    .replace(MD_IMAGE_RE, '')          // ![alt](url)
    .replace(IMAGE_EXT_RE, '')         // absolute image URLs
    .replace(PEXELS_RE, '')            // Pexels / Unsplash CDN links
    .replace(CODE_BLOCK_RE, '')        // ``` code blocks ```
    .replace(/\n{3,}/g, '\n\n')        // collapse excessive blank lines
    .trim();
}

/** Extract <cta> block from text and return both the CTA data and the cleaned text. */
function parseCTA(text: string): { cleanedText: string; cta?: CTAData } {
  const match = text.match(CTA_BLOCK_RE);
  if (!match) return { cleanedText: text };

  const block   = match[0];
  const inner   = match[0].replace(/<\/?cta>/gi, '').trim();
  const linkM   = inner.match(/Link:\s*(.+?)(?:\n|\r|$)/);
  const labelM  = inner.match(/(?:Button|Label):\s*(.+?)(?:\n|\r|$)/);
  const introM  = inner.match(/(?:Description|Intro):\s*(.+?)(?:\n|\r|$)/);

  const cleanedText = text.replace(block, '').replace(/\n{3,}/g, '\n\n').trim();

  if (!linkM) return { cleanedText };

  return {
    cleanedText,
    cta: {
      label: labelM?.[1]?.trim() ?? 'Virtual Try-On 💇',
      link:  linkM[1].trim(),
      intro: introM?.[1]?.trim(),
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Supabase helpers
// ─────────────────────────────────────────────────────────────────────────────

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll()          { return cookieStore.getAll(); },
        setAll(toSet)     { toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); },
      },
    }
  );
}

async function getUserContext(): Promise<string> {
  try {
    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return '';

    const [{ data: bookings }, { data: favorites }] = await Promise.all([
      supabase
        .from('bookings')
        .select('booking_date, service:services(name), salon:salons(name, area)')
        .eq('user_id', user.id)
        .order('booking_date', { ascending: false })
        .limit(5),
      supabase
        .from('favorites')
        .select('salon:salons(name, area)')
        .eq('user_id', user.id)
        .limit(5),
    ]);

    let ctx = '\n\n--- USER CONTEXT ---\n';
    if (bookings?.length) {
      ctx += 'Recent bookings:\n';
      bookings.forEach((b: any) => {
        const svc  = Array.isArray(b.service)  ? b.service[0]?.name  : b.service?.name;
        const name = Array.isArray(b.salon)    ? b.salon[0]?.name    : b.salon?.name;
        ctx += `- ${svc ?? 'Service'} at ${name ?? 'Unknown'} (${b.booking_date})\n`;
      });
    }
    if (favorites?.length) {
      ctx += 'Favourite salons:\n';
      favorites.forEach((f: any) => {
        const name = Array.isArray(f.salon) ? f.salon[0]?.name : f.salon?.name;
        const area = Array.isArray(f.salon) ? f.salon[0]?.area : f.salon?.area;
        ctx += `- ${name ?? 'Unknown'} (${area ?? ''})\n`;
      });
    }
    return ctx;
  } catch {
    return '';
  }
}

async function getMemoryForUser(userId: string): Promise<string> {
  try {
    const svcUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!svcUrl || !svcKey) return '';

    const svc = createServiceClient(svcUrl, svcKey);
    const { data } = await svc
      .from('ai_memory')
      .select('memory')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (!data?.length) return '';
    const mem = data[0]?.memory;
    if (!mem) return '';
    if (typeof mem === 'string') return mem;
    return mem.contextSummary || '';
  } catch {
    return '';
  }
}

async function getRealSalonData(): Promise<string> {
  try {
    const supabase = await getSupabase();
    const { data: salons } = await supabase
      .from('salons')
      .select('name, slug, area, category, rating, review_count, starting_price, is_verified')
      .eq('is_active', true)
      .order('rating', { ascending: false })
      .limit(20);

    if (!salons?.length) return '';

    let ctx = '\n\n--- REAL SALON DATA (use this, not hardcoded samples) ---\n';
    salons.forEach((s: any) => {
      ctx += `- ${s.name} (${s.area}) — ${s.category}, ⭐${s.rating} (${s.review_count} reviews), from ₹${s.starting_price}${s.is_verified ? ', ✓ Verified' : ''}, slug: ${s.slug}\n`;
    });
    return ctx;
  } catch {
    return '';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Route handler
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { messages, language, mode } = await req.json();

    // ── Simple / navigation mode (MiniChatWidget) ──────────────────────────
    if (mode === 'simple') {
      const simplePrompt =
        messages[0]?.content?.includes('[SYSTEM]:')
          ? messages[0].content
          : 'You are GlamBot, a friendly navigation assistant for CuraStyl. Help users find pages and navigate the app.';

      const convo = (messages || [])
        .map((m: any) => `${m.role.toUpperCase()}: ${m.content}`)
        .join('\n');

      try {
        const reply = await generateWithRetry('gemini-1.5-flash',
          `${simplePrompt}\n\nConversation:\n${convo}\n\nAssistant:`,
          { maxTokens: 300, temperature: 0.7 }
        );
        return NextResponse.json({ reply, cta: null, intentType: 'general', gender: null });
      } catch {
        return NextResponse.json({
          reply: 'Visit our [Salons](/salons) page or [AI Assistant](/ai-assistant) for help.',
          cta: null, intentType: 'general', gender: null,
        });
      }
    }

    // ── Verify Gemini key ──────────────────────────────────────────────────
    const hasKey = !!(
      process.env.GEMINI_API_KEY_1 || process.env.GEMINI_API_KEY_2 ||
      process.env.GEMINI_API_KEY_3 || process.env.GEMINI_API_KEY_4 ||
      process.env.GEMINI_API_KEY_5 || process.env.GEMINI_API_KEY_6 ||
      process.env.GEMINI_API_KEY_7 || process.env.GEMINI_API_KEY_8 ||
      process.env.GEMINI_API_KEY_9 || process.env.GEMINI_API_KEY_10
    );

    if (!hasKey) {
      return NextResponse.json({
        reply: '⚠️ AI features are currently unavailable. Browse our salons at /salons!',
        cta: null, intentType: 'general', gender: null,
      });
    }

    // ── Detect intent + gender from last user message ──────────────────────
    const lastUserMsg = Array.isArray(messages)
      ? [...messages].reverse().find((m: any) => m.role === 'user')
      : null;
    const lastContent: string = lastUserMsg?.content || '';

    // Extract gender from image analysis if present
    let imageGender: 'male' | 'female' | null = null;
    try {
      const imgAnalysisMsg = messages.find((m: any) =>
        m.role === 'system' && m.content?.includes('Image analysis:')
      );
      if (imgAnalysisMsg) {
        const gMatch = imgAnalysisMsg.content.match(/gender:\s*(male|female)/i);
        if (gMatch) imageGender = gMatch[1].toLowerCase() as 'male' | 'female';
      }
    } catch {}

    const gender = detectGender(lastContent, imageGender);
    const intent = detectIntent(lastContent);

    // ── Build system prompt (plain text only) ──────────────────────────────
    const [userCtx, salonData] = await Promise.all([getUserContext(), getRealSalonData()]);

    let systemPrompt = BASE_SYSTEM_PROMPT + salonData + userCtx;

    // Memory (best-effort)
    try {
      const supa = await getSupabase();
      const { data: { user } } = await supa.auth.getUser();
      if (user) {
        const mem = await getMemoryForUser(user.id);
        if (mem) systemPrompt += `\n\n--- USER MEMORY ---\n${mem}`;
      }
    } catch {}

    // Language instruction
    if (language && typeof language === 'string' && language.toLowerCase() !== 'auto') {
      const langMap: Record<string, string> = {
        en: 'English', hi: 'Hindi', mr: 'Marathi', gu: 'Gujarati',
        bn: 'Bengali', ta: 'Tamil', te: 'Telugu', kn: 'Kannada',
        ml: 'Malayalam', pa: 'Punjabi', ur: 'Urdu',
      };
      const lang = langMap[language.toLowerCase()] || language;
      systemPrompt += `\n\nRespond in ${lang}.`;
    }

    // Gender context
    if (gender === 'male') {
      systemPrompt += '\n\nThe user is looking for MEN\'S style recommendations. Provide men-specific advice immediately.';
    } else if (gender === 'female') {
      systemPrompt += '\n\nThe user is looking for WOMEN\'S style recommendations. Provide women-specific advice immediately.';
    }

    // CTA instruction — ONLY for hairstyle and makeup queries
    const ctaData = buildCTA(lastContent, intent, gender);
    if (ctaData) {
      systemPrompt += `

MANDATORY: End your response with this exact block (no changes):

<cta>
Description: ${ctaData.intro}
Button: ${ctaData.label}
Link: ${ctaData.link}
</cta>

Place this BEFORE any JSON and AFTER your main advice.`;
    }

    // ── Assemble conversation and call Gemini ──────────────────────────────
    const convo = (messages || [])
      .map((m: any) => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n');

    const prompt = `${systemPrompt}\n\nConversation:\n${convo}\n\nAssistant:`;

    // Dynamic token limit — simple, based on intent
    const maxTokens = intent === 'hairstyle' || intent === 'makeup' ? 1500
      : intent === 'skincare' ? 1300
      : 1000;

    let rawReply = await generateWithRetry('gemini-1.5-flash', prompt, {
      maxTokens,
      temperature: 0.7,
    });

    // ── Clean the reply ────────────────────────────────────────────────────
    rawReply = cleanReply(rawReply);

    // Parse and strip <cta> block
    const { cleanedText, cta: parsedCTA } = parseCTA(rawReply);

    // Use parsed CTA from AI response if available, otherwise use our computed one
    const finalCTA = parsedCTA ?? ctaData ?? null;

    console.log('[Chat API] intent:', intent, '| gender:', gender, '| cta:', !!finalCTA);

    return NextResponse.json({
      reply:      cleanedText,
      cta:        finalCTA,
      intentType: intent,
      gender:     gender,
    });

  } catch (error: any) {
    console.error('[Chat API] Error:', error?.message ?? error);
    const isQuota = /quota|429|rate limit|exhaust/i.test(String(error));

    return NextResponse.json({
      reply: isQuota
        ? '⚠️ The AI is temporarily rate-limited. Please wait a moment and try again.'
        : 'Sorry, I encountered an error. Please try again in a moment.',
      cta:        null,
      intentType: 'general',
      gender:     null,
    }, { status: 200 });
  }
}