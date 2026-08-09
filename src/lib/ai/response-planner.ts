/**
 * 🎨 RESPONSE PLANNER
 * 
 * Plans the response structure based on query intent.
 * Determines: what images to fetch, which CTAs to show, how to structure response.
 */

import type { QueryIntent } from './intent-detector';

export interface ResponsePlan {
  // Image strategy
  shouldFetchImages: boolean;
  imageCount: number;
  imageKeywords: string;

  // CTA strategy
  shouldShowCTA: boolean;
  ctaType: 'virtual-tryon' | 'salon-browse' | 'none';
  ctaLabel: string;
  ctaUrl: string;

  // AI prompt customization
  responseTemplate: string;
  aiGuidance: string;

  // Rendering hints
  visualElements: {
    cards: boolean;
    suggestions: boolean;
    transformationRoadmap: boolean;
    confidenceScores: boolean;
  };

  // Detected context
  detectedGender?: 'male' | 'female' | null;
}

/**
 * Plan response structure based on intent
 */
export function planResponse(intent: QueryIntent, userMessage: string, detectedGender?: 'male' | 'female' | null): ResponsePlan {
  let plan: ResponsePlan = {
    shouldFetchImages: false,
    imageCount: 0,
    imageKeywords: '',
    shouldShowCTA: false,
    ctaType: 'none',
    ctaLabel: '',
    ctaUrl: '',
    responseTemplate: 'standard',
    aiGuidance: '',
    visualElements: {
      cards: false,
      suggestions: true,
      transformationRoadmap: false,
      confidenceScores: false,
    },
    detectedGender,
  };

  // Create lowercase version of user message for easier matching
  const queryLower = userMessage.toLowerCase();

  // === HAIRSTYLE QUERIES ===
  if (intent.type === 'hairstyle') {
    plan.shouldFetchImages = true;
    
    // Dynamic image count: Look for numbers in the user's prompt first!
    const numberMatch = queryLower.match(/(\d+)\s*(image|picture|photo|style|hairstyle)/);
    if (numberMatch) {
      plan.imageCount = Math.min(20, Math.max(3, parseInt(numberMatch[1]))); // Clamp between 3-20
    } 
    // Then check for quantity keywords
    else if (queryLower.includes('types') || queryLower.includes('different') || queryLower.includes('variety') || queryLower.includes('many') || queryLower.includes('several')) {
      plan.imageCount = 15; 
    } else if (queryLower.includes('best') || queryLower.includes('recommend') || queryLower.includes('top')) {
      plan.imageCount = 5; 
    } else if (queryLower.includes('a few') || queryLower.includes('couple')) {
      plan.imageCount = 3;
    } else {
      plan.imageCount = 10; // Default for hairstyle queries
    }
    
    plan.imageKeywords = extractHairstyleKeywords(userMessage, detectedGender);
    plan.responseTemplate = 'hairstyle';
    plan.aiGuidance = `
You are providing hairstyle recommendations. Follow this format:

# 🎯 Quick Verdict
1-2 sentence recommendation.

# 🧠 Face Analysis
- Face Shape: [Detected or ask]
- Hair Type: [Straight/Curly/Wavy/Coily]
- Hair Density: [Thin/Medium/Thick]
- Key Features: [Strengths that suit certain cuts]

# 📸 Hairstyle Inspiration
[Hairstyle images will be provided]

# ✨ Recommended Hairstyles
List 3-5 hairstyles with:
### Hairstyle Name
**Match Score:** XX%
**Why It Fits** - Brief explanation
**Maintenance:** Low/Medium/High
**Styling Difficulty:** Easy/Medium/Advanced

# 🏆 Best Match
Recommend the #1 choice and explain why.

# 💈 What To Tell Your Barber
Provide a copy-paste-ready description.

# ⚠️ Things To Consider
- Maintenance requirements
- Hair growth patterns
- Lifestyle compatibility

# 🚀 Next Step
Provide actionable guidance.
`;

    // Always show virtual try-on CTA for hairstyle queries
    plan.shouldShowCTA = true;
    plan.ctaType = 'virtual-tryon';
    plan.ctaLabel = '✨ Try Virtual Try-On';
    
    // Detect gender from image analysis, query text, or default
    let isMen = false;
    
    // Priority 1: Use detected gender from image
    if (detectedGender === 'male') {
      isMen = true;
    } else if (detectedGender === 'female') {
      isMen = false;
    } else {
    // Priority 2: Detect from text (word-boundary safe — 'women' must NOT match 'men')
      isMen = /\bmen\b|\bmale\b|\bman\b|\bboy\b|\bguy\b|\bbeard\b|\bmustache\b|\bbarber\b/.test(queryLower);
    }
    
    plan.ctaUrl = isMen ? '/virtual-tryon/men' : '/virtual-tryon/women';

    plan.visualElements.cards = true;
    plan.visualElements.transformationRoadmap = true;
    plan.visualElements.confidenceScores = true;
  }

  // === MAKEUP QUERIES ===
  else if (intent.type === 'makeup') {
    plan.shouldFetchImages = true;
    
    // Dynamic image count for makeup
    if (queryLower.includes('looks') || queryLower.includes('styles') || queryLower.includes('types')) {
      plan.imageCount = 10; // More variety for looks
    } else if (queryLower.includes('tutorial') || queryLower.includes('how to')) {
      plan.imageCount = 4; // Fewer for step-by-step
    } else {
      plan.imageCount = 6; // Default
    }
    
    plan.imageKeywords = extractMakeupKeywords(userMessage);
    plan.responseTemplate = 'makeup';
    plan.aiGuidance = `
You are providing makeup recommendations and tutorials.

# 🎯 Quick Recommendation
1-2 sentence summary.

# 📸 Makeup Inspiration
[Makeup look images will be provided]

# 💄 Makeup Look Details
For each recommended look:
### Look Name
**Best For:** [Event/Skin tone/Face shape]
**Products Needed:** [List key products]
**Application Steps:**
1. [Step 1]
2. [Step 2]
etc.

**Estimated Time:** [Minutes]
**Estimated Cost:** ₹[Budget]

# 🎨 Pro Tips
- [Tip 1]
- [Tip 2]
- [Tip 3]

# 🚀 Next Steps
Where to find products and salons.
`;

    // Always show virtual try-on CTA for makeup queries
    plan.shouldShowCTA = true;
    plan.ctaType = 'virtual-tryon';
    plan.ctaLabel = '💄 Try Virtual Makeup';
    plan.ctaUrl = '/virtual-tryon/women';

    plan.visualElements.cards = true;
    plan.visualElements.suggestions = true;
  }

  // === SKINCARE QUERIES ===
  else if (intent.type === 'skincare') {
    plan.shouldFetchImages = true;
    
    // Dynamic image count for skincare
    if (queryLower.includes('routine') || queryLower.includes('products')) {
      plan.imageCount = 8; // Show product examples
    } else {
      plan.imageCount = 4; // Treatment examples
    }
    
    plan.imageKeywords = extractSkincareKeywords(userMessage);
    plan.responseTemplate = 'skincare';
    plan.aiGuidance = `
You are providing skincare advice and treatment recommendations.

# 🎯 Quick Verdict
1-2 sentence diagnosis.

# 📋 Understanding Your Concern
Explain the condition and causes.

# ✨ Treatment Options
Option 1 — Professional Treatment
- Recommended: [Salon treatment]
- Cost: ₹[Price range]
- Duration: [Time]
- Results: [Timeline]

Option 2 — At-Home Routine
- Morning: [Steps]
- Night: [Steps]
- Weekly: [Treatment]

# 💡 Product Recommendations
[Specific product suggestions with prices]

# ⚠️ What to Avoid
Things that might worsen the condition.

# 🚀 Next Steps
When to see a dermatologist, when to book a salon treatment.
`;

    plan.visualElements.cards = true;
    plan.visualElements.suggestions = true;
  }

  // === SALON SEARCH ===
  else if (intent.type === 'salon_search') {
    plan.shouldFetchImages = false; // Salon images handled separately
    plan.responseTemplate = 'salon-search';
    plan.aiGuidance = `
You are helping the user find the best salon for their needs.

# 🎯 Best Matches
List 3-5 salons that match their criteria with:
**Salon Name** (Area) — ⭐[Rating]
- Specializes in: [Services]
- Price range: ₹[Range]
- Why it's a good fit: [1 sentence]

# 📍 Location & Booking
- Distance from user's area
- Parking: [Available/Not available]
- Booking link: [Link to booking page]

# 💰 Special Offers
Current promotions if any.

# 🚀 How to Book
Book [Salon Name] for [Service] at /salons
`;

    plan.shouldShowCTA = true;
    plan.ctaType = 'salon-browse';
    plan.ctaLabel = '🏪 Browse All Salons';
    plan.ctaUrl = '/salons';

    plan.visualElements.cards = true;
    plan.visualElements.suggestions = true;
  }

  // === GENERAL BEAUTY ===
  else {
    plan.responseTemplate = 'standard';
    plan.aiGuidance = `
Provide a comprehensive, well-structured beauty response.

# 🎯 Quick Answer
1-3 sentence summary.

# ✨ Why This Matters
Explain the importance.

# 📋 Key Points
- Point 1
- Point 2
- Point 3

# ✅ Recommendations
Option 1: [Recommendation]
Option 2: [Recommendation]

# 🚀 Next Steps
What the user should do next.
`;

    plan.visualElements.suggestions = true;
  }

  return plan;
}

