"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Bot, X, Send, Minimize2, Maximize2, Sparkles, Loader2, Mic, MicOff, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const QUICK_ACTIONS = [
  { text: "🔍 Find salons near me", query: "Show salons near my location" },
  { text: "📅 Book appointment", query: "How do I book an appointment on CuraStyl?" },
  { text: "🎁 GlamPoints rewards", query: "How do I earn and use GlamPoints?" },
  { text: "💼 Salon Owner Login", query: "How do I login as a salon owner?" },
  { text: "🏪 Register a Salon", query: "How do I register my salon on CuraStyl?" },
  { text: "❓ How does it work?", query: "Give me a quick tour of CuraStyl" },
];

// Mumbai CuraStyl navigation context for the AI
const NAV_SYSTEM_PROMPT = `You are CuraBot, a friendly and helpful navigation assistant for Mumbai CuraStyl - a premium salon booking platform in Mumbai, India.

Your ONLY job is to help BOTH CUSTOMERS and SALON OWNERS navigate CuraStyl and find what they're looking for. Be concise, friendly, and always use markdown links to guide users.

Key pages for CUSTOMERS:
- Home Dashboard: [Home](/)
- Browse Salons: [Salons](/salons)
- AI Beauty Assistant (advanced): [AI Assistant](/ai-assistant)
- My Bookings: [My Bookings](/dashboard/bookings)
- My Favorites: [My Favorites](/#favorites)
- GlamPoints Rewards: [Rewards](/rewards)
- My Profile: [Profile](/profile)
- Special Offers: [Offers](/offers)
- Virtual Try-On: [Virtual Try-On](/virtual-tryon)

Key pages for SALON OWNERS:
- Salon Owner Login: [Owner Login](/auth/salon-owner-login)
- Salon Owner Dashboard: [Owner Dashboard](/salon-owner/dashboard)
- Register a New Salon: [Register Salon](/salon-owner/register)

Features you know about (CUSTOMERS):
- GlamPoints: Users earn 100 pts on signup, 1 pt per ₹100 spent on completed bookings, 50 pts for writing reviews
- Booking: Users can book salon appointments by browsing to /salons, clicking a salon, choosing a service + staff + time slot
- Coupons/Discounts: FIRST15 (15% off first booking), CuraStyl10 (10% off), MONDAY20 (Monday special)
- Favorites: Users can heart ❤️ any salon to save it
- AI Assistant: Advanced beauty AI at /ai-assistant for face analysis, style DNA, hair recommendations
- Notifications: Booking confirmations and updates appear in the bell icon in the navbar
- Membership Tiers: Basic (0 pts), Premium (1000 pts), VIP (5000 pts)

Features you know about (SALON OWNERS):
- Manage salon profile, services, staff, and bookings from the Salon Owner Dashboard
- Register new salons at /salon-owner/register
- Login at /auth/salon-owner-login

Rules:
- Only answer questions about navigating CuraStyl or beauty/salon topics
- Always be helpful and guide users to the right page with a markdown link
- Keep responses SHORT (2-4 sentences max)
- Use 1-2 relevant emojis
- If someone asks something unrelated to CuraStyl or beauty, politely redirect them
- For advanced beauty/style advice, direct users to the [AI Assistant](/ai-assistant)`;

