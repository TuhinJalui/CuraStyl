/**
 * 🎯 TIER 3 STRUCTURED RESPONSE ENGINE
 * Parses AI responses into rich structured data for UI display
 */

export interface StyleArchetypeResult {
  archetype: string;
  icon: string;
  confidence: number;
  traits: string[];
  description: string;
}

export interface ConfidenceMatrix {
  suitability: number;
  maintenance: number;
  lifestyle: number;
  budget: number;
  overall: number;
  recommendation: "HIGHLY RECOMMENDED" | "RECOMMENDED" | "PROCEED WITH CAUTION" | "NOT RECOMMENDED";
}

export interface TransformationPhase {
  phase: "immediate" | "30-day" | "90-day" | "special-event";
  label: string;
  timeline: string;
  investment: string;
  impact: string;
  confidence: number;
  steps: string[];
  weeklyCommitment: string;
}

export interface RegretRisk {
  category: string;
  probability: number; // 0-100
  level: "low" | "medium" | "high";
  warning: string;
  solution: string;
}

export interface FirstImpressionScore {
  scenario: string;
  current: Record<string, number>;
  proposed: Record<string, number>;
  insight: string;
}

export interface StyleConflict {
  conflict: string;
  severity: "warning" | "critical";
  solution: string;
}

export interface Tier3StructuredOutput {
  archetype?: StyleArchetypeResult;
  confidenceMatrix?: ConfidenceMatrix;
  transformationRoadmap?: TransformationPhase[];
  regretRisks?: RegretRisk[];
  firstImpression?: FirstImpressionScore;
  styleConflicts?: StyleConflict[];
  hiddenPotential?: string[];
  salonMatches?: {
    name: string;
    matchScore: number;
    reasons: string[];
    slug?: string;
  }[];
}

const ARCHETYPES = {
  "Urban Executive": { icon: "🏢", traits: ["polished", "minimal", "powerful"] },
  "Modern Maharaja": { icon: "👑", traits: ["regal", "luxurious", "traditional-modern"] },
  "Korean Minimalist": { icon: "🌸", traits: ["clean", "youthful", "subtle"] },
  "Creative Rebel": { icon: "🎨", traits: ["bold", "experimental", "trendsetting"] },
  "Luxury Sophisticate": { icon: "💎", traits: ["refined", "elegant", "timeless"] },
  "Effortless Cool": { icon: "🎯", traits: ["natural", "confident", "understated"] },
  "Power Performer": { icon: "⚡", traits: ["high-impact", "memorable", "statement"] },
  "Wellness Warrior": { icon: "🌿", traits: ["natural", "organic", "holistic"] },
};

/**
 * Build the Tier 3 enhanced system prompt suffix
 * This is appended to requests to get structured JSON output
 */
export function buildTier3PromptSuffix(requestType: string): string {
  return `

---
## STRUCTURED OUTPUT REQUIREMENT

In addition to your main response, append a JSON block at the END of your response wrapped in \`\`\`json\n...\n\`\`\`. This JSON will be used to render visual UI components.

Based on the conversation, include ONLY the fields that are relevant:

\`\`\`json
{
  "archetype": {
    "name": "Urban Executive | Modern Maharaja | Korean Minimalist | Creative Rebel | Luxury Sophisticate | Effortless Cool | Power Performer | Wellness Warrior",
    "confidence": 0-100,
    "description": "one line description of why this archetype fits"
  },
  "confidenceMatrix": {
    "suitability": 0-100,
    "maintenance": 0-100,
    "lifestyle": 0-100,
    "budget": 0-100,
    "overall": 0-100
  },
  "regretRisks": [
    { "category": "High Maintenance Risk", "probability": 0-100, "warning": "brief warning", "solution": "brief solution" }
  ],
  "transformationRoadmap": [
    { "phase": "immediate", "label": "Quick Win (0-7 days)", "investment": "₹X-Y", "impact": "X% improvement", "keySteps": ["step1", "step2", "step3"] },
    { "phase": "30-day", "label": "30-Day Evolution", "investment": "₹X-Y", "impact": "X% transformation", "keySteps": ["step1", "step2"] },
    { "phase": "90-day", "label": "90-Day Metamorphosis", "investment": "₹X-Y", "impact": "X% transformation", "keySteps": ["step1", "step2"] }
  ],
  "styleConflicts": [
    { "conflict": "description of conflict", "severity": "warning|critical", "solution": "brief solution" }
  ],
  "firstImpression": {
    "scenario": "Job Interview | First Date | Wedding | etc",
    "metrics": {
      "Authority": { "before": 0-10, "after": 0-10 },
      "Approachability": { "before": 0-10, "after": 0-10 },
      "Innovation": { "before": 0-10, "after": 0-10 },
      "Trustworthiness": { "before": 0-10, "after": 0-10 },
      "Memorability": { "before": 0-10, "after": 0-10 }
    }
  },
  "hiddenPotential": ["opportunity 1", "opportunity 2", "opportunity 3"]
}
\`\`\`

Only include fields with meaningful data. Omit fields that don't apply.
`;
}

