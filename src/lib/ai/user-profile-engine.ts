/**
 * 🧠 USER PROFILE & STYLE IDENTITY ENGINE
 * 
 * Tracks user interactions and builds intelligent style profiles
 */

import { createClient } from "@supabase/supabase-js";

export interface StyleIdentity {
  archetype: string;
  confidence: number;
  traits: string[];
  inferredFrom: string[];
}

export interface UserStyleProfile {
  userId?: string;
  sessionId: string;
  styleIdentity?: StyleIdentity | null;
  lifeStyle: {
    workSchedule?: string;
    profession?: string;
    activityLevel?: string;
    timeAvailability?: string;
  };
  preferences: {
    maintenanceLevel?: "low" | "medium" | "high";
    budgetRange?: string;
    aestheticPreference?: string[];
    dislikes?: string[];
  };
  history: {
    pastStyles?: string[];
    pastConsultations?: Array<{
      date: Date;
      topic: string;
      recommendation: string;
    }>;
    bookings?: Array<{
      date: Date;
      service: string;
      salon: string;
    }>;
  };
  goals: {
    immediate?: string;
    longTerm?: string;
    specificEvent?: string;
  };
  psychologicalProfile: {
    confidenceLevel?: number;
    riskTolerance?: "conservative" | "moderate" | "adventurous";
    socialContext?: string[];
  };
}

/**
 * Analyze conversation to detect Style Identity
 */
export function detectStyleIdentity(messages: Array<{ role: string; content: string }>): StyleIdentity | null {
  const userMessages = messages.filter(m => m.role === "user").map(m => m.content.toLowerCase());
  const combinedText = userMessages.join(" ");

  const archetypes = [
    {
      name: "Urban Executive",
      keywords: ["professional", "corporate", "meeting", "client", "office", "formal", "minimal", "clean", "polished"],
      score: 0
    },
    {
      name: "Modern Maharaja",
      keywords: ["traditional", "regal", "luxury", "elegant", "sophisticated", "premium", "exclusive"],
      score: 0
    },
    {
      name: "Korean Minimalist",
      keywords: ["korean", "minimalist", "skincare", "clean", "natural", "youthful", "subtle", "k-beauty"],
      score: 0
    },
    {
      name: "Creative Rebel",
      keywords: ["unique", "different", "bold", "creative", "artistic", "experimental", "trendy", "statement"],
      score: 0
    },
    {
      name: "Luxury Sophisticate",
      keywords: ["luxury", "high-end", "premium", "refined", "timeless", "classic", "expensive"],
      score: 0
    },
    {
      name: "Effortless Cool",
      keywords: ["easy", "low maintenance", "effortless", "natural", "casual", "quick", "simple"],
      score: 0
    },
    {
      name: "Power Performer",
      keywords: ["impact", "memorable", "standout", "attention", "impressive", "powerful", "strong"],
      score: 0
    },
    {
      name: "Wellness Warrior",
      keywords: ["natural", "organic", "healthy", "wellness", "holistic", "sustainable", "eco"],
      score: 0
    }
  ];

  // Score each archetype
  archetypes.forEach(archetype => {
    archetype.keywords.forEach(keyword => {
      if (combinedText.includes(keyword)) {
        archetype.score++;
      }
    });
  });

  // Find top archetype
  const topArchetype = archetypes.reduce((max, arch) => 
    arch.score > max.score ? arch : max
  );

  if (topArchetype.score === 0) return null;

  // Calculate confidence
  const totalScore = archetypes.reduce((sum, arch) => sum + arch.score, 0);
  const confidence = Math.round((topArchetype.score / totalScore) * 100);

  return {
    archetype: topArchetype.name,
    confidence,
    traits: topArchetype.keywords.filter(kw => combinedText.includes(kw)),
    inferredFrom: userMessages.slice(-3) // Last 3 messages
  };
}

/**
 * Infer lifestyle patterns from conversation
 */
export function inferLifestylePatterns(messages: Array<{ role: string; content: string }>) {
  const userText = messages
    .filter(m => m.role === "user")
    .map(m => m.content.toLowerCase())
    .join(" ");

  const lifestyle: UserStyleProfile["lifeStyle"] = {};

  // Work schedule detection
  if (userText.match(/9.*5|office|corporate|work.*day/)) {
    lifestyle.workSchedule = "9-5 Corporate";
  } else if (userText.match(/flexible|freelance|remote|own.*time/)) {
    lifestyle.workSchedule = "Flexible/Freelance";
  } else if (userText.match(/night|shift|late/)) {
    lifestyle.workSchedule = "Night Shifts";
  }

  // Profession inference
  if (userText.match(/developer|tech|it|software|engineer/)) {
    lifestyle.profession = "Tech/IT";
  } else if (userText.match(/creative|designer|artist|content/)) {
    lifestyle.profession = "Creative";
  } else if (userText.match(/sales|business|manager|executive/)) {
    lifestyle.profession = "Business/Sales";
  } else if (userText.match(/doctor|lawyer|consultant|professional/)) {
    lifestyle.profession = "Professional Services";
  }

  // Activity level
  if (userText.match(/gym|workout|fitness|exercise|active|sports/)) {
    lifestyle.activityLevel = "High - Regular Exercise";
  } else if (userText.match(/busy|rush|quick|fast|time/)) {
    lifestyle.activityLevel = "Medium - Time-Constrained";
  }

  // Time availability
  if (userText.match(/quick|fast|no time|busy|rush/)) {
    lifestyle.timeAvailability = "Limited - 5-10 min daily";
  } else if (userText.match(/weekend|relax|time/)) {
    lifestyle.timeAvailability = "Moderate - Weekends available";
  }

  return lifestyle;
}

