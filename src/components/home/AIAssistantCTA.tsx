import Link from "next/link";
import { Sparkles, MessageCircle, Wand2, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AIAssistantCTA() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="relative rounded-3xl overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/60 via-violet-800/40 to-pink-900/40" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,rgba(168,85,247,0.3),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_50%,rgba(236,72,153,0.2),transparent_60%)]" />
        <div className="absolute inset-0 border border-purple-500/20 rounded-3xl" />

        {/* Floating elements */}
        <div className="absolute top-6 right-12 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl" />
        <div className="absolute bottom-6 left-12 w-24 h-24 bg-pink-500/10 rounded-full blur-2xl" />

        <div className="relative z-10 p-10 md:p-16 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/30 mb-6">
              <Brain className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-purple-300 font-medium">Powered by GPT-4</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-5 leading-tight">
              Meet Your AI{" "}
              <span className="gradient-text">Beauty Advisor</span>
            </h2>

            <p className="text-white/60 text-lg mb-6 leading-relaxed">
              Get personalized salon recommendations, instant answers to beauty questions, and curated packages — all powered by AI.
            </p>

            <div className="space-y-3 mb-8">
              {[
                '"Suggest bridal makeup under ₹5000 near Bandra"',
                '"Best haircut for curly hair in Andheri?"',
                '"Find spa packages with 4.8+ rating in Juhu"',
              ].map((q) => (
                <div
                  key={q}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white/70 hover:bg-white/8 transition-colors cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 text-purple-400 shrink-0" />
                  <span className="italic">{q}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <Link href="/ai-assistant">
                <Button size="lg" className="gap-2">
                  <Sparkles className="w-5 h-5" />
                  Try AI Assistant Free
                </Button>
              </Link>
              <Link href="/salons">
                <Button variant="glass" size="lg">
                  Browse Salons
                </Button>
              </Link>
            </div>
          </div>

          {/* Chat preview */}
          <div className="hidden md:block">
            <div className="glass-dark rounded-2xl border border-purple-500/20 p-5 space-y-4 shadow-2xl">
              <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Wand2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">CuraAI Assistant</p>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs text-white/40">Online</span>
                  </div>
                </div>
              </div>

              {[
                { role: "user", msg: "Bridal makeup under ₹8000 near Bandra?" },
                { role: "ai", msg: "Found 3 perfect matches! Cura Studio by Rashmi (₹4,999 ⭐4.8) and Bridal Bliss Studio (₹6,500 ⭐4.9) are top picks in Bandra with excellent bridal packages." },
                { role: "user", msg: "Book Bridal Bliss for Dec 20th" },
                { role: "ai", msg: "✨ I've checked availability for Dec 20th at Bridal Bliss Studio. They have slots at 10:00 AM and 2:00 PM. Which time works for you?" },
              ].map((item, i) => (
                <div key={i} className={`flex gap-2 ${item.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    item.role === "user"
                      ? "bg-purple-500/30 border border-purple-500/30 text-white"
                      : "bg-white/5 border border-white/10 text-white/80"
                  }`}>
                    {item.msg}
                  </div>
                </div>
              ))}

              <div className="flex items-center gap-2 pt-1">
                <div className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white/30">
                  Ask anything about beauty…
                </div>
                <button className="p-2 rounded-xl bg-purple-500/20 border border-purple-500/30 hover:bg-purple-500/30 transition-colors">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
