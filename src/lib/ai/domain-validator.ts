/**
 * STRICT DOMAIN VALIDATOR - Beauty/Salon Only AI
 * Blocks ALL non-beauty related queries with intelligent rejection
 */

// Core beauty/salon domain keywords
const BEAUTY_KEYWORDS = [
  // Basic Services
  "salon", "haircut", "hairstyle", "hair color", "hair dye", "hair treatment", "hair spa",
  "facial", "cleanup", "cleanup facial", "bleach", "detan", "detanning",
  "makeup", "bridal makeup", "party makeup", "engagement makeup", "reception makeup",
  "spa", "body spa", "massage", "full body massage", "head massage", "foot massage",
  "manicure", "pedicure", "nail art", "nail extension", "gel nails", "acrylic nails",
  "waxing", "full body waxing", "brazilian wax", "underarm wax", "leg wax",
  "threading", "eyebrow threading", "upper lip threading", "face threading",
  "eyebrow shaping", "eyelash extension", "lash lift", "brow lamination",
  "beard", "beard trim", "beard styling", "shave", "clean shave", "straight razor shave",
  "grooming", "men's grooming", "male grooming", "bridal grooming", "pre-bridal",
  
  // Hair Treatments
  "keratin", "keratin treatment", "smoothening", "hair smoothening", "rebonding",
  "straightening", "hair straightening", "perm", "permanent waves", "digital perm",
  "botox", "hair botox", "cysteine", "hair spa treatment", "olaplex", "deep conditioning",
  "scalp treatment", "dandruff treatment", "hair fall treatment", "hair growth treatment",
  
  // Advanced Treatments
  "botox injection", "fillers", "dermal fillers", "prp", "prp treatment",
  "microdermabrasion", "hydrafacial", "laser", "laser hair removal", "laser treatment",
  "skin tightening", "hifu", "ultherapy", "chemical peel", "glycolic peel",
  "salicylic peel", "pigmentation treatment", "acne treatment", "scar treatment",
  "tattoo removal", "mole removal", "skin tag removal", "wart removal",
  
  // Beauty Products
  "shampoo", "conditioner", "hair serum", "hair oil", "hair mask", "hair cream",
  "hair spray", "mousse", "hair gel", "pomade", "wax", "clay", "dry shampoo",
  "facial cleanser", "face wash", "face scrub", "exfoliator", "toner", "essence",
  "serum", "ampoule", "moisturizer", "face cream", "sunscreen", "spf", "day cream",
  "night cream", "eye cream", "lip balm", "lip scrub", "face pack", "face mask",
  "sheet mask", "clay mask", "peel off mask", "sleeping mask", "body lotion",
  "body butter", "body oil", "body scrub", "body wash", "shower gel", "hand cream",
  "foot cream", "cuticle oil", "nail polish", "base coat", "top coat",
  "makeup", "foundation", "concealer", "bb cream", "cc cream", "tinted moisturizer",
  "powder", "compact", "loose powder", "setting powder", "primer", "color corrector",
  "blush", "bronzer", "highlighter", "contour", "contour stick", "contour palette",
  "eyeshadow", "eyeshadow palette", "eyeliner", "liquid eyeliner", "gel eyeliner",
  "kohl", "kajal", "mascara", "lash primer", "eyebrow pencil", "brow powder",
  "brow gel", "brow pomade", "lipstick", "liquid lipstick", "lip gloss", "lip tint",
  "lip liner", "lip plumper", "setting spray", "makeup remover", "micellar water",
  "cleansing balm", "cleansing oil", "makeup brush", "beauty blender", "sponge",
  
  // Skin/Hair/Body Concerns
  "beauty", "skincare", "skin care", "hair care", "haircare", "grooming",
  "makeup tips", "beauty tips", "skin tips", "hair tips", "glowing skin",
  "fairness", "skin whitening", "skin lightening", "skin brightening",
  "anti aging", "anti-aging", "wrinkles", "fine lines", "dark circles",
  "puffy eyes", "under eye", "eye bags", "acne", "pimples", "pimple",
  "blackheads", "whiteheads", "open pores", "large pores", "skin texture",
  "uneven skin tone", "pigmentation", "dark spots", "melasma", "tan",
  "sun tan", "sun damage", "sun burn", "dry skin", "oily skin",
  "combination skin", "sensitive skin", "normal skin", "skin type",
  "dehydrated skin", "dull skin", "tired skin", "mature skin", "aging skin",
  "hair fall", "hair loss", "baldness", "thinning hair", "damaged hair",
  "dry hair", "oily hair", "frizzy hair", "split ends", "dandruff",
  "itchy scalp", "sensitive scalp", "hair texture", "hair type",
  "straight hair", "wavy hair", "curly hair", "coily hair", "kinky hair",
  "fine hair", "medium hair", "thick hair", "coarse hair", "thin hair",
  "volume", "hair density", "scalp health", "hair growth", "hair length",
  "beard growth", "patchy beard", "beard style", "moustache", "mustache",
  "body hair", "unwanted hair", "facial hair", "shape", "face shape",
  "oval face", "round face", "square face", "heart face", "diamond face",
  "oblong face", "triangle face", "inverted triangle", "pear face",
  "forehead", "cheekbones", "jawline", "chin", "nose", "lips", "eyes",
  "eyebrows", "complexion", "skin tone", "fair", "medium", "wheatish",
  "dusky", "dark", "undertone", "cool undertone", "warm undertone",
  "neutral undertone", "golden undertone", "pink undertone", "olive",
  "seasonal color analysis", "spring", "summer", "autumn", "winter",
  "color palette", "colors that suit me", "best colors", "flattering colors",
  
  // Style & Fashion
  "style", "fashion", "outfit", "wardrobe", "dress", "clothing", "attire",
  "personal style", "signature style", "classic style", "bohemian style",
  "minimalist style", "edgy style", "preppy style", "glamorous style",
  "casual style", "formal style", "business style", "professional style",
  "trendy", "fashionable", "stylish", "well dressed", "groomed", "polished",
  "put together", "appearance", "look", "image", "presentation", "aesthetic",
  "vibe", "aura", "presence", "charisma", "confidence", "self esteem",
  "self confidence", "body image", "self image", "attractiveness", "appeal",
  "charm", "elegance", "sophistication", "grace", "poise", "manner",
  
  // Mumbai Areas (for location queries)
  "mumbai", "bandra", "andheri", "powai", "juhu", "versova", "malad",
  "borivali", "dadar", "worli", "colaba", "santacruz", "vile parle",
  "khar", "chembur", "kurla", "ghatkopar", "thane", "navi mumbai",
  "churchgate", "marine lines", " Grant Road", "mumbai central",
  "byculla", "parel", "sewri", "wadala", "sion", "koliwada",
  "saki naka", "marol", "sakinaka", "asalpha", "jagruti nagar",
  "western express highway", "eastern express highway", "link road",
  "lokhandwala", "seven bungalows", "four bungalows", "yari road",
  "ic colony", "mahavir nagar", "kandivali", "charkop", "gorai",
  "dahisar", "bhayandar", "mira road", "naigaon", "vasai", "virar",
  "nalasopara", "palghar", "boisar", "dahanu", "churchgate to virar",
  
  // Booking/Price related
  "book", "booking", "appointment", "slot", "available", "timing",
  "price", "cost", "rate", "charges", "fees", "how much", "expensive",
  "cheap", "affordable", "budget", "package", "deal", "offer", "discount",
  "promo", "coupon", "cashback", "membership", "loyalty", "rewards",
  
  // Quality/Rating related
  "best", "top", "good", "quality", "rated", "rating", "review", "reviews",
  "recommended", "suggested", "popular", "famous", "well known", "trusted",
  "verified", "certified", "professional", "expert", "experienced",
  "skill", "talented", "creative", "artistic", " hygienic", "clean",
  
  // Location/Direction related
  "near", "nearby", "closest", "nearest", "location", "address", "direction",
  "how to reach", "map", "area", "locality", "pincode", "station", "metro",
  "bus stop", "landmark", "opposite", "beside", "next to", "behind", "in front",
  
  // Greetings & General
  "hi", "hello", "hey", "good morning", "good afternoon", "good evening",
  "how are you", "what's up", "sup", "howdy", "namaste", "hola",
  "thank", "thanks", "thankyou", "ty", "thx", "thank you",
  "ok", "okay", "k", "sure", "yes", "no", "yep", "nope",
  "bye", "goodbye", "see you", "cya", "take care",
  
  // Help/Info related
  "help", "assist", "support", "information", "info", "details", "about",
  "what is", "what are", "how to", "how do", "how does", "why", "when",
  "where", "which", "who", "can you", "could you", "would you", "will you",
  "is there", "are there", "do you", "does it", "tell me", "explain",
  "suggest", "recommend", "advise", "guide", "tips", "advice",
];

