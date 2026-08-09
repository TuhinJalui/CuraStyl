/**
 * 🧠 AI STYLIST MEMORY SYSTEM
 * Persistent memory for personalized beauty consultations
 * Uses localStorage for client-side + Supabase for server-side persistence
 */

export interface StyleMemory {
  userId?: string;
  sessionId: string;
  styleArchetype?: string;
  archetypeConfidence?: number;
  detectedAt?: string;

  // Detected user profile
  profile: {
    workPattern?: "9-5" | "flexible" | "night-shift" | "freelance" | "student" | "homemaker";
    dresscode?: "formal" | "business-casual" | "creative" | "casual";
    clientFacing?: boolean;
    gymFrequency?: "daily" | "3-4x" | "1-2x" | "rarely" | "never";
    budget?: "under-1000" | "1000-3000" | "3000-7000" | "7000-15000" | "15000+";
    morningTime?: "5min" | "10-15min" | "20-30min" | "30min+";
    location?: string; // area in Mumbai
  };

  // Preferences (learns over time)
  preferences: {
    likes: string[];
    dislikes: string[];
    neverRepeat: string[]; // failed experiments
    favoriteStyles: string[];
    colorPreferences: string[];
  };

  // History
  history: {
    consultations: {
      date: string;
      topic: string;
      recommendations: string[];
      outcome?: string;
    }[];
    lifeEvents: {
      date: string;
      event: string; // wedding, promotion, new job, etc.
    }[];
    styleEvolution: {
      date: string;
      change: string;
      feedback: string;
    }[];
  };

  // Budget patterns
  budgetPattern: {
    typical: number;
    splurgeOccasions: string[];
    lastSpend?: number;
  };

  // Summary for AI context injection
  contextSummary?: string;
  lastUpdated: string;
}

const MEMORY_KEY_PREFIX = "glamhub_ai_memory_";

export function getSessionId(): string {
  if (typeof window === "undefined") return "server";
  let id = sessionStorage.getItem("glamhub_session");
  if (!id) {
    id = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem("glamhub_session", id);
  }
  return id;
}

export function loadMemory(userId?: string): StyleMemory {
  const key = MEMORY_KEY_PREFIX + (userId || "guest");
  const empty: StyleMemory = {
    sessionId: getSessionId(),
    profile: {},
    preferences: { likes: [], dislikes: [], neverRepeat: [], favoriteStyles: [], colorPreferences: [] },
    history: { consultations: [], lifeEvents: [], styleEvolution: [] },
    budgetPattern: { typical: 2000, splurgeOccasions: [] },
    lastUpdated: new Date().toISOString(),
  };

  if (typeof window === "undefined") return empty;
  try {
    // Use sessionStorage for guest memory so it clears when the browser session ends
    const storage = userId ? localStorage : sessionStorage;
    const stored = storage.getItem(key);
    if (stored) return { ...empty, ...JSON.parse(stored) };
  } catch {}
  return empty;
}

export function saveMemory(memory: StyleMemory, userId?: string): void {
  const key = MEMORY_KEY_PREFIX + (userId || "guest");
  if (typeof window === "undefined") return;
  try {
    memory.lastUpdated = new Date().toISOString();
    const storage = userId ? localStorage : sessionStorage;
    storage.setItem(key, JSON.stringify(memory));
  } catch {}
}

/**
 * Extract memory updates from a conversation exchange
 * Called after each AI response to update the memory
 */
