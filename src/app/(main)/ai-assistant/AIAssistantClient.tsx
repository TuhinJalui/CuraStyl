"use client";

/**
 * AIAssistantClient — Complete Refactor
 *
 * Architecture:
 *  - Text (Gemini) and Images (Pexels) are fetched in parallel, completely independent
 *  - Each assistant message carries its own textStatus + imageStatus
 *  - Text renders the moment Gemini responds
 *  - Images render the moment Pexels responds
 *  - Neither waits for the other
 *  - Image loader has exactly 3 states: loading → success | failed
 *  - 12-second image timeout → "No images found" placeholder, never infinite spinner
 *  - No JSON parsing anywhere
 *  - No proxyImageUrl for Pexels/Unsplash (they are public CDNs)
 *  - Promise.allSettled for saving conversation after both settle
 */

import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
const GoogleCSE = dynamic(() => import("@/components/ai/GoogleCSE"), { ssr: false });
import {
  Send, Sparkles, Mic, Camera, MessageSquare, Search, Pin, Clock,
  LogIn, Volume2, Pause, Copy, Trash2,
} from "lucide-react";
import { useAuth } from "@/lib/auth/useAuth";
import { useRouter } from "next/navigation";
import AIFeatureShowcase from "@/components/ai/AIFeatureShowcase";
import { loadMemory, saveMemory, extractMemoryUpdates } from "@/lib/ai/memory-system";
import { useAIAnalytics } from "@/lib/ai/analytics";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ImageResult {
  url: string;
  alt: string;
}

interface CTAData {
  label: string;
  link:  string;
  intro?: string;
}

type TextStatus  = "loading" | "ready" | "error";
type ImageStatus = "idle" | "loading" | "ready" | "failed";