export default function MiniChatWidget() {
  const pathname = usePathname();

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "👋 Hi! I'm **Aura**, your CuraStyl navigation guide! I can help you find salons, book appointments, check rewards, and navigate the app. What do you need?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Keep scroll effect here so hooks order is stable across renders
  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Avoid rendering the floating UI during SSR to keep server/client HTML consistent.
  if (!mounted) return null;

  // Do not show floating MiniChat on the full AI Assistant page or auth pages
  if (pathname?.startsWith("/ai-assistant")) return null;
  if (pathname?.startsWith("/auth")) return null;

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          try {
            const res = await fetch("/api/ai/voice", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ audio: base64Audio, action: "stt" }),
            });
            if (res.ok) {
              const data = await res.json();
              if (data.text) {
                setInput(data.text);
                setTimeout(() => sendMessage(data.text), 300);
              }
            }
          } catch {
            // silently fail
          }
        };
        stream.getTracks().forEach((track) => track.stop());
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendMessage = async (text?: string) => {
    const content = text ?? input.trim();
    if (!content || isLoading) return;

    setInput("");
    const userMsg: Message = { role: "user", content };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      // Build conversation for Gemini
      const conversationForAPI = [
        { role: "user", content: `[SYSTEM]: ${NAV_SYSTEM_PROMPT}\n\nUser message: ${content}` },
      ];

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: conversationForAPI,
          features: {},
          mode: "simple", // Mark this as a simple navigation request
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const reply = data.reply || "I'm here to help! Visit our [Salons](/salons) page to explore.";
        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      } else {
        throw new Error("API error");
      }
    } catch {
      // Fallback to smart hardcoded responses
      let response = "";
      const lc = content.toLowerCase();

      // Salon Owner queries
      if (lc.includes("salon owner") || lc.includes("owner dashboard") || lc.includes("manage salon")) {
        response = "Salon owners can manage their business from the [Owner Dashboard](/salon-owner/dashboard) 💼! Login at [Owner Login](/auth/salon-owner-login) or register a new salon at [Register Salon](/salon-owner/register)";
      } else if (lc.includes("register salon") || lc.includes("add salon")) {
        response = "Register your salon at [Register Salon](/salon-owner/register) 🏪! Fill in your salon details to get listed on CuraStyl!";
      } else if (lc.includes("owner login")) {
        response = "Salon owners can login at [Owner Login](/auth/salon-owner-login) 🔐!";
      } 
      // Customer queries
      else if (lc.includes("salon") || lc.includes("barber") || lc.includes("find")) {
        response = "Browse our verified salons on the [Salons page](/salons) 💇! Use area & service filters to find the perfect match.";
      } else if (lc.includes("book") || lc.includes("appointment")) {
        response = "Go to [Salons](/salons), pick a salon, choose a service & time slot, and confirm your booking! Takes less than 2 min 📅";
      } else if (lc.includes("point") || lc.includes("reward") || lc.includes("glam")) {
        response = "You earn 100 pts on signup + 1 pt per ₹100 spent! Check your [Rewards dashboard](/rewards) 🎁";
      } else if (lc.includes("offer") || lc.includes("coupon") || lc.includes("discount")) {
        response = "Check our [Offers page](/offers) for deals! You can also use codes like **CuraStyl10** (10% off) or **FIRST15** (15% off first booking) 🎉";
      } else if (lc.includes("ai") || lc.includes("assistant") || lc.includes("face")) {
        response = "Our advanced [AI Beauty Assistant](/ai-assistant) can analyze your face shape, recommend styles, and find perfect salons! ✨";
      } else if (lc.includes("profile") || lc.includes("account")) {
        response = "Manage your account at [Profile](/profile). You can update your name, phone, and see your GlamPoints balance 👤";
      } else {
        response = `For detailed beauty/style help, try our [AI Assistant](/ai-assistant)! Or browse [Salons](/salons) to get started 🌟`;
      }

      setMessages((prev) => [...prev, { role: "assistant", content: response }]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatContent = (content: string) =>
    content
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" class="text-purple-300 hover:text-purple-200 underline font-medium">$1</a>'
      );

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full overflow-hidden shadow-2xl shadow-purple-500/50 flex items-center justify-center group hover:scale-110 hover:ring-2 hover:ring-purple-400 transition-all duration-300 z-50 animate-float"
          aria-label="Open Aura chat"
        >
          <img src="/images/aura-avatar.jpg" alt="Aura Logo" className="w-full h-full object-cover" />
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          className={cn(
            "fixed bottom-6 right-6 w-96 bg-black/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-purple-500/30 flex flex-col z-50 transition-all duration-300",
            isMinimized ? "h-16" : "h-[520px]"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-t-2xl shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden shadow-lg ring-2 ring-purple-500/50">
                <img src="/images/aura-avatar.jpg" alt="Aura Logo" className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">Aura — CuraBot</h3>
                <p className="text-xs text-white/50 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  AI-powered • Navigation Guide
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                aria-label={isMinimized ? "Expand" : "Minimize"}
              >
                {isMinimized ? (
                  <Maximize2 className="w-4 h-4 text-white/60" />
                ) : (
                  <Minimize2 className="w-4 h-4 text-white/60" />
                )}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-white/60" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex gap-2 animate-fade-in",
                      msg.role === "user" ? "flex-row-reverse" : ""
                    )}
                  >
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-md overflow-hidden",
                        msg.role === "user"
                          ? "bg-gradient-to-br from-purple-500 to-pink-500"
                          : "ring-2 ring-purple-500/50"
                      )}
                    >
                      {msg.role === "user" ? (
                        <span className="text-white text-xs font-bold">You</span>
                      ) : (
                        <img src="/images/aura-avatar.jpg" alt="Aura" className="w-full h-full object-cover" />
                      )}
                    </div>

                    <div
                      className={cn(
                        "max-w-[78%] rounded-xl p-3 text-sm leading-relaxed",
                        msg.role === "user"
                          ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-tr-sm"
                          : "bg-white/5 border border-white/10 text-white/90 rounded-tl-sm"
                      )}
                      dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }}
                    />
                  </div>
                ))}

                {isLoading && (
                  <div className="flex gap-2">
                    <div className="w-8 h-8 rounded-full ring-2 ring-purple-500/50 overflow-hidden flex items-center justify-center shadow-md">
                      <img src="/images/aura-avatar.jpg" alt="Aura" className="w-full h-full object-cover" />
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl rounded-tl-sm p-3 flex items-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin text-purple-400" />
                      <span className="text-xs text-white/60">Aura is thinking...</span>
                    </div>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              {/* Quick Actions */}
              {messages.length === 1 && (
                <div className="px-4 pb-3 flex flex-wrap gap-1.5 shrink-0">
                  {QUICK_ACTIONS.map((action, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(action.query)}
                      className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/70 hover:text-white hover:border-purple-500/40 hover:bg-purple-500/10 transition-all"
                    >
                      {action.text}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div className="p-3 border-t border-white/10 shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isLoading}
                    className={cn(
                      "p-2 rounded-lg transition-all disabled:opacity-50",
                      isRecording
                        ? "bg-red-500 text-white animate-pulse"
                        : "bg-white/5 border border-white/10 text-white/60 hover:bg-white/10"
                    )}
                    title={isRecording ? "Stop recording" : "Voice input"}
                  >
                    {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    placeholder="Ask me anything about CuraStyl..."
                    className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-white/40 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 outline-none"
                  />
                  <button
                    onClick={() => sendMessage()}
                    disabled={isLoading || !input.trim()}
                    className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <Send className="w-4 h-4 text-white" />
                  </button>
                </div>

                <Link href="/ai-assistant">
                  <div className="mt-2 text-center">
                    <span className="text-[10px] text-purple-300 hover:text-purple-200 underline cursor-pointer">
                      ✨ Need beauty advice? Try Full AI Assistant →
                    </span>
                  </div>
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