/**
 * Extract preferences from conversation
 */
export function extractPreferences(messages: Array<{ role: string; content: string }>) {
  const userText = messages
    .filter(m => m.role === "user")
    .map(m => m.content.toLowerCase())
    .join(" ");

  const preferences: UserStyleProfile["preferences"] = {};

  // Maintenance level
  if (userText.match(/low.*maintenance|easy|simple|quick|effortless/)) {
    preferences.maintenanceLevel = "low";
  } else if (userText.match(/high.*maintenance|willing.*effort|committed/)) {
    preferences.maintenanceLevel = "high";
  } else {
    preferences.maintenanceLevel = "medium";
  }

  // Budget inference
  if (userText.match(/budget|cheap|affordable|under.*\d+|₹\s*[12]\d{3}/)) {
    preferences.budgetRange = "Budget-Conscious (₹1000-3000)";
  } else if (userText.match(/premium|expensive|best|luxury|₹\s*[5-9]\d{3}/)) {
    preferences.budgetRange = "Premium (₹5000+)";
  } else {
    preferences.budgetRange = "Mid-Range (₹3000-5000)";
  }

  // Aesthetic preferences
  const aesthetics: string[] = [];
  if (userText.match(/modern|contemporary|new/)) aesthetics.push("Modern");
  if (userText.match(/classic|traditional|timeless/)) aesthetics.push("Classic");
  if (userText.match(/bold|edgy|unique/)) aesthetics.push("Bold");
  if (userText.match(/natural|simple|minimal/)) aesthetics.push("Natural");
  if (userText.match(/korean|k-beauty/)) aesthetics.push("Korean");
  
  if (aesthetics.length > 0) {
    preferences.aestheticPreference = aesthetics;
  }

  return preferences;
}

/**
 * Build comprehensive user profile
 */
export function buildUserProfile(
  messages: Array<{ role: string; content: string }>,
  sessionId: string,
  userId?: string
): UserStyleProfile {
  return {
    userId,
    sessionId,
    styleIdentity: detectStyleIdentity(messages),
    lifeStyle: inferLifestylePatterns(messages),
    preferences: extractPreferences(messages),
    history: {
      pastConsultations: [],
      bookings: []
    },
    goals: {},
    psychologicalProfile: {}
  };
}

/**
 * Generate profile context for AI
 */
export function generateProfileContext(profile: UserStyleProfile): string {
  let context = "\n\n--- 🎭 USER STYLE PROFILE (Use this to personalize recommendations) ---\n";

  if (profile.styleIdentity) {
    context += `\n**DETECTED STYLE IDENTITY:** ${profile.styleIdentity.archetype} (${profile.styleIdentity.confidence}% confidence)`;
    context += `\n- Key Traits: ${profile.styleIdentity.traits.join(", ")}`;
  }

  if (Object.keys(profile.lifeStyle).length > 0) {
    context += `\n\n**LIFESTYLE CONTEXT:**`;
    if (profile.lifeStyle.workSchedule) context += `\n- Work: ${profile.lifeStyle.workSchedule}`;
    if (profile.lifeStyle.profession) context += `\n- Profession: ${profile.lifeStyle.profession}`;
    if (profile.lifeStyle.activityLevel) context += `\n- Activity: ${profile.lifeStyle.activityLevel}`;
    if (profile.lifeStyle.timeAvailability) context += `\n- Time: ${profile.lifeStyle.timeAvailability}`;
  }

  if (Object.keys(profile.preferences).length > 0) {
    context += `\n\n**PREFERENCES:**`;
    if (profile.preferences.maintenanceLevel) {
      context += `\n- Maintenance: ${profile.preferences.maintenanceLevel.toUpperCase()}`;
    }
    if (profile.preferences.budgetRange) context += `\n- Budget: ${profile.preferences.budgetRange}`;
    if (profile.preferences.aestheticPreference) {
      context += `\n- Aesthetic: ${profile.preferences.aestheticPreference.join(", ")}`;
    }
  }

  context += `\n\n💡 **STRATEGIST NOTE:** Use this profile to:
1. Personalize transformation roadmaps
2. Predict lifestyle compatibility
3. Match with right salons
4. Identify style conflicts
5. Discover hidden potential

Remember: You're building a relationship. Reference their profile naturally in conversation.`;

  return context;
}
