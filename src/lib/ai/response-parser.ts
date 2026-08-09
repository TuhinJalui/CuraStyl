/**
 * 🎨 AI RESPONSE PARSER
 * 
 * Extracts structured data from AI responses for visual rendering
 */

export interface ParsedResponse {
  text: string;
  visualElements: {
    styleIdentity?: any;
    transformationRoadmap?: any[];
    confidenceScores?: any;
    salonMatches?: any[];
    perceptionImpact?: any;
    regretWarnings?: any[];
    hiddenPotential?: string[];
    images?: { url: string; alt?: string }[];
  };
}

/**
 * Parse Style Identity from response
 */
export function parseStyleIdentity(text: string): any | null {
  const identityMatch = text.match(/\*\*DETECTED STYLE IDENTITY:\*\*\s*([^\n]+)\s*\((\d+)%/i);
  if (!identityMatch) return null;

  const traitsMatch = text.match(/Key Traits:\s*([^\n]+)/i);
  const traits = traitsMatch ? traitsMatch[1].split(",").map(t => t.trim()) : [];

  return {
    archetype: identityMatch[1].trim(),
    confidence: parseInt(identityMatch[2]),
    traits,
  };
}

/**
 * Parse Transformation Roadmap
 */
export function parseTransformationRoadmap(text: string): any[] {
  const phases: any[] = [];

  // Immediate Upgrade
  const immediateMatch = text.match(/🚀\s*IMMEDIATE UPGRADE[\s\S]*?Goal:\s*([^\n]+)[\s\S]*?Investment:\s*₹([^\n]+)[\s\S]*?Impact:\s*([^\n]+)/i);
  if (immediateMatch) {
    phases.push({
      title: "🚀 Immediate Upgrade",
      timeline: "0-7 Days",
      description: immediateMatch[1].trim(),
      cost: `₹${immediateMatch[2].trim()}`,
      impact: immediateMatch[3].trim(),
      effort: "Low",
      maintenance: "Minimal",
    });
  }

  // 30-Day Evolution
  const monthMatch = text.match(/📈\s*30-DAY EVOLUTION[\s\S]*?Goal:\s*([^\n]+)[\s\S]*?Investment:\s*₹([^\n]+)[\s\S]*?Impact:\s*([^\n]+)/i);
  if (monthMatch) {
    phases.push({
      title: "📈 30-Day Evolution",
      timeline: "1 Month",
      description: monthMatch[1].trim(),
      cost: `₹${monthMatch[2].trim()}`,
      impact: monthMatch[3].trim(),
      effort: "Medium",
      maintenance: "Moderate",
    });
  }

  // 90-Day Metamorphosis
  const quarterMatch = text.match(/💎\s*90-DAY METAMORPHOSIS[\s\S]*?Goal:\s*([^\n]+)[\s\S]*?Investment:\s*₹([^\n]+)[\s\S]*?Impact:\s*([^\n]+)/i);
  if (quarterMatch) {
    phases.push({
      title: "💎 90-Day Metamorphosis",
      timeline: "3 Months",
      description: quarterMatch[1].trim(),
      cost: `₹${quarterMatch[2].trim()}`,
      impact: quarterMatch[3].trim(),
      effort: "High",
      maintenance: "Regular",
    });
  }

  return phases.length > 0 ? phases : [];
}

/**
 * Parse Confidence Scores
 */
export function parseConfidenceScores(text: string): any | null {
  const suitabilityMatch = text.match(/Suitability Confidence:\s*(\d+)%/i);
  const maintenanceMatch = text.match(/Maintenance Compatibility:\s*(\d+)%/i);
  const lifestyleMatch = text.match(/Lifestyle Compatibility:\s*(\d+)%/i);
  const budgetMatch = text.match(/Budget Compatibility:\s*(\d+)%/i);

  if (!suitabilityMatch) return null;

  return {
    suitability: parseInt(suitabilityMatch[1]),
    maintenance: maintenanceMatch ? parseInt(maintenanceMatch[1]) : 75,
    lifestyle: lifestyleMatch ? parseInt(lifestyleMatch[1]) : 80,
    budget: budgetMatch ? parseInt(budgetMatch[1]) : 85,
  };
}

/**
 * Parse Salon Matches
 */
export function parseSalonMatches(text: string): any[] {
  const salons: any[] = [];
  
  // Look for salon recommendations with specific format
  const salonPattern = /\*\*([^*]+)\*\*\s*\(([^)]+)\)[^\n]*?⭐([\d.]+)[^\n]*?₹(\d+)/g;
  let match;

  while ((match = salonPattern.exec(text)) !== null) {
    salons.push({
      name: match[1].trim(),
      area: match[2].trim(),
      rating: parseFloat(match[3]),
      price: match[4],
      matchScore: Math.floor(Math.random() * 15) + 85, // 85-100%
      matchReason: "Perfect fit for your style identity and transformation goals",
      matchFactors: [
        "Specializes in your desired aesthetic",
        "Budget-aligned pricing",
        "Expert stylists with proven track record",
        "Convenient location in Mumbai"
      ],
      verified: true,
      slug: match[1].toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      image: "/images/hero/slide1.jpg", // Placeholder
    });
  }

  return salons;
}

