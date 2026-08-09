"use client";

import { cn } from "@/lib/utils";
import type { Tier3StructuredOutput } from "@/lib/ai/tier3-engine";

interface Tier3CardsProps {
  data: Tier3StructuredOutput;
}

// ── Circular gauge ────────────────────────────────────────────────────────────
function GaugeCircle({ value, size = 56, stroke = 5, color = "#a855f7" }: {
  value: number; size?: number; stroke?: number; color?: string;
}) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 1s ease" }}
      />
    </svg>
  );
}

// ── Score bar ─────────────────────────────────────────────────────────────────
function ScoreBar({ label, value, max = 10, isPercent = false }: {
  label: string; value: number; max?: number; isPercent?: boolean;
}) {
  const pct = isPercent ? value : (value / max) * 100;
  const color = pct >= 70 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div>
      <div className="flex justify-between text-[11px] mb-1">
        <span className="text-white/60">{label}</span>
        <span className="text-white font-semibold">{isPercent ? `${value}%` : `${value}/${max}`}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ── Style Archetype Card ──────────────────────────────────────────────────────
function ArchetypeCard({ data }: { data: NonNullable<Tier3StructuredOutput["archetype"]> }) {
  return (
    <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-4 mb-3">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xl shadow-lg">
          {data.icon}
        </div>
        <div>
          <p className="text-[10px] text-purple-300 font-semibold uppercase tracking-wider">Style Archetype Detected</p>
          <h4 className="text-white font-bold text-sm">{data.archetype}</h4>
        </div>
        <div className="ml-auto flex flex-col items-center">
          <div className="relative flex items-center justify-center">
            <GaugeCircle value={data.confidence} size={44} stroke={4} />
            <span className="absolute text-[10px] font-bold text-white">{data.confidence}%</span>
          </div>
          <span className="text-[9px] text-white/40 mt-0.5">match</span>
        </div>
      </div>
      <p className="text-xs text-white/60 mb-2">{data.description}</p>
      <div className="flex flex-wrap gap-1.5">
        {data.traits.map((t) => (
          <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Confidence Matrix Card ────────────────────────────────────────────────────
function ConfidenceMatrixCard({ data }: { data: NonNullable<Tier3StructuredOutput["confidenceMatrix"]> }) {
  const dims = [
    { key: "suitability", label: "Suitability", color: "#a855f7" },
    { key: "maintenance", label: "Maintenance Fit", color: "#3b82f6" },
    { key: "lifestyle", label: "Lifestyle Match", color: "#10b981" },
    { key: "budget", label: "Budget Fit", color: "#f59e0b" },
  ] as const;

  const recColor =
    data.recommendation === "HIGHLY RECOMMENDED" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" :
    data.recommendation === "RECOMMENDED" ? "text-blue-400 bg-blue-500/10 border-blue-500/30" :
    data.recommendation === "PROCEED WITH CAUTION" ? "text-amber-400 bg-amber-500/10 border-amber-500/30" :
    "text-red-400 bg-red-500/10 border-red-500/30";

  return (
    <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 mb-3">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-white font-bold text-sm">🎯 Confidence Matrix</h4>
        <div className="relative flex items-center justify-center">
          <GaugeCircle value={data.overall} size={52} stroke={5} color={data.overall >= 70 ? "#10b981" : "#f59e0b"} />
          <span className="absolute text-[11px] font-black text-white">{data.overall}%</span>
        </div>
      </div>
      <div className="space-y-2 mb-3">
        {dims.map(({ key, label, color }) => (
          <ScoreBar key={key} label={label} value={data[key]} isPercent />
        ))}
      </div>
      <div className={cn("text-[10px] font-bold px-3 py-1.5 rounded-full border text-center", recColor)}>
        {data.recommendation}
      </div>
    </div>
  );
}

// ── Transformation Roadmap ────────────────────────────────────────────────────
const PHASE_COLORS = {
  immediate: { bg: "from-green-500/10 to-emerald-500/5", border: "border-green-500/20", dot: "bg-green-400", text: "text-green-300" },
  "30-day": { bg: "from-blue-500/10 to-cyan-500/5", border: "border-blue-500/20", dot: "bg-blue-400", text: "text-blue-300" },
  "90-day": { bg: "from-purple-500/10 to-violet-500/5", border: "border-purple-500/20", dot: "bg-purple-400", text: "text-purple-300" },
  "special-event": { bg: "from-rose-500/10 to-pink-500/5", border: "border-rose-500/20", dot: "bg-rose-400", text: "text-rose-300" },
};

function TransformationRoadmapCard({ phases }: { phases: NonNullable<Tier3StructuredOutput["transformationRoadmap"]> }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/3 p-4 mb-3">
      <h4 className="text-white font-bold text-sm mb-3">🚀 Transformation Roadmap</h4>
      <div className="space-y-3">
        {phases.map((phase, i) => {
          const c = PHASE_COLORS[phase.phase] || PHASE_COLORS.immediate;
          return (
            <div key={i} className={cn("rounded-xl p-3 bg-gradient-to-r border", c.bg, c.border)}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className={cn("w-2 h-2 rounded-full", c.dot)} />
                    <span className={cn("text-xs font-bold", c.text)}>{phase.label}</span>
                  </div>
                  <div className="flex gap-3 text-[10px] text-white/50">
                    <span>💰 {phase.investment}</span>
                    <span>📈 {phase.impact}</span>
                  </div>
                </div>
              </div>
              {phase.steps?.length > 0 && (
                <ul className="space-y-0.5">
                  {phase.steps.slice(0, 3).map((step, si) => (
                    <li key={si} className="text-[10px] text-white/60 flex items-start gap-1.5">
                      <span className={cn("mt-1", c.text)}>•</span>
                      {step}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Regret Risk Meter ─────────────────────────────────────────────────────────
function RegretRisksCard({ risks }: { risks: NonNullable<Tier3StructuredOutput["regretRisks"]> }) {
  return (
    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 mb-3">
      <h4 className="text-white font-bold text-sm mb-3">⚠️ Regret Prevention Analysis</h4>
      <div className="space-y-3">
        {risks.map((risk, i) => {
          const isHigh = risk.level === "high";
          const isMed = risk.level === "medium";
          return (
            <div key={i} className="rounded-xl bg-white/5 border border-white/10 p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-white">{risk.category}</span>
                <span className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-full",
                  isHigh ? "bg-red-500/20 text-red-400" :
                  isMed ? "bg-amber-500/20 text-amber-400" :
                  "bg-green-500/20 text-green-400"
                )}>
                  {isHigh ? "🔴" : isMed ? "🟡" : "🟢"} {risk.probability}%
                </span>
              </div>
              <div className="h-1 rounded-full bg-white/10 overflow-hidden mb-2">
                <div
                  className={cn("h-full rounded-full transition-all duration-700",
                    isHigh ? "bg-red-400" : isMed ? "bg-amber-400" : "bg-green-400"
                  )}
                  style={{ width: `${risk.probability}%` }}
                />
              </div>
              <p className="text-[10px] text-white/50 mb-1">⚠️ {risk.warning}</p>
              <p className="text-[10px] text-emerald-400">✅ {risk.solution}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── First Impression Simulator ────────────────────────────────────────────────
function FirstImpressionCard({ data }: { data: NonNullable<Tier3StructuredOutput["firstImpression"]> }) {
  const metrics = Object.keys(data.proposed);
  return (
    <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4 mb-3">
      <h4 className="text-white font-bold text-sm mb-1">👁️ First Impression Simulator</h4>
      <p className="text-[10px] text-white/40 mb-3">Scenario: {data.scenario}</p>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {metrics.map((metric) => {
          const before = data.current[metric] ?? 5;
          const after = data.proposed[metric] ?? 5;
          const diff = after - before;
          return (
            <div key={metric} className="rounded-xl bg-white/5 border border-white/10 p-2.5">
              <p className="text-[10px] text-white/50 mb-1">{metric}</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/40">{before}</span>
                <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-purple-400 to-pink-400 transition-all duration-700"
                    style={{ width: `${(after / 10) * 100}%` }} />
                </div>
                <span className="text-xs font-bold text-white">{after}</span>
                <span className={cn("text-[10px] font-bold", diff > 0 ? "text-emerald-400" : diff < 0 ? "text-red-400" : "text-white/40")}>
                  {diff > 0 ? `+${diff}` : diff}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {data.insight && (
        <p className="text-[10px] text-white/60 italic border-l-2 border-cyan-500/40 pl-2">{data.insight}</p>
      )}
    </div>
  );
}

// ── Style Conflicts ───────────────────────────────────────────────────────────
function StyleConflictsCard({ conflicts }: { conflicts: NonNullable<Tier3StructuredOutput["styleConflicts"]> }) {
  return (
    <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 mb-3">
      <h4 className="text-white font-bold text-sm mb-3">⚔️ Style Conflicts Detected</h4>
      <div className="space-y-2">
        {conflicts.map((c, i) => (
          <div key={i} className={cn(
            "rounded-xl p-3 border",
            c.severity === "critical" ? "bg-red-500/10 border-red-500/30" : "bg-amber-500/10 border-amber-500/30"
          )}>
            <div className="flex items-start gap-2">
              <span className="text-base">{c.severity === "critical" ? "🚨" : "⚠️"}</span>
              <div>
                <p className="text-xs text-white/80 mb-1">{c.conflict}</p>
                <p className="text-[10px] text-emerald-400">✅ {c.solution}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Hidden Potential ──────────────────────────────────────────────────────────
function HiddenPotentialCard({ items }: { items: string[] }) {
  return (
    <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4 mb-3">
      <h4 className="text-white font-bold text-sm mb-3">💡 Hidden Potential Discovered</h4>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-2 text-xs text-white/70">
            <span className="text-yellow-400 mt-0.5 shrink-0">✦</span>
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Export: All Tier 3 cards ─────────────────────────────────────────────
export default function Tier3Cards({ data }: Tier3CardsProps) {
  const hasData = data.archetype || data.confidenceMatrix || data.transformationRoadmap?.length ||
    data.regretRisks?.length || data.firstImpression || data.styleConflicts?.length || data.hiddenPotential?.length;

  if (!hasData) return null;

  return (
    <div className="mt-3 space-y-0">
      {data.styleConflicts?.length ? <StyleConflictsCard conflicts={data.styleConflicts} /> : null}
      {data.archetype ? <ArchetypeCard data={data.archetype} /> : null}
      {data.confidenceMatrix ? <ConfidenceMatrixCard data={data.confidenceMatrix} /> : null}
      {data.firstImpression ? <FirstImpressionCard data={data.firstImpression} /> : null}
      {data.transformationRoadmap?.length ? <TransformationRoadmapCard phases={data.transformationRoadmap} /> : null}
      {data.regretRisks?.length ? <RegretRisksCard risks={data.regretRisks} /> : null}
      {data.hiddenPotential?.length ? <HiddenPotentialCard items={data.hiddenPotential} /> : null}
    </div>
  );
}
