"use client";

import Link from "next/link";
import { Sparkles, ChevronLeft, User, Scissors, Wand2, Star } from "lucide-react";

export default function ARHairstyleTryOn() {
  return (
    <div className="min-h-screen gradient-hero pt-24 pb-16 flex flex-col justify-center items-center px-4 relative overflow-hidden">
      {/* Background radial glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-4xl w-full text-center relative z-10 space-y-8">
        {/* Back Link */}
        <div className="flex justify-start">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors group">
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to Dashboard
          </Link>
        </div>

        {/* Header */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-xs font-semibold text-purple-300">
            <Sparkles className="w-3.5 h-3.5" />
            AI-Powered Virtual Mirror
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white font-display">
            AR Virtual <span className="gradient-text">Try-On</span>
          </h1>
          <p className="text-white/60 text-lg max-w-xl mx-auto leading-relaxed">
            Visualize hairstyles, cuts, colors, and styling options live with real-time 3D face mesh tracking.
          </p>
        </div>

        {/* Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto pt-4">
          {/* Men's Try-On */}
          <Link href="/virtual-tryon/men" className="group text-left p-8 rounded-3xl bg-white/3 border border-white/10 backdrop-blur-xl hover:border-blue-500/40 hover:bg-blue-500/5 transition-all duration-500 shadow-xl shadow-black/25 flex flex-col justify-between min-h-[300px]">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center group-hover:scale-110 transition-all duration-500 group-hover:shadow-lg group-hover:shadow-blue-500/20">
                <User className="w-7 h-7 text-blue-400" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white group-hover:text-blue-300 transition-colors">Men&apos;s Experience</h2>
                <p className="text-sm text-white/50 leading-relaxed">
                  Try on masculine hairstyles, smart haircuts, beard styling, and explore custom hair colors in 3D.
                </p>
              </div>
            </div>
            <div className="mt-8 flex items-center gap-2 text-xs font-semibold text-blue-400 group-hover:translate-x-1.5 transition-transform duration-300">
              Start Men&apos;s Mirror <Wand2 className="w-3.5 h-3.5 animate-pulse" />
            </div>
          </Link>

          {/* Women's Try-On */}
          <Link href="/virtual-tryon/women" className="group text-left p-8 rounded-3xl bg-white/3 border border-white/10 backdrop-blur-xl hover:border-pink-500/40 hover:bg-pink-500/5 transition-all duration-500 shadow-xl shadow-black/25 flex flex-col justify-between min-h-[300px]">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center group-hover:scale-110 transition-all duration-500 group-hover:shadow-lg group-hover:shadow-pink-500/20">
                <User className="w-7 h-7 text-pink-400" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white group-hover:text-pink-300 transition-colors">Women&apos;s Experience</h2>
                <p className="text-sm text-white/50 leading-relaxed">
                  Explore fresh hair catalog designs, hair spa cuts, highlights, blowouts, and complete makeup makeovers.
                </p>
              </div>
            </div>
            <div className="mt-8 flex items-center gap-2 text-xs font-semibold text-pink-400 group-hover:translate-x-1.5 transition-transform duration-300">
              Start Women&apos;s Mirror <Wand2 className="w-3.5 h-3.5 animate-pulse" />
            </div>
          </Link>
        </div>

        {/* Feature Highlights */}
        <div className="max-w-xl mx-auto flex items-center justify-center gap-6 text-xs text-white/40 pt-4 flex-wrap">
          <span className="flex items-center gap-1.5"><Scissors className="w-3.5 h-3.5" /> 3D Model Previews</span>
          <span className="flex items-center gap-1.5"><Star className="w-3.5 h-3.5" /> Live Camera Tracking</span>
          <span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Instant Styling</span>
        </div>
      </div>
    </div>
  );
}