export function extractMemoryUpdates(
  userMessage: string,
  aiResponse: string,
  memory: StyleMemory
): Partial<StyleMemory> {
  const updates: Partial<StyleMemory> = { profile: { ...memory.profile }, preferences: { ...memory.preferences } };
  const lc = userMessage.toLowerCase();

  // Work pattern detection
  if (lc.includes("9-5") || lc.includes("office")) updates.profile!.workPattern = "9-5";
  else if (lc.includes("freelance")) updates.profile!.workPattern = "freelance";
  else if (lc.includes("night shift")) updates.profile!.workPattern = "night-shift";
  else if (lc.includes("student") || lc.includes("college")) updates.profile!.workPattern = "student";

  // Dress code
  if (lc.includes("formal") || lc.includes("suit")) updates.profile!.dresscode = "formal";
  else if (lc.includes("startup") || lc.includes("casual friday")) updates.profile!.dresscode = "business-casual";
  else if (lc.includes("creative") || lc.includes("artist")) updates.profile!.dresscode = "creative";

  // Budget detection
  const budgetMatch = lc.match(/₹?\s*(\d+(?:,\d+)*)\s*(k|thousand)?/);
  if (budgetMatch) {
    let amt = parseInt(budgetMatch[1].replace(",", ""));
    if (budgetMatch[2]) amt *= 1000;
    updates.budgetPattern = { ...memory.budgetPattern, typical: amt };
  }

  // Gym / activity
  if (lc.includes("gym") || lc.includes("workout")) {
    if (lc.includes("daily") || lc.includes("everyday")) updates.profile!.gymFrequency = "daily";
    else if (lc.includes("3") || lc.includes("4") || lc.includes("thrice")) updates.profile!.gymFrequency = "3-4x";
    else updates.profile!.gymFrequency = "1-2x";
  }

  // Likes/dislikes
  if (lc.includes("love") || lc.includes("like") || lc.includes("want")) {
    const item = extractStyleItem(userMessage);
    if (item && !memory.preferences.likes.includes(item)) {
      updates.preferences!.likes = [...memory.preferences.likes, item];
    }
  }
  if (lc.includes("hate") || lc.includes("don't like") || lc.includes("dislike")) {
    const item = extractStyleItem(userMessage);
    if (item && !memory.preferences.dislikes.includes(item)) {
      updates.preferences!.dislikes = [...memory.preferences.dislikes, item];
      updates.preferences!.neverRepeat = [...memory.preferences.neverRepeat, item];
    }
  }

  // Life events
  const eventKeywords = ["wedding", "promotion", "interview", "new job", "date", "birthday", "graduation"];
  for (const event of eventKeywords) {
    if (lc.includes(event)) {
      const newEvent = { date: new Date().toISOString(), event };
      updates.history = {
        ...memory.history,
        lifeEvents: [...memory.history.lifeEvents, newEvent].slice(-10),
      };
      break;
    }
  }

  return updates;
}

function extractStyleItem(text: string): string | null {
  const styleKeywords = [
    "undercut", "fade", "beard", "highlights", "balayage", "keratin", "straightening",
    "curly", "wavy", "short hair", "long hair", "color", "bleach", "shave",
    "facial", "cleanup", "waxing", "threading", "makeup"
  ];
  const lc = text.toLowerCase();
  return styleKeywords.find(k => lc.includes(k)) || null;
}

/**
 * Build a memory context string to inject into AI prompts
 */
export function buildMemoryContext(memory: StyleMemory): string {
  const parts: string[] = [];

  if (memory.styleArchetype) {
    parts.push(`User's Style Archetype: ${memory.styleArchetype} (${memory.archetypeConfidence}% confidence)`);
  }

  if (memory.profile.workPattern) parts.push(`Work Pattern: ${memory.profile.workPattern}`);
  if (memory.profile.dresscode) parts.push(`Dress Code: ${memory.profile.dresscode}`);
  if (memory.budgetPattern.typical) parts.push(`Typical Budget: ₹${memory.budgetPattern.typical}`);
  if (memory.profile.gymFrequency) parts.push(`Gym: ${memory.profile.gymFrequency}`);

  if (memory.preferences.likes.length > 0)
    parts.push(`Likes: ${memory.preferences.likes.join(", ")}`);
  if (memory.preferences.neverRepeat.length > 0)
    parts.push(`NEVER recommend again: ${memory.preferences.neverRepeat.join(", ")} (user explicitly disliked these)`);

  if (memory.history.lifeEvents.length > 0) {
    const recent = memory.history.lifeEvents.slice(-3);
    parts.push(`Recent life events: ${recent.map(e => e.event).join(", ")}`);
  }

  if (memory.history.consultations.length > 0) {
    const last = memory.history.consultations.slice(-2);
    parts.push(`Previous consultations: ${last.map(c => c.topic).join("; ")}`);
  }

  return parts.length > 0
    ? `\n--- AI STYLIST MEMORY (Use this to personalize responses) ---\n${parts.join("\n")}\n---`
    : "";
}