interface LiveMessage {
  id:          string;
  role:        "user" | "assistant";
  content:     string;
  timestamp:   Date;
  textStatus:  TextStatus;
  imageStatus: ImageStatus;
  images:      ImageResult[];
  cta?:        CTAData;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

let _idCounter = 0;
function genId(prefix: string) {
  return `${prefix}_${Date.now()}_${++_idCounter}`;
}

/** Queries that are likely to benefit from image results. */
const IMAGE_QUERY_RE = /hair(cut|style|color)?|makeup|look|style|skin(care)?|facial|treatment|salon|beauty|bridal|wedding|glow|curly|wavy|short|long|trendy|fashion|show\s?me/i;

type IntentType = "hairstyle" | "makeup" | "skincare" | "salon_search" | "general";
const MALE_RE   = /\bmen\b|\bmale\b|\bman\b|\bboy\b|\bguy\b|\bbeard\b|\bbarber\b/i;
const FEMALE_RE = /\bwomen\b|\bfemale\b|\bwoman\b|\bgirl\b|\blady\b/i;

function detectQueryMeta(query: string): { intentType: IntentType; gender: "male" | "female" | null } {
  const q = query.toLowerCase();
  let intentType: IntentType = "general";
  if (/hair(cut|style|color)?|bob|pixie|fade|undercut|bangs|braid|layers/i.test(q)) intentType = "hairstyle";
  else if (/makeup|lipstick|foundation|eyeshadow|contour|blush/i.test(q)) intentType = "makeup";
  else if (/skin(care)?|acne|pimple|facial|glow|dark circle/i.test(q))    intentType = "skincare";
  else if (/\bsalon\b|beauty parlou?r/i.test(q))                          intentType = "salon_search";

  const gender = MALE_RE.test(query) ? "male" : FEMALE_RE.test(query) ? "female" : null;
  return { intentType, gender };
}

/** Convert **bold** and [link](url) in AI text to safe HTML. Does NOT parse JSON. */
function formatContent(text: string): string {
  if (!text) return "";
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g,   "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" class="text-purple-300 hover:text-purple-200 underline font-medium">$1</a>');
}

// Safe JSON fetch
async function safeJson(res: Response): Promise<any> {
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    const text = await res.text().catch(() => "");
    throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 120)}`);
  }
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// API fetch functions (independent, never throw — return null on failure)
// ─────────────────────────────────────────────────────────────────────────────

async function fetchText(
  messages: any[],
  language: string,
): Promise<{ reply: string; cta: CTAData | null; intentType: IntentType; gender: "male" | "female" | null }> {
  const res = await fetch("/api/ai/chat", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ messages, language }),
  });
  const data = await safeJson(res);
  return {
    reply:      data.reply      ?? "Sorry, I couldn't generate a response.",
    cta:        data.cta        ?? null,
    intentType: data.intentType ?? "general",
    gender:     data.gender     ?? null,
  };
}

/**
 * Fetch images from dedicated endpoint with a hard 12-second client-side timeout.
 * Returns [] on timeout, network error, or zero results.
 */
async function fetchImages(
  query:      string,
  intentType: IntentType,
  gender:     "male" | "female" | null,
): Promise<ImageResult[]> {
  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), 12_000);

  try {
    const res = await fetch("/api/ai/images", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ query, intentType, gender }),
      signal:  controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) return [];
    const data = await safeJson(res);
    return Array.isArray(data.images) ? data.images : [];
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err?.name === "AbortError") {
      console.warn("[Images] Timed out after 12s — showing failed state");
    }
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

/** Animated text loading dots */
function TextLoadingDots() {
  return (
    <span className="inline-flex items-center gap-1 text-white/40 text-xs">
      <span className="w-1.5 h-1.5 rounded-full bg-purple-400/60 animate-bounce" style={{ animationDelay: "0ms" }} />
      <span className="w-1.5 h-1.5 rounded-full bg-purple-400/60 animate-bounce" style={{ animationDelay: "150ms" }} />
      <span className="w-1.5 h-1.5 rounded-full bg-purple-400/60 animate-bounce" style={{ animationDelay: "300ms" }} />
    </span>
  );
}

/** Image loading skeleton */
function ImageLoadingSkeleton() {
  return (
    <div className="mt-2 pt-2 border-t border-white/5 w-full flex justify-center">
      <div className="w-full max-w-xs">
        <div className="aspect-square rounded-xl bg-white/5 border border-white/10 animate-pulse flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-white/20" />
        </div>
        <p className="text-center text-xs text-white/30 mt-2">Loading images…</p>
      </div>
    </div>
  );
}

/** Image carousel — shown when imageStatus === 'ready' */
function ImageCarousel({ images }: { images: ImageResult[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imgError,     setImgError]     = useState(false);

  const handleNext = () => { setImgError(false); setCurrentIndex(i => (i + 1) % images.length); };
  const handlePrev = () => { setImgError(false); setCurrentIndex(i => (i - 1 + images.length) % images.length); };

  if (!images.length) return null;

  const cur         = images[currentIndex];
  const rawUrl      = typeof cur === "string" ? cur : (cur?.url ?? "");
  const imageTitle  = typeof cur === "string" ? `Image ${currentIndex + 1}` : (cur?.alt ?? `Image ${currentIndex + 1}`);
  const fallbackUrl = "https://images.unsplash.com/photo-1595777707802-038daca6d617?w=600&h=600&fit=crop";

  return (
    <div className="mt-2 pt-2 border-t border-white/5 w-full flex justify-center">
      <div className="w-full max-w-xs">
        <div className="aspect-square rounded-xl overflow-hidden bg-white/5 border border-white/10 shadow-md">
          <img
            key={rawUrl}
            src={imgError ? fallbackUrl : rawUrl}
            alt={imageTitle}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        </div>
        <p className="text-white/70 text-xs font-medium text-center truncate max-w-xs mt-1">
          {imageTitle}
        </p>
        <div className="flex items-center justify-between w-full max-w-xs mt-1">
          <button
            onClick={handlePrev}
            className="flex items-center justify-center gap-1 px-3 py-1.5 text-xs rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white font-medium shadow-md shadow-purple-500/20 hover:shadow-purple-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
          >
            ← Prev
          </button>
          <div className="text-white/60 text-xs font-semibold px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">
            {currentIndex + 1} / {images.length}
          </div>
          <button
            onClick={handleNext}
            className="flex items-center justify-center gap-1 px-3 py-1.5 text-xs rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white font-medium shadow-md shadow-purple-500/20 hover:shadow-purple-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}

/** Renders a single assistant message bubble (text + images, fully independent) */
const AssistantBubble = React.memo(function AssistantBubble({ msg }: { msg: LiveMessage }) {
  return (
    <div className="space-y-3">
      {/* ── TEXT SECTION ─────────────────────────────────────────────── */}
      {msg.textStatus === "loading" ? (
        <div className="flex items-center gap-2 text-white/50 text-sm py-1">
          <TextLoadingDots />
          <span className="text-xs">Thinking…</span>
        </div>
      ) : msg.textStatus === "error" ? (
        <p className="text-red-400/80 text-sm">{msg.content}</p>
      ) : (
        <div
          className="text-sm leading-relaxed whitespace-pre-wrap md:text-xs"
          dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }}
        />
      )}

      {/* ── CTA BUTTON ───────────────────────────────────────────────── */}
      {msg.textStatus === "ready" && msg.cta && (
        <div>
          {msg.cta.intro && (
            <p className="text-white/50 text-xs mb-1">{msg.cta.intro}</p>
          )}
          <a
            href={msg.cta.link}
            className="inline-block px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-xs font-semibold rounded-lg hover:shadow-lg hover:shadow-purple-500/50 transition-all duration-300 hover:-translate-y-0.5"
          >
            {msg.cta.label}
          </a>
        </div>
      )}

      {/* ── IMAGE SECTION (completely independent of text) ────────────── */}
      {msg.imageStatus === "loading" && <ImageLoadingSkeleton />}

      {msg.imageStatus === "ready" && msg.images.length > 0 && (
        <ImageCarousel images={msg.images} />
      )}

      {msg.imageStatus === "failed" && (
        <div className="mt-2 pt-2 border-t border-white/5">
          <p className="text-center text-xs text-white/25 italic">No relevant images found</p>
        </div>
      )}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const WELCOME: LiveMessage = {
  id:          "welcome",
  role:        "assistant",
  content:     "Hi! I'm AuraAI your personal beauty advisor for Mumbai. Ask me anything.",
  timestamp:   new Date(),
  textStatus:  "ready",
  imageStatus: "idle",
  images:      [],
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function AIAssistantClient() {
  const [messages,         setMessages]         = useState<LiveMessage[]>([WELCOME]);
  const [input,            setInput]            = useState("");
  const [isLoading,        setIsLoading]        = useState(false);
  const [language,         setLanguage]         = useState("auto");
  const [personality,      setPersonality]      = useState("professional");
  const [contextMemory,    setContextMemory]    = useState(true);
  const [conversations,    setConversations]    = useState<any[]>([]);
  const [sidebarOpen,      setSidebarOpen]      = useState(true);
  const [showFeatures,     setShowFeatures]     = useState(false);
  const [showGoogleSearch, setShowGoogleSearch] = useState(false);
  const [chatSearch,       setChatSearch]       = useState("");
  const [isTranslating,    setIsTranslating]    = useState(false);
  const [attachedImage,    setAttachedImage]    = useState<string | null>(null);
  const [speakingIndex,    setSpeakingIndex]    = useState<number | null>(null);
  const [speakingProgress, setSpeakingProgress] = useState(0);
  const [mounted,          setMounted]          = useState(false);
  const [currentConvId,    setCurrentConvId]    = useState<string | null>(null);
  const [geminiOk,         setGeminiOk]         = useState(false);

  const bottomRef          = useRef<HTMLDivElement | null>(null);
  const fileInputRef       = useRef<HTMLInputElement | null>(null);
  const speechRef          = useRef<any>(null);
  const audioRef           = useRef<HTMLAudioElement | null>(null);
  const speechTimerRef     = useRef<number | null>(null);
  const wordBoundariesRef  = useRef<number[]>([]);
  const [currentWordIdx,   setCurrentWordIdx]   = useState(-1);

  const analytics = useAIAnalytics();
  const router    = useRouter();
  const { profile, isLoggedIn, signOut } = useAuth();

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // ── Gemini status ────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/ai/gemini-status")
      .then(r => r.json())
      .then(d => setGeminiOk(!!(d?.status?.totalKeys)))
      .catch(() => {});
  }, []);

  // ── Session ID ───────────────────────────────────────────────────────────
  const getSessionId = () => {
    let id = sessionStorage.getItem("ai_session_id");
    if (!id) {
      id = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      sessionStorage.setItem("ai_session_id", id);
    }
    return id;
  };

  // ── Conversation management ──────────────────────────────────────────────
  const fetchConversations = async () => {
    try {
      if (!isLoggedIn) {
        const s = sessionStorage.getItem("ai_conversations");
        setConversations(s ? JSON.parse(s) : []);
        return;
      }
      const res = await fetch("/api/ai/conversations?limit=50");
      const d   = await res.json();
      setConversations(d?.ok && Array.isArray(d.data) ? d.data : []);
    } catch {
      const s = sessionStorage.getItem("ai_conversations");
      setConversations(s ? JSON.parse(s) : []);
    }
  };

  useEffect(() => { fetchConversations(); }, [isLoggedIn]);

  /** Serialize LiveMessage[] to storage-compatible format */
  function serializeMessages(msgs: LiveMessage[]) {
    return msgs.map(m => ({
      role:      m.role,
      content:   m.content,
      timestamp: m.timestamp,
      images:    m.images,
      cta:       m.cta,
    }));
  }

  /** Deserialize storage messages back to LiveMessage[] with defaults */
  function deserializeMessages(raw: any[]): LiveMessage[] {
    return (raw || []).map(m => ({
      id:          genId(m.role),
      role:        m.role        ?? "assistant",
      content:     m.content     ?? "",
      timestamp:   m.timestamp   ? new Date(m.timestamp) : new Date(),
      textStatus:  "ready"       as TextStatus,
      imageStatus: m.images?.length ? "ready" : "idle" as ImageStatus,
      images:      m.images      ?? [],
      cta:         m.cta,
    }));
  }

  const saveConversation = async (isNew = false, latestMessages?: LiveMessage[]) => {
    const msgs = latestMessages ?? messages;
    if (msgs.length <= 1) return;

    const payload = {
      sessionId: getSessionId(),
      title:     (msgs.find(m => m.role === "user")?.content ?? "Chat").slice(0, 120),
      language,
      messages:  serializeMessages(msgs),
      preview:   msgs[msgs.length - 1]?.content ?? "",
      pinned:    false,
      ...(currentConvId && !isNew ? { id: currentConvId } : {}),
    };

    try {
      if (!isLoggedIn) {
        const s   = sessionStorage.getItem("ai_conversations");
        let arr   = s ? JSON.parse(s) : [];
        if (currentConvId && !isNew) {
          arr = arr.map((c: any) => c.id === currentConvId ? { ...c, ...payload, updated_at: new Date().toISOString() } : c);
        } else {
          const newId = `session_${Date.now()}`;
          arr.unshift({ id: newId, ...payload, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
          setCurrentConvId(newId);
        }
        sessionStorage.setItem("ai_conversations", JSON.stringify(arr.slice(0, 200)));
        setConversations(arr.slice(0, 200));
        return;
      }

      const method = currentConvId && !isNew ? "PUT" : "POST";
      const res    = await fetch("/api/ai/conversations", {
        method,
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      if (res.ok) {
        const result = await res.json();
        if (result?.data?.id && !currentConvId) setCurrentConvId(result.data.id);
        await fetchConversations();
      }
    } catch {}
  };

  const deleteConversation = async (c: any) => {
    if (!c) return;
    try {
      if (isLoggedIn && c.id && !String(c.id).startsWith("session_")) {
        await fetch("/api/ai/conversations", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ id: c.id }),
        });
        await fetchConversations();
        return;
      }
      const s = sessionStorage.getItem("ai_conversations");
      if (s) {
        const arr = JSON.parse(s).filter((x: any) => x.id !== c.id);
        sessionStorage.setItem("ai_conversations", JSON.stringify(arr));
        setConversations(arr);
      }
    } catch {}
  };

  const handleNewChat = async () => {
    if (currentConvId && messages.length > 1) await saveConversation();
    setMessages([WELCOME]);
    setCurrentConvId(null);
  };

  // ── Language switching ───────────────────────────────────────────────────
  const handleLanguageChange = async (lang: string) => {
    if (!lang || lang === language) return;
    try {
      setIsTranslating(true);
      const res = await fetch("/api/ai/translate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ messages: serializeMessages(messages), targetLanguage: lang }),
      });
      const d = await res.json();
      if (d?.ok && Array.isArray(d.data)) {
        setMessages(deserializeMessages(d.data));
        setLanguage(lang);
      }
    } catch {}
    finally { setIsTranslating(false); }
  };

  // ── Speech ───────────────────────────────────────────────────────────────
  const stopSpeech = () => {
    try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch {}
    try { audioRef.current?.pause(); audioRef.current = null; } catch {}
    if (speechTimerRef.current) clearInterval(speechTimerRef.current);
    speechRef.current = null;
    setSpeakingIndex(null);
    setSpeakingProgress(0);
    setCurrentWordIdx(-1);
  };

  const playMessageSpeech = (msg: LiveMessage, idx: number) => {
    if (!msg.content) return;
    stopSpeech();
    setSpeakingIndex(idx);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const utter    = new SpeechSynthesisUtterance(msg.content);
      const langMap: Record<string, string> = { en: "en-IN", hi: "hi-IN", mr: "mr-IN" };
      utter.lang     = language !== "auto" ? (langMap[language] || language) : "en-IN";
      utter.onend    = () => { setTimeout(stopSpeech, 120); };
      utter.onboundary = (e: any) => {
        const ci = e.charIndex ?? 0;
        setSpeakingProgress(ci / Math.max(1, msg.content.length));
      };
      speechRef.current = utter;
      window.speechSynthesis.speak(utter);
    }
  };

  // ── Image attachment ─────────────────────────────────────────────────────
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAttachedImage(reader.result as string);
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Voice recording ──────────────────────────────────────────────────────
  const startStopRecording = async () => {
    try {
      if (!navigator.mediaDevices) return;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr     = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      mr.ondataavailable = ev => { if (ev.data?.size) chunks.push(ev.data); };
      mr.onstop = async () => {
        const blob   = new Blob(chunks, { type: "audio/webm" });
        const buffer = await blob.arrayBuffer();
        const b64    = btoa(String.fromCharCode(...new Uint8Array(buffer)));
        setIsLoading(true);
        try {
          const res  = await fetch("/api/ai/voice", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ action: "stt", audio: `data:audio/webm;base64,${b64}` }),
          });
          const d = await res.json();
          const t = d?.text || d?.transcript || "";
          if (t) await sendMessage(t);
        } finally { setIsLoading(false); }
      };
      mr.start();
      setTimeout(() => mr.stop(), 4000);
    } catch {}
  };

  // ─────────────────────────────────────────────────────────────────────────
  // CORE: sendMessage — independent text + image pipeline
  // ─────────────────────────────────────────────────────────────────────────

  const sendMessage = async (text?: string) => {
    const rawContent = (text ?? input).trim();
    if (!rawContent && !attachedImage) return;
    setInput("");

    // Build user message content (include attached image if any)
    let userContent = rawContent;
    if (attachedImage) {
      userContent = (userContent ? `${userContent}<br/>` : "")
        + `<img src="${attachedImage}" alt="user-image" class="rounded-md max-w-xs" />`;
    }

    const userMsg: LiveMessage = {
      id:          genId("user"),
      role:        "user",
      content:     userContent,
      timestamp:   new Date(),
      textStatus:  "ready",
      imageStatus: "idle",
      images:      [],
    };

    // Detect intent + gender locally for image fetching
    const { intentType, gender } = detectQueryMeta(rawContent);
    const willFetchImages = IMAGE_QUERY_RE.test(rawContent) && rawContent.trim().length > 4;

    // Placeholder assistant message — renders immediately
    const assistantId = genId("asst");
    const placeholder: LiveMessage = {
      id:          assistantId,
      role:        "assistant",
      content:     "",
      timestamp:   new Date(),
      textStatus:  "loading",
      imageStatus: willFetchImages ? "loading" : "idle",
      images:      [],
    };

    setMessages(prev => [...prev, userMsg, placeholder]);
    setIsLoading(true);

    // Prepare payload for Gemini (conversation history, no runtime-only fields)
    const baseMessages = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));
    const payloadMessages: any[] = [...baseMessages];

    // If image attached, analyse it first
    if (attachedImage) {
      try {
        const ir = await fetch("/api/ai/image-analyze", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ image: attachedImage, purpose: "face" }),
        });
        const id = await ir.json();
        if (id?.analysis) {
          let summary = "";
          if (typeof id.analysis === "string") summary = id.analysis;
          else if (typeof id.analysis === "object") {
            summary = Object.entries(id.analysis)
              .filter(([, v]) => v != null)
              .map(([k, v]) => `${k}: ${v}`)
              .join("; ");
          }
          if (summary) payloadMessages.push({ role: "system", content: `Image analysis: ${summary}` });
        }
      } catch {}
    }

    // ── Fire TEXT and IMAGES in parallel — completely independent ──────────

    const textPromise = fetchText(payloadMessages, language)
      .then(({ reply, cta }) => {
        setMessages(prev => prev.map(m =>
          m.id === assistantId
            ? { ...m, content: reply, textStatus: "ready" as TextStatus, cta: cta ?? undefined }
            : m
        ));
        return { reply, cta };
      })
      .catch(() => {
        setMessages(prev => prev.map(m =>
          m.id === assistantId
            ? { ...m, content: "Sorry, I encountered an error. Please try again.", textStatus: "error" as TextStatus }
            : m
        ));
        return null;
      });

    const imagePromise = willFetchImages
      ? fetchImages(rawContent, intentType, gender)
          .then(images => {
            setMessages(prev => prev.map(m =>
              m.id === assistantId
                ? { ...m, images, imageStatus: (images.length > 0 ? "ready" : "failed") as ImageStatus }
                : m
            ));
            return images;
          })
          .catch(() => {
            setMessages(prev => prev.map(m =>
              m.id === assistantId ? { ...m, imageStatus: "failed" as ImageStatus } : m
            ));
            return [];
          })
      : Promise.resolve([]);

    // Wait for BOTH to settle (saves conversation after both complete)
    const [textResult] = await Promise.allSettled([textPromise, imagePromise]);
    setIsLoading(false);
    setAttachedImage(null);

    // Memory update
    try {
      if (contextMemory && textResult.status === "fulfilled" && textResult.value?.reply) {
        const reply   = textResult.value.reply;
        const current = loadMemory(undefined);
        const updates = extractMemoryUpdates(rawContent, reply, current);
        if (updates && Object.keys(updates).length > 0) {
          saveMemory({ ...current, ...updates }, undefined);
          fetch("/api/ai/memory", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ memory: updates }),
          }).catch(() => {});
        }
      }
    } catch {}

    // Analytics
    try { analytics.trackMessageSent("text", rawContent.length); } catch {}

    // Save conversation
    setMessages(prev => {
      saveConversation(!currentConvId, prev);
      return prev;
    });
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Conversation filter helpers
  // ─────────────────────────────────────────────────────────────────────────

  const matchesSearch = (c: any) => {
    if (!chatSearch.trim()) return true;
    const q = chatSearch.toLowerCase();
    return (
      (c.title   ?? "").toLowerCase().includes(q) ||
      (c.preview ?? "").toLowerCase().includes(q)
    );
  };

  const pinnedConvs   = conversations.filter((c: any) => c.pinned    && matchesSearch(c));
  const recentConvs   = conversations.filter((c: any) => matchesSearch(c));

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen gradient-hero pt-16 flex flex-col">
      {/* ── TOP BAR ────────────────────────────────────────────────────── */}
      <div className="border-b border-white/10 bg-[#0a0a0f]/80 backdrop-blur-xl sticky top-16 z-50">
        <div className="max-w-full px-3 sm:px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden ring-2 ring-purple-500/30 shrink-0">
              <img src="/images/aura-avatar.jpg" alt="Aura" className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-white text-sm sm:text-base truncate">Aura - CuraBot</p>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-white/50">AI</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative hidden sm:block">
              <button
                onClick={() => setShowFeatures(s => !s)}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white/90 px-3 py-2 rounded-lg text-sm transition-colors"
              >
                Features
              </button>
              {showFeatures && (
                <div className="fixed left-0 right-0 top-16 bottom-0 z-40 flex items-start justify-center pointer-events-auto">
                  <div className="absolute inset-0 bg-black/60" onClick={() => setShowFeatures(false)} />
                  <div className="relative w-full max-w-6xl mx-4 mt-6 overflow-hidden rounded-2xl">
                    <AIFeatureShowcase />
                  </div>
                </div>
              )}
            </div>

            <select
              value={personality}
              onChange={e => setPersonality(e.target.value)}
              className="bg-gradient-to-r from-purple-800 to-purple-900 text-white text-xs rounded px-2 py-1 border border-purple-700/40 focus:outline-none focus:ring-2 focus:ring-purple-600"
            >
              <option value="professional" style={{ backgroundColor: "#2b0756" }}>Professional</option>
              <option value="friendly"     style={{ backgroundColor: "#2b0756" }}>Friendly</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── SIDEBAR ──────────────────────────────────────────────────── */}
        <div
          className={`hidden lg:flex flex-col shrink-0 border-r border-white/10 bg-[#05050a]/90 transition-all duration-200 ${sidebarOpen ? "w-56" : "w-14"}`}
          style={{ height: "calc(100vh - 8rem)" }}
        >
          <div className="flex flex-col h-full overflow-hidden p-3">
            <button
              onClick={() => setSidebarOpen(s => !s)}
              className="mb-3 p-2 rounded-lg hover:bg-white/10 text-white/70 self-end transition-all"
            >
              {sidebarOpen ? "<" : ">"}
            </button>

            {sidebarOpen ? (
              <div className="flex flex-col gap-3 overflow-auto flex-1 scrollbar-thin scrollbar-thumb-white/10">
                <button
                  onClick={handleNewChat}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600/20 to-pink-500/20 border border-purple-500/30 text-white/90 hover:bg-purple-600/30 transition-all"
                >
                  <MessageSquare className="w-4 h-4 shrink-0" />
                  <span className="text-sm">New chat</span>
                </button>

                <button
                  onClick={() => setShowGoogleSearch(s => !s)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 transition-all"
                >
                  <Search className="w-4 h-4 shrink-0" />
                  <span className="text-sm">Search web</span>
                </button>

                {showGoogleSearch && (
                  <div className="px-2 pt-1">
                    <div className="text-xs text-white/60 mb-2">Google CSE</div>
                    <div className="h-48 overflow-auto rounded-lg bg-white/5 p-2 border border-white/5">
                      <GoogleCSE />
                    </div>
                  </div>
                )}

                <input
                  value={chatSearch}
                  onChange={e => setChatSearch(e.target.value)}
                  placeholder="Search chats…"
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-white/50 focus:outline-none focus:border-purple-500/50"
                />

                {pinnedConvs.length > 0 && (
                  <>
                    <div className="text-xs text-white/50 px-2 font-medium tracking-wide uppercase">Pinned</div>
                    <div className="px-1 space-y-1 max-h-32 overflow-auto">
                      {pinnedConvs.map((c: any, i: number) => (
                        <ConvRow key={c.id ?? i} c={c} onOpen={() => {
                          setMessages(deserializeMessages(c.messages));
                          setCurrentConvId(c.id);
                        }} onDelete={() => deleteConversation(c)} />
                      ))}
                    </div>
                  </>
                )}

                <div className="text-xs text-white/50 px-2 font-medium tracking-wide uppercase">Recents</div>
                <div className="px-1 space-y-1 overflow-auto flex-1">
                  {recentConvs.map((c: any, i: number) => (
                    <ConvRow key={c.id ?? i} c={c} onOpen={() => {
                      setMessages(deserializeMessages(c.messages));
                      setCurrentConvId(c.id);
                    }} onDelete={() => deleteConversation(c)} />
                  ))}
                </div>

                <div className="mt-auto pt-3 border-t border-white/10">
                  {isLoggedIn && profile ? (
                    <div className="flex items-center gap-2">
                      <button onClick={() => router.push("/profile")} className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-purple-500/30 shrink-0">
                        <img src={profile.avatar_url || "/images/aura-avatar.jpg"} alt="avatar" className="w-full h-full object-cover" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-white/90 font-medium truncate">{profile.full_name || profile.email}</div>
                      </div>
                      <button onClick={() => signOut()} className="text-xs text-red-400 hover:text-red-300 px-1">Out</button>
                    </div>
                  ) : (
                    <button onClick={() => router.push("/auth/login")} className="flex items-center gap-2 text-white/70 hover:text-white/90 text-sm">
                      <LogIn className="w-4 h-4" /> Sign in
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 mt-2">
                <button onClick={handleNewChat} title="New chat" className="p-2 rounded hover:bg-white/10"><MessageSquare className="w-5 h-5 text-white/80" /></button>
                <button title="Search" className="p-2 rounded hover:bg-white/10"><Search className="w-5 h-5 text-white/70" /></button>
                <button title="Pinned" className="p-2 rounded hover:bg-white/10"><Pin className="w-5 h-5 text-white/70" /></button>
                <button title="Recents" className="p-2 rounded hover:bg-white/10"><Clock className="w-5 h-5 text-white/70" /></button>
              </div>
            )}
          </div>
        </div>

        {/* ── CHAT AREA ────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0" style={{ height: "calc(100vh - 8rem)" }}>
          <div className="flex-1 overflow-y-auto">
            <div className="w-full px-8 py-6 space-y-5 lg:px-16">

              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 px-6">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center mb-6 shadow-lg shadow-purple-500/30">
                    <Sparkles className="w-10 h-10 text-white" />
                  </div>
                  <h2 className="text-2xl font-semibold text-white mb-2">Welcome to AuraAI</h2>
                  <p className="text-white/60 text-center max-w-md mb-8">Your personal beauty advisor for Mumbai.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
                    {[
                      { emoji: "💇‍♀️", label: "Wedding hairstyle advice",  q: "What hairstyle would suit me for a wedding?" },
                      { emoji: "🏬", label: "Find top-rated salons",       q: "Best salons in Bandra for hair treatment" },
                      { emoji: "🧼", label: "Skincare tips",               q: "Skincare routine for oily skin" },
                      { emoji: "💄", label: "Makeup trends",               q: "Latest makeup trends for 2024" },
                    ].map(({ emoji, label, q }) => (
                      <button key={q} onClick={() => setInput(q)}
                        className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-purple-500/30 transition-all text-left group"
                      >
                        <div className="text-white/90 text-sm font-medium group-hover:text-purple-300">{emoji} {label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, i) => {
                const isUser = m.role === "user";
                return (
                  <div
                    key={m.id}
                    id={`msg-${i}`}
                    className={cn("flex gap-3 items-start w-full", isUser ? "justify-end" : "justify-start max-w-4xl")}
                  >
                    {!isUser && (
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 bg-gradient-to-br from-amber-500 to-yellow-600 shadow-sm">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                    )}

                    <div className={cn(
                      "rounded-2xl px-5 py-4 text-sm leading-relaxed shadow max-w-[75%] md:max-w-[85%]",
                      isUser
                        ? "bg-white/5 border border-emerald-500/20 text-white/85 rounded-tr-none min-w-[250px]"
                        : "bg-white/5 border border-amber-500/20 text-white/85 rounded-tl-none min-w-[250px]"
                    )}>
                      {isUser ? (
                        <div dangerouslySetInnerHTML={{ __html: formatContent(m.content || "").replace(/\n/g, "<br/>") }} />
                      ) : (
                        <AssistantBubble msg={m} />
                      )}

                      {/* Action bar */}
                      <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          {!isUser && (
                            <>
                              <button
                                onClick={() => { try { navigator.clipboard?.writeText(m.content); } catch {} }}
                                className="p-1 rounded bg-white/5 hover:bg-white/10 transition-colors"
                              >
                                <Copy className="w-3.5 h-3.5 text-white/90" />
                              </button>
                              {speakingIndex === i ? (
                                <button onClick={stopSpeech} className="p-1 rounded bg-white/5 hover:bg-white/10">
                                  <Pause className="w-3.5 h-3.5 text-white/90" />
                                </button>
                              ) : (
                                <button onClick={() => playMessageSpeech(m, i)} className="p-1 rounded bg-white/5 hover:bg-white/10">
                                  <Volume2 className="w-3.5 h-3.5 text-white/90" />
                                </button>
                              )}
                            </>
                          )}
                        </div>

                        {speakingIndex === i && (
                          <div className="w-32 h-1 bg-white/10 rounded overflow-hidden">
                            <div style={{ width: `${Math.round(speakingProgress * 100)}%` }} className="h-full bg-purple-400 transition-all duration-150" />
                          </div>
                        )}

                        <span className="text-[10px] text-white/30 ml-auto">
                          {mounted ? m.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Overall loading indicator (while waiting for first response) */}
              {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex gap-3 items-start">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="rounded-2xl px-5 py-4 bg-white/5 border border-amber-500/20 rounded-tl-none">
                    <TextLoadingDots />
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </div>

          {/* ── INPUT AREA ─────────────────────────────────────────────── */}
          <div className="border-t border-white/10 bg-[#0a0a0f]/90 backdrop-blur-xl p-3 sm:p-4">
            {attachedImage && (
              <div className="mb-3 relative inline-block">
                <img src={attachedImage} alt="attachment" className="h-16 w-16 object-cover rounded-lg border border-white/20" />
                <button
                  onClick={() => setAttachedImage(null)}
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center"
                >×</button>
              </div>
            )}

            <div className="flex items-end gap-2">
              <div className="flex-1 flex items-end gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 focus-within:border-purple-500/50 transition-colors">
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                  }}
                  placeholder="Ask about beauty, salons, or treatments…"
                  rows={1}
                  disabled={isLoading || isTranslating}
                  className="flex-1 bg-transparent text-white text-sm placeholder-white/40 focus:outline-none resize-none max-h-32"
                  style={{ lineHeight: "1.5" }}
                />

                <div className="flex items-center gap-2 shrink-0">
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                  <button onClick={() => fileInputRef.current?.click()} className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white/90 transition-colors">
                    <Camera className="w-4 h-4" />
                  </button>
                  <button onClick={startStopRecording} className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white/90 transition-colors">
                    <Mic className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={language}
                  onChange={e => handleLanguageChange(e.target.value)}
                  className="bg-white/5 border border-white/10 text-white text-xs rounded-xl px-2 py-2.5 focus:outline-none focus:border-purple-500/50"
                >
                  <option value="auto">Auto</option>
                  <option value="en">English</option>
                  <option value="hi">हिंदी</option>
                  <option value="mr">मराठी</option>
                  <option value="gu">ગુજરાતી</option>
                </select>

                <button
                  onClick={() => sendMessage()}
                  disabled={isLoading || (!input.trim() && !attachedImage)}
                  className="p-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white shadow-md shadow-purple-500/30 hover:shadow-purple-500/50 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>

            <p className="text-center text-[10px] text-white/25 mt-2">
              AuraAI may occasionally be inaccurate. Always confirm details with the salon.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Conversation row sub-component
// ─────────────────────────────────────────────────────────────────────────────

function ConvRow({ c, onOpen, onDelete }: { c: any; onOpen: () => void; onDelete: () => void }) {
  return (
    <div
      onClick={onOpen}
      className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/10 transition-all cursor-pointer group"
    >
      <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center text-xs font-semibold text-white shrink-0">
        {(c.title || "C").slice(0, 1)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-white/90 truncate font-medium">{c.title}</div>
        <div className="text-[10px] text-white/40">
          {c.created_at ? new Date(c.created_at).toLocaleDateString() : ""}
        </div>
      </div>
      <button
        onClick={e => { e.stopPropagation(); if (confirm("Delete this conversation?")) onDelete(); }}
        className="p-1 rounded hover:bg-red-500/20 opacity-0 group-hover:opacity-100"
      >
        <Trash2 className="w-3 h-3 text-red-400" />
      </button>
    </div>
  );
}