// Strictly REJECTED topics - ANY match = instant rejection
const REJECTED_TOPICS = [
  // Academic/Education
  "homework", "assignment", "exam", "test", "study for", "school project",
  "university degree", "course material", "grade calculation", "syllabus",
  "mathematics problem", "physics equation", "chemistry formula", "biology concept",
  "programming code", "software bug", "algorithm design", "data structure",
  
  // Business/Finance
  "stock market", "share price", "investment advice", "trading strategy",
  "cryptocurrency investment", "bitcoin price", "mutual fund", "insurance policy",
  "tax filing", "accounting software", "business plan", "startup funding",
  
  // Technology (non-beauty)
  "laptop repair", "phone screen", "app development", "website hosting",
  "cloud server", "cybersecurity threat", "data breach", "virus removal",
  
  // Politics/Government
  "election result", "political party", "government policy", "law change",
  "court case", "legal dispute", "immigration visa", "passport renewal",
  
  // Religion/Spirituality
  "religious ritual", "prayer time", "temple festival", "horoscope prediction",
  "astrology reading", "palmistry", "tarot card", "numerology",
  
  // Medical (non-beauty)
  "disease symptom", "illness treatment", "fever medicine", "infection cure",
  "surgery procedure", "hospital admission", "prescription drug", "diabetes control",
  "blood pressure", "heart disease", "cancer treatment", "mental therapy",
  
  // Sports/Games
  "cricket match", "football game", "player stats", "team ranking",
  "chess strategy", "video game", "gaming tournament",
  
  // Entertainment
  "movie review", "actor biography", "song lyrics", "tv show episode",
  "netflix series", "youtube video", "celebrity gossip", "scandal news",
  
  // Food/Cooking
  "recipe ingredients", "cooking method", "baking time", "restaurant review",
  "diet plan", "weight loss meal", "nutrition facts",
  
  // Travel
  "flight booking", "hotel reservation", "visa application", "tour package",
  "travel insurance", "passport renewal",
  
  // Real Estate
  "property price", "house rent", "apartment sale", "mortgage rate",
  "interior design", "furniture store",
  
  // Automotive
  "car price", "bike service", "vehicle insurance", "driving license",
  "car repair", "fuel price",
  
  // Shopping
  "online shopping", "product review", "brand comparison", "discount offer",
  "cashback deal", "return policy",
  
  // Relationships
  "relationship advice", "breakup help", "dating tips", "marriage problem",
  
  // Parenting
  "parenting tips", "baby care", "pregnancy guide", "child education",
  
  // Pets
  "pet care", "dog training", "cat food", "veterinary doctor",
  
  // Environment
  "pollution control", "climate change", "recycling methods",
  
  // Science
  "scientific research", "space exploration", "physics theory",
  
  // History
  "historical event", "ancient civilization", "war history",
  
  // News
  "breaking news", "current affairs", "political update",
  
  // Miscellaneous
  "general knowledge", "quiz question", "fun facts", "joke",
];

