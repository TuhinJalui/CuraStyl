"use client";

import { motion } from "framer-motion";
import { 
  Mic, Camera, Sparkles, Zap, Brain, MessageSquare,
  TrendingUp, Award, Shield, Rocket, X
} from "lucide-react";

interface AIFeatureShowcaseProps {
  onClose?: () => void;
}

const features = [
  {
    icon: <Mic className="w-6 h-6" />,
    title: "Voice Conversations",
    description: "Speak naturally and get instant voice responses",
    color: "from-purple-500 to-pink-500",
    delay: 0.1,
  },
  {
    icon: <Camera className="w-6 h-6" />,
    title: "Image Analysis",
    description: "Upload selfies for personalized beauty insights",
    color: "from-pink-500 to-rose-500",
    delay: 0.2,
  },
  {
    icon: <Sparkles className="w-6 h-6" />,
    title: "Smart Recommendations",
    description: "AI-powered salon matching based on your needs",
    color: "from-rose-500 to-orange-500",
    delay: 0.3,
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: "Real-time Streaming",
    description: "See responses appear instantly as AI types",
    color: "from-orange-500 to-amber-500",
    delay: 0.4,
  },
  {
    icon: <Brain className="w-6 h-6" />,
    title: "Context Memory",
    description: "Remembers your preferences and history",
    color: "from-amber-500 to-yellow-500",
    delay: 0.5,
  },
  {
    icon: <MessageSquare className="w-6 h-6" />,
    title: "Multi-Personality",
    description: "Switch between Professional, Friendly, or Expert modes",
    color: "from-yellow-500 to-lime-500",
    delay: 0.6,
  },
];

const stats = [
  { icon: <TrendingUp />, value: "95%", label: "Accuracy Rate" },
  { icon: <Award />, value: "<2s", label: "Response Time" },
  { icon: <Shield />, value: "100%", label: "Privacy Safe" },
  { icon: <Rocket />, value: "24/7", label: "Always Online" },
];

export default function AIFeatureShowcase({ onClose }: AIFeatureShowcaseProps) {
  return (
    <div className="py-6 px-4 bg-[#0a0a0f] rounded-2xl border border-white/10 relative">
      {/* Close Button */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
        >
          <X className="w-6 h-6" />
        </button>
      )}
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-purple-500/30 mb-4">
            <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
            <span className="text-sm text-purple-300 font-medium">Powered by GPT-4</span>
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Meet <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">GlamAI Pro</span>
          </h2>
          
          <p className="text-base text-white/60 max-w-2xl mx-auto">
            Your intelligent beauty companion that understands, recommends, and transforms your salon experience with cutting-edge AI technology.
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: feature.delay }}
              whileHover={{ scale: 1.05, y: -5 }}
              className="glass rounded-2xl p-4 border border-white/10 hover:border-purple-500/30 transition-all duration-300 group"
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-3 shadow-lg group-hover:shadow-xl transition-shadow duration-300`}>
                <div className="text-white">
                  {feature.icon}
                </div>
              </div>
              
              <h3 className="text-base font-semibold text-white mb-1 group-hover:text-purple-300 transition-colors">
                {feature.title}
              </h3>
              
              <p className="text-xs text-white/60 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6"
        >
          {stats.map((stat, index) => (
            <div
              key={index}
              className="glass rounded-xl p-4 border border-white/10 text-center hover:border-purple-500/30 transition-all duration-300"
            >
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center mx-auto mb-2">
                <div className="text-purple-400">
                  {stat.icon}
                </div>
              </div>
              <div className="text-xl md:text-2xl font-bold text-white mb-0.5">
                {stat.value}
              </div>
              <div className="text-xs text-white/50">
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="text-center mt-4"
        >
          <a
            href="/ai-assistant"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white font-semibold shadow-2xl shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-105 transition-all duration-300 text-sm"
          >
            <Sparkles className="w-4 h-4" />
            <span>Try GlamAI Pro Now</span>
          </a>
        </motion.div>
      </div>
    </div>
  );
}