/**
 * Extract hairstyle-specific keywords
 */
function extractHairstyleKeywords(query: string, detectedGender?: 'male' | 'female' | null): string {
  const normalized = query.toLowerCase();

  // Detect gender first for better targeting
  let isMen = false;
  if (detectedGender === 'male') {
    isMen = true;
  } else if (detectedGender === 'female') {
    isMen = false;
  } else {
    // Word-boundary safe — 'women' must NOT match 'men'
    isMen = /\bmen\b|\bmale\b|\bman\b|\bboy\b|\bguy\b|\bbeard\b|\bmustache\b|\bbarber\b/.test(normalized);
  }
  
  const genderPrefix = isMen ? 'men' : 'women';

  // Look for specific hairstyle mentions
  const hairstyleNames = [
    'bob', 'pixie', 'fade', 'undercut', 'buzz', 'layers', 'bangs',
    'blunt', 'textured', 'shag', 'mullet', 'mohawk', 'dreads', 'braids',
    'crew cut', 'pompadour', 'quiff', 'fringe', 'side part', 'slick back',
  ];

  const found = hairstyleNames.filter((name) => normalized.includes(name));

  if (found.length > 0) {
    return `${genderPrefix} ${found.slice(0, 2).join(' ')} hairstyle`;
  }

  // Look for hair type descriptors
  if (normalized.includes('curly') || normalized.includes('wavy')) return `${genderPrefix} curly hairstyles`;
  if (normalized.includes('thick') || normalized.includes('volume')) return `${genderPrefix} voluminous hairstyles`;
  if (normalized.includes('thin') || normalized.includes('fine')) return `${genderPrefix} hairstyles thin hair`;
  if (normalized.includes('long')) return `${genderPrefix} long hairstyles`;
  if (normalized.includes('short')) return `${genderPrefix} short hairstyles`;
  if (normalized.includes('medium')) return `${genderPrefix} medium length hairstyles`;
  
  // Face shape specific
  if (normalized.includes('face shape') || normalized.includes('oval')) return `${genderPrefix} hairstyles oval face`;
  if (normalized.includes('round')) return `${genderPrefix} hairstyles round face`;
  if (normalized.includes('square')) return `${genderPrefix} hairstyles square face`;
  if (normalized.includes('heart')) return `${genderPrefix} hairstyles heart face`;

  // Hair color queries
  if (normalized.includes('color') || normalized.includes('dye') || normalized.includes('blonde') || 
      normalized.includes('brown') || normalized.includes('black') || normalized.includes('red')) {
    return `${genderPrefix} hair color styles`;
  }

  // Types of cuts
  if (normalized.includes('types') || normalized.includes('different')) {
    return `types of ${genderPrefix} hairstyles`;
  }

  return `${genderPrefix} hairstyle inspiration`;
}