// Validation result types
export interface ValidationResult {
  isValid: boolean;
  message?: string;
  detectedTopic?: string;
  confidence: number;
}

/**
 * Smart query validator - ensures only beauty/salon domain queries
 * Uses keyword matching + pattern detection for accuracy
 */
export function validateQuery(query: string): ValidationResult {
  if (!query || typeof query !== "string") {
    return {
      isValid: false,
      message: "Please enter a valid query.",
      confidence: 1.0,
    };
  }

  const normalizedQuery = query.toLowerCase().trim();
  
  // Empty query check
  if (normalizedQuery.length === 0) {
    return {
      isValid: false,
      message: "Please enter a query.",
      confidence: 1.0,
    };
  }

  // Check for rejected topics FIRST (strict rejection)
  for (const topic of REJECTED_TOPICS) {
    if (normalizedQuery.includes(topic.toLowerCase())) {
      return {
        isValid: false,
        message: generateRejectionMessage(topic),
        detectedTopic: topic,
        confidence: 0.95,
      };
    }
  }

  // Check for beauty keywords (positive match)
  let matchCount = 0;
  let matchedKeywords: string[] = [];
  
  for (const keyword of BEAUTY_KEYWORDS) {
    if (normalizedQuery.includes(keyword.toLowerCase())) {
      matchCount++;
      matchedKeywords.push(keyword);
    }
  }

  // Calculate confidence based on keyword matches
  const confidence = Math.min(matchCount / 3, 1.0);

  // If we have beauty keywords, it's valid
  if (matchCount > 0) {
    return {
      isValid: true,
      confidence,
    };
  }

  // Check for greeting/social patterns (allow these)
  const greetingPatterns = [
    /^hi$/i, /^hello$/i, /^hey$/i, /^hii$/i, /^hola$/i,
    /^good morning$/i, /^good afternoon$/i, /^good evening$/i,
    /^how are you$/i, /^what's up$/i, /^sup$/i,
    /^thank/i, /^thanks/i, /^ty$/i, /^thx$/i,
    /^ok$/i, /^okay$/i, /^k$/i, /^sure$/i, /^yes$/i, /^no$/i,
    /^bye$/i, /^goodbye$/i, /^see you/i, /^cya$/i,
  ];

  for (const pattern of greetingPatterns) {
    if (pattern.test(normalizedQuery)) {
      return {
        isValid: true,
        confidence: 0.8,
      };
    }
  }

  // Unknown topic - reject with helpful message
  return {
    isValid: false,
    message: `I'm your AI Beauty Strategist, specialized in salon services, hairstyles, skincare, makeup, and beauty transformations.\n\nI can't help with "${query.substring(0, 30)}${query.length > 30 ? '...' : ''}" as it appears to be outside my expertise.\n\nTry asking me about:\n✨ Haircuts, hair color, or hair treatments\n💆 Facials, skincare, or makeup\n💅 Nails, manicure, or pedicure\n🧔 Beard styling or grooming\n💒 Bridal makeup or party looks\n🏪 Finding salons near you`,
    confidence: 0.9,
  };
}