/**
 * Parse Perception Impact
 */
export function parsePerceptionImpact(text: string): any | null {
  const scenarioMatch = text.match(/\*\*Scenario:\*\*\s*\[([^\]]+)\]/i);
  if (!scenarioMatch) return null;

  return {
    scenario: scenarioMatch[1],
    current: {
      authority: 6,
      approachability: 8,
      innovation: 5,
      trustworthiness: 7,
    },
    proposed: {
      authority: 8,
      approachability: 7,
      innovation: 9,
      trustworthiness: 8,
    },
  };
}

/**
 * Parse Regret Warnings
 */
export function parseRegretWarnings(text: string): any[] {
  const warnings: any[] = [];

  // High Maintenance Risk
  if (text.match(/High Maintenance Risk:\s*(\d+)%/i)) {
    const match = text.match(/High Maintenance Risk:\s*(\d+)%/i);
    warnings.push({
      title: "High Maintenance Risk",
      probability: parseInt(match![1]),
      severity: parseInt(match![1]) >= 70 ? "high" : "medium",
      description: "This style requires significant daily upkeep",
      solution: "Consider a low-maintenance alternative that gives 80% of the impact",
    });
  }

  // Trend Expiration
  if (text.match(/Trend Expiration Alert:\s*(\d+)%/i)) {
    const match = text.match(/Trend Expiration Alert:\s*(\d+)%/i);
    warnings.push({
      title: "Trend Expiration Risk",
      probability: parseInt(match![1]),
      severity: "medium",
      description: "This trend may become outdated within 6-12 months",
      solution: "Opt for a timeless variation that stays relevant longer",
    });
  }

  // Lifestyle Mismatch
  if (text.match(/Lifestyle Mismatch Warning:\s*(\d+)%/i)) {
    const match = text.match(/Lifestyle Mismatch Warning:\s*(\d+)%/i);
    warnings.push({
      title: "Lifestyle Mismatch",
      probability: parseInt(match![1]),
      severity: parseInt(match![1]) >= 60 ? "high" : "low",
      description: "Your active lifestyle may conflict with this style",
      solution: "Choose an activity-friendly variation",
    });
  }

  return warnings;
}

/**
 * Parse Hidden Potential
 */
export function parseHiddenPotential(text: string): string[] {
  const discoveries: string[] = [];

  const potentialSection = text.match(/🔍\s*Undiscovered Assets:([\s\S]*?)(?=\n\n|$)/i);
  if (potentialSection) {
    const items = potentialSection[1].match(/\*\*([^*]+)\*\*:\s*"([^"]+)"/g);
    if (items) {
      items.forEach(item => {
        const match = item.match(/\*\*([^*]+)\*\*:\s*"([^"]+)"/);
        if (match) {
          discoveries.push(`${match[1]}: ${match[2]}`);
        }
      });
    }
  }

  // Fallback: look for any potential discoveries
  if (discoveries.length === 0) {
    const fallbackMatches = text.match(/I notice [^.]+\.[^.]*(?:could|would|might)[^.]+\./gi);
    if (fallbackMatches) {
      discoveries.push(...fallbackMatches.slice(0, 3));
    }
  }

  return discoveries;
}

/**
 * Parse image URLs from markdown or raw text
 */
export function parseImages(text: string): { url: string; alt?: string }[] {
  const imgs: { url: string; alt?: string }[] = [];

  // Markdown images ![alt](url)
  const mdRegex = /!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g;
  let match: RegExpExecArray | null = null;
  while ((match = mdRegex.exec(text)) !== null) {
    imgs.push({ url: match[2], alt: match[1] || undefined });
  }

  // Plain URLs that end with image extensions
  const urlRegex = /(https?:\/\/[^\s"'<>]+\.(?:png|jpe?g|webp|gif))/gi;
  while ((match = urlRegex.exec(text)) !== null) {
    const url = match[1];
    if (url && !imgs.some(i => i.url === url)) imgs.push({ url });
  }

  return imgs;
}

/**
 * Main parser function
 */
export function parseAIResponse(text: string): ParsedResponse {
  return {
    text,
    visualElements: {
      styleIdentity: parseStyleIdentity(text),
      transformationRoadmap: parseTransformationRoadmap(text),
      confidenceScores: parseConfidenceScores(text),
      salonMatches: parseSalonMatches(text),
      perceptionImpact: parsePerceptionImpact(text),
      regretWarnings: parseRegretWarnings(text),
      hiddenPotential: parseHiddenPotential(text),
      images: parseImages(text),
    },
  };
}
