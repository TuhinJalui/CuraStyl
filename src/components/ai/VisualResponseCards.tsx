"use client";

import { 
  TrendingUp, Award, Clock, Zap, Star, CheckCircle2, AlertCircle,
  Sparkles, Target, Heart, Brain, Shield, Rocket, Users, MapPin,
  Calendar, DollarSign, Activity
} from "lucide-react";
import Image from "next/image";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface ImageResult {
  url: string;
  alt?: string;
}

export function ImageGrid({ images }: { images: ImageResult[] }) {
  if (!images || images.length === 0) return null;

  return (
    <div className="mt-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {images.map((image, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="relative group"
          >
            <div className="aspect-square rounded-xl overflow-hidden border border-white/10 bg-white/5">
              <img
                src={image.url}
                alt={image.alt || `Image ${index + 1}`}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1595777707802-038daca6d617?w=400&h=400&fit=crop';
                }}
              />
            </div>
            {image.alt && (
              <p className="mt-1 text-xs text-white/70 line-clamp-2 text-center">
                {image.alt}
              </p>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Style Identity Card with Avatar
export function StyleIdentityCard({ identity }: { identity: any }) {
  const avatars: Record<string, string> = {
    "Urban Executive": "👔",
    "Modern Maharaja": "👑",
    "Korean Minimalist": "🌸",
    "Creative Rebel": "🎨",
    "Luxury Sophisticate": "💎",
    "Effortless Cool": "😎",
    "Power Performer": "⚡",
    "Wellness Warrior": "🌿",
  };

  const safeIdentity = identity || {};
  const archetype = safeIdentity.archetype || "Unknown";
  const confidence = Number(safeIdentity.confidence) || 0;
  const traits = Array.isArray(safeIdentity.traits)
    ? safeIdentity.traits
    : typeof safeIdentity.traits === "string"
    ? safeIdentity.traits.split(",").map((t: any) => String(t).trim()).filter(Boolean)
    : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 p-5 rounded-2xl bg-gradient-to-br from-purple-500/20 via-pink-500/15 to-orange-500/10 border border-purple-500/30 backdrop-blur-sm"
    >
      <div className="flex items-start gap-4">
        <div className="text-5xl">{avatars[archetype] || "✨"}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="text-lg font-bold text-white">{archetype}</h4>
            <span className="px-2 py-0.5 rounded-full bg-purple-500/30 text-xs text-purple-200 font-medium">
              {confidence}% match
            </span>
          </div>
          <p className="text-sm text-white/70 mb-3">Your detected style personality</p>
          
          {/* Progress bar */}
          <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-3">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${confidence}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500"
            />
          </div>

          {/* Key traits */}
          <div className="flex flex-wrap gap-2">
            {traits.slice(0, 4).map((trait: string, i: number) => (
              <span
                key={i}
                className="px-2 py-1 rounded-lg bg-white/10 text-xs text-white/80"
              >
                {trait}
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Transformation Roadmap with Timeline
export function TransformationRoadmap({ phases }: { phases: any[] }) {
  return (
    <div className="mt-4 space-y-4">
      {phases.map((phase, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="relative"
        >
          {/* Timeline connector */}
          {index < phases.length - 1 && (
            <div className="absolute left-6 top-16 w-0.5 h-full bg-gradient-to-b from-purple-500/50 to-transparent" />
          )}

          <div className="flex gap-4">
            {/* Phase icon */}
            <div className="relative z-10 w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30 shrink-0">
              {phase.icon || <Rocket className="w-6 h-6 text-white" />}
            </div>

            {/* Phase content */}
            <div className="flex-1 glass rounded-xl p-4 border border-white/10">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h5 className="font-bold text-white">{phase.title}</h5>
                  <p className="text-xs text-white/60">{phase.timeline}</p>
                </div>
                <span className="px-2 py-1 rounded-lg bg-green-500/20 text-xs text-green-300 font-medium">
                  {phase.impact}
                </span>
              </div>

              <p className="text-sm text-white/80 mb-3">{phase.description}</p>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 rounded-lg bg-white/5">
                  <div className="flex items-center gap-1 text-xs text-white/50 mb-1">
                    <DollarSign className="w-3 h-3" />
                    <span>Cost</span>
                  </div>
                  <p className="text-sm font-semibold text-white">{phase.cost}</p>
                </div>
                <div className="p-2 rounded-lg bg-white/5">
                  <div className="flex items-center gap-1 text-xs text-white/50 mb-1">
                    <Clock className="w-3 h-3" />
                    <span>Effort</span>
                  </div>
                  <p className="text-sm font-semibold text-white">{phase.effort}</p>
                </div>
                <div className="p-2 rounded-lg bg-white/5">
                  <div className="flex items-center gap-1 text-xs text-white/50 mb-1">
                    <Activity className="w-3 h-3" />
                    <span>Maintain</span>
                  </div>
                  <p className="text-sm font-semibold text-white">{phase.maintenance}</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// Confidence Score Radar
export function ConfidenceScoreCard({ scores }: { scores: any }) {
  const metrics = [
    { label: "Suitability", value: scores.suitability, icon: <Target className="w-4 h-4" /> },
    { label: "Maintenance", value: scores.maintenance, icon: <Activity className="w-4 h-4" /> },
    { label: "Lifestyle", value: scores.lifestyle, icon: <Heart className="w-4 h-4" /> },
    { label: "Budget", value: scores.budget, icon: <DollarSign className="w-4 h-4" /> },
  ];

  const overall = Math.round(
    (scores.suitability + scores.maintenance + scores.lifestyle + scores.budget) / 4
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mt-4 p-5 rounded-2xl glass border border-white/10"
    >
      <div className="text-center mb-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 mb-2">
          <Award className="w-5 h-5 text-purple-400" />
          <span className="text-lg font-bold text-white">{overall}%</span>
        </div>
        <p className="text-sm text-white/60">Overall Confidence</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {metrics.map((metric, i) => (
          <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <div className="text-purple-400">{metric.icon}</div>
              <span className="text-xs text-white/70">{metric.label}</span>
            </div>
            
            {/* Progress bar */}
            <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-1">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${metric.value}%` }}
                transition={{ duration: 0.8, delay: i * 0.1 }}
                className={cn(
                  "h-full",
                  metric.value >= 80 ? "bg-green-500" :
                  metric.value >= 60 ? "bg-yellow-500" :
                  "bg-orange-500"
                )}
              />
            </div>
            
            <p className="text-sm font-bold text-white">{metric.value}%</p>
          </div>
        ))}
      </div>

      {/* Recommendation badge */}
      <div className={cn(
        "mt-4 p-3 rounded-xl border text-center",
        overall >= 80 ? "bg-green-500/10 border-green-500/30" :
        overall >= 60 ? "bg-yellow-500/10 border-yellow-500/30" :
        "bg-orange-500/10 border-orange-500/30"
      )}>
        <div className="flex items-center justify-center gap-2">
          {overall >= 80 ? (
            <>
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              <span className="font-semibold text-green-300">Highly Recommended</span>
            </>
          ) : overall >= 60 ? (
            <>
              <AlertCircle className="w-5 h-5 text-yellow-400" />
              <span className="font-semibold text-yellow-300">Good Match</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-5 h-5 text-orange-400" />
              <span className="font-semibold text-orange-300">Consider Alternatives</span>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Salon Match Card with Image
export function SalonMatchCard({ salon }: { salon: any }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className="mt-4 rounded-2xl glass border border-white/10 overflow-hidden hover:border-purple-500/30 transition-all duration-300"
    >
      {/* Salon image */}
      {salon.image && (
        <div className="relative h-32 bg-gradient-to-br from-purple-500/20 to-pink-500/20">
          <Image
            src={salon.image}
            alt={salon.name}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          
          {/* Match badge */}
          <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-green-500/90 backdrop-blur-sm flex items-center gap-1">
            <Star className="w-3 h-3 text-white fill-white" />
            <span className="text-xs font-bold text-white">{salon.matchScore}% Match</span>
          </div>
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h5 className="font-bold text-white mb-1">{salon.name}</h5>
            <div className="flex items-center gap-2 text-xs text-white/60">
              <MapPin className="w-3 h-3" />
              <span>{salon.area}</span>
              <span>•</span>
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                <span>{salon.rating}</span>
              </div>
            </div>
          </div>
          {salon.verified && (
            <div className="px-2 py-1 rounded-lg bg-blue-500/20 text-xs text-blue-300">
              ✓ Verified
            </div>
          )}
        </div>

        <p className="text-sm text-white/80 mb-3">{salon.matchReason}</p>

        {/* Why perfect match */}
        <div className="space-y-2 mb-3">
          {salon.matchFactors?.map((factor: string, i: number) => (
            <div key={i} className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
              <span className="text-xs text-white/70">{factor}</span>
            </div>
          ))}
        </div>

        {/* Price and action */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10">
          <div>
            <p className="text-xs text-white/50">Starting from</p>
            <p className="text-lg font-bold text-white">₹{salon.price}</p>
          </div>
          <a
            href={`/salons/${salon.slug}`}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium hover:shadow-lg hover:shadow-purple-500/30 transition-all"
          >
            View Salon →
          </a>
        </div>
      </div>
    </motion.div>
  );
}

// Perception Impact Simulator
export function PerceptionImpactCard({ scenario, current, proposed }: { scenario: string; current: any; proposed: any }) {
  const metrics = ["Authority", "Approachability", "Innovation", "Trustworthiness"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 p-5 rounded-2xl glass border border-white/10"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
          <Users className="w-5 h-5 text-white" />
        </div>
        <div>
          <h5 className="font-bold text-white">{scenario}</h5>
          <p className="text-xs text-white/60">Perception Impact Prediction</p>
        </div>
      </div>

      <div className="space-y-3">
        {metrics.map((metric, i) => {
          const currentVal = current[metric.toLowerCase()] || 5;
          const proposedVal = proposed[metric.toLowerCase()] || 5;
          const change = proposedVal - currentVal;

          return (
            <div key={i} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/70">{metric}</span>
                <div className="flex items-center gap-2">
                  <span className="text-white/50">{currentVal}/10</span>
                  <span className="text-white/30">→</span>
                  <span className={cn(
                    "font-bold",
                    change > 0 ? "text-green-400" : change < 0 ? "text-orange-400" : "text-white"
                  )}>
                    {proposedVal}/10
                    {change !== 0 && (
                      <span className="ml-1 text-xs">
                        ({change > 0 ? "+" : ""}{change})
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* Visual bar */}
              <div className="flex gap-1 h-2">
                {[...Array(10)].map((_, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex-1 rounded-full transition-all duration-500",
                      idx < currentVal ? "bg-white/20" : "bg-white/5",
                      idx < proposedVal && change > 0 ? "bg-green-500" : "",
                      idx >= proposedVal && idx < currentVal && change < 0 ? "bg-orange-500" : ""
                    )}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Impact summary */}
      <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-green-500/10 to-cyan-500/10 border border-green-500/30">
        <div className="flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
          <p className="text-xs text-white/80">
            This transformation adds <span className="font-bold text-green-300">+{
              metrics.reduce((sum, m) => {
                const curr = current[m.toLowerCase()] || 5;
                const prop = proposed[m.toLowerCase()] || 5;
                return sum + Math.max(0, prop - curr);
              }, 0)
            } points</span> to your overall presence in {scenario.toLowerCase()} settings.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// Regret Prevention Warning
export function RegretPreventionCard({ warnings }: { warnings: any[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mt-4 p-5 rounded-2xl bg-orange-500/10 border border-orange-500/30"
    >
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5 text-orange-400" />
        <h5 className="font-bold text-white">Regret Prevention Analysis</h5>
      </div>

      <div className="space-y-3">
        {warnings.map((warning, i) => (
          <div
            key={i}
            className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10"
          >
            <div className={cn(
              "w-12 h-12 rounded-lg flex items-center justify-center shrink-0",
              warning.severity === "high" ? "bg-red-500/20 text-red-400" :
              warning.severity === "medium" ? "bg-orange-500/20 text-orange-400" :
              "bg-yellow-500/20 text-yellow-400"
            )}>
              <span className="text-xl font-bold">{warning.probability}%</span>
            </div>

            <div className="flex-1">
              <h6 className="font-semibold text-white mb-1">{warning.title}</h6>
              <p className="text-xs text-white/70 mb-2">{warning.description}</p>
              
              {warning.solution && (
                <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                  <p className="text-xs text-green-300">
                    <strong>Solution:</strong> {warning.solution}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// Hidden Potential Discovery
export function HiddenPotentialCard({ discoveries }: { discoveries: string[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 p-5 rounded-2xl bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-purple-500/10 border border-cyan-500/30"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
          <Brain className="w-5 h-5 text-white" />
        </div>
        <div>
          <h5 className="font-bold text-white">Hidden Potential Unlocked</h5>
          <p className="text-xs text-white/60">Opportunities you might have missed</p>
        </div>
      </div>

      <div className="space-y-2">
        {discoveries.map((discovery, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-start gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <p className="text-sm text-white/80">{discovery}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