/**
 * Generate contextual rejection message
 */
function generateRejectionMessage(topic: string): string {
  const messages = [
    `I specialize exclusively in beauty, salon services, and personal grooming. I can't help with "${topic}" as it's outside my domain.`,
    `As your AI Beauty Strategist, I focus on hairstyles, skincare, makeup, and salon recommendations. "${topic}" isn't something I can assist with.`,
    `I'm designed specifically for beauty and salon-related queries. "${topic}" falls outside my expertise. How can I help with your hair, skin, or beauty needs instead?`,
  ];
  
  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Quick check if query is beauty-related (for pre-filtering)
 */
export function isBeautyRelated(query: string): boolean {
  if (!query) return false;
  
  const normalizedQuery = query.toLowerCase();
  
  // Quick check for beauty keywords
  return BEAUTY_KEYWORDS.some(keyword => 
    normalizedQuery.includes(keyword.toLowerCase())
  );
}

/**
 * Check if query should be rejected immediately
 */
export function shouldRejectImmediately(query: string): { reject: boolean; topic?: string } {
  if (!query) return { reject: false };
  
  const normalizedQuery = query.toLowerCase();
  
  for (const topic of REJECTED_TOPICS) {
    if (normalizedQuery.includes(topic.toLowerCase())) {
      return { reject: true, topic };
    }
  }
  
  return { reject: false };
}

export default validateQuery;