/**
 * Parse the AI response to extract structured JSON and clean text
 */
export function parseStructuredResponse(rawResponse: string): {
  text: string;
  structured: Tier3StructuredOutput | null;
} {
  // Find JSON block
  const jsonMatch = rawResponse.match(/```json\n([\s\S]*?)\n```/);
  if (!jsonMatch) {
    return { text: rawResponse, structured: null };
  }

  const cleanText = rawResponse.replace(/```json\n[\s\S]*?\n```/g, "").trim();

  try {
    const raw = JSON.parse(jsonMatch[1]);
    const structured: Tier3StructuredOutput = {};

    // Parse archetype
    if (raw.archetype?.name) {
      const archetypeData = ARCHETYPES[raw.archetype.name as keyof typeof ARCHETYPES];
      structured.archetype = {
        archetype: raw.archetype.name,
        icon: archetypeData?.icon || "✨",
        confidence: raw.archetype.confidence || 70,
        traits: archetypeData?.traits || [],
        description: raw.archetype.description || "",
      };
    }

    // Parse confidence matrix
    if (raw.confidenceMatrix) {
      const cm = raw.confidenceMatrix;
      const overall = cm.overall || Math.round((cm.suitability + cm.maintenance + cm.lifestyle + cm.budget) / 4);
      structured.confidenceMatrix = {
        suitability: cm.suitability || 0,
        maintenance: cm.maintenance || 0,
        lifestyle: cm.lifestyle || 0,
        budget: cm.budget || 0,
        overall,
        recommendation:
          overall >= 85 ? "HIGHLY RECOMMENDED" :
          overall >= 70 ? "RECOMMENDED" :
          overall >= 50 ? "PROCEED WITH CAUTION" :
          "NOT RECOMMENDED",
      };
    }

    // Parse regret risks
    if (Array.isArray(raw.regretRisks)) {
      structured.regretRisks = raw.regretRisks.map((r: any) => ({
        category: r.category,
        probability: r.probability,
        level: r.probability >= 70 ? "high" : r.probability >= 40 ? "medium" : "low",
        warning: r.warning,
        solution: r.solution,
      }));
    }

    // Parse transformation roadmap
    if (Array.isArray(raw.transformationRoadmap)) {
      structured.transformationRoadmap = raw.transformationRoadmap.map((p: any) => ({
        phase: p.phase,
        label: p.label,
        timeline: p.phase === "immediate" ? "0-7 days" : p.phase === "30-day" ? "1 month" : "3 months",
        investment: p.investment,
        impact: p.impact,
        confidence: p.confidence || 80,
        steps: p.keySteps || [],
        weeklyCommitment: p.weeklyCommitment || "2-3 hrs/week",
      }));
    }

    // Parse style conflicts
    if (Array.isArray(raw.styleConflicts)) {
      structured.styleConflicts = raw.styleConflicts;
    }

    // Parse first impression
    if (raw.firstImpression) {
      structured.firstImpression = {
        scenario: raw.firstImpression.scenario,
        current: Object.fromEntries(
          Object.entries(raw.firstImpression.metrics || {}).map(([k, v]: any) => [k, v.before])
        ),
        proposed: Object.fromEntries(
          Object.entries(raw.firstImpression.metrics || {}).map(([k, v]: any) => [k, v.after])
        ),
        insight: raw.firstImpression.insight || "",
      };
    }

    // Parse hidden potential
    if (Array.isArray(raw.hiddenPotential)) {
      structured.hiddenPotential = raw.hiddenPotential;
    }

    return { text: cleanText, structured };
  } catch (err) {
    console.error("[Tier3] Failed to parse structured JSON:", err);
    return { text: cleanText, structured: null };
  }
}