/**
 * Extract makeup-specific keywords
 */
function extractMakeupKeywords(query: string): string {
  const normalized = query.toLowerCase();

  if (normalized.includes('bridal')) return 'bridal makeup looks';
  if (normalized.includes('party')) return 'party makeup looks';
  if (normalized.includes('wedding')) return 'wedding makeup looks';
  if (normalized.includes('event')) return 'event makeup';
  if (normalized.includes('natural')) return 'natural makeup looks';
  if (normalized.includes('bold')) return 'bold eye makeup';
  if (normalized.includes('smokey')) return 'smokey eye makeup';
  if (normalized.includes('winged') || normalized.includes('eyeliner')) return 'eyeliner makeup';

  return 'makeup looks';
}

/**
 * Extract skincare-specific keywords
 */
function extractSkincareKeywords(query: string): string {
  const normalized = query.toLowerCase();

  if (normalized.includes('acne')) return 'acne treatment';
  if (normalized.includes('dark circles')) return 'dark circles treatment';
  if (normalized.includes('wrinkles') || normalized.includes('aging')) return 'anti-aging skincare';
  if (normalized.includes('glow')) return 'glowing skin treatment';
  if (normalized.includes('dark spots') || normalized.includes('pigmentation')) return 'pigmentation treatment';
  if (normalized.includes('dull')) return 'dull skin brightening';

  return 'skincare treatment';
}

/**
 * Get rendering hint for visual components
 */
export function getVisualHints(plan: ResponsePlan): string {
  const hints = [];

  if (plan.visualElements.transformationRoadmap) {
    hints.push('Include transformation roadmap with phases');
  }
  if (plan.visualElements.confidenceScores) {
    hints.push('Include confidence score card');
  }
  if (plan.visualElements.cards) {
    hints.push('Use card-based layout for visual appeal');
  }

  return hints.length > 0 ? `Visual hints: ${hints.join(', ')}` : '';
}