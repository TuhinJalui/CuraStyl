/**
 * Keyword Extractor
 *
 * Builds a priority-ordered list of Pexels search keyword strings from a user query.
 * Each string is tried in sequence until results are found.
 * The last item in every chain is always a broad generic fallback.
 *
 * Rules:
 * - Gender detection is word-boundary safe ('women' never matches 'men')
 * - Returns at least 3 candidates, never empty
 */

export type IntentType =
  | 'hairstyle'
  | 'makeup'
  | 'skincare'
  | 'salon_search'
  | 'beauty_general'
  | 'off_topic';

// Word-boundary-safe patterns
const MALE_RE   = /\bmen\b|\bmale\b|\bman\b|\bboy\b|\bguy\b|\bbeard\b|\bmustache\b|\bbarber\b/i;
const FEMALE_RE = /\bwomen\b|\bfemale\b|\bwoman\b|\bgirl\b|\blady\b|\bladies\b/i;

const STOPWORDS = new Set([
  'the','a','an','in','on','for','to','of','is','are','i','me','my','you','and','or',
  'that','this','what','which','who','why','how','when','where','with','do','does','did',
  'can','could','should','would','will','have','has','had','be','been','by','from','at',
  'as','but','about','so','if','than','just','give','suggest','recommend','please','show',
  'want','need','looking','some','any','best','good','nice','tell','cool','new','latest',
  'trendy','popular','really','very','quite',
]);

function genderPrefix(query: string, detected?: 'male' | 'female' | null): 'men' | 'women' {
  if (detected === 'male')   return 'men';
  if (detected === 'female') return 'women';
  if (MALE_RE.test(query))   return 'men';
  return 'women'; // safe default
}

/** Returns a deduplicated, ordered list of keyword strings to try against Pexels. */
export function buildKeywordChain(
  query: string,
  intentType: IntentType,
  detectedGender?: 'male' | 'female' | null,
): string[] {
  const q = query.toLowerCase().trim();
  const g = genderPrefix(q, detectedGender);

  let chain: string[];

  switch (intentType) {
    case 'hairstyle':
      chain = hairstyleChain(q, g);
      break;
    case 'makeup':
      chain = makeupChain(q);
      break;
    case 'skincare':
      chain = skincareChain(q);
      break;
    case 'salon_search':
      chain = ['beauty salon interior', 'salon decor', 'hair salon', 'beauty parlour'];
      break;
    default: {
      // Generic: extract meaningful words from query
      const words = q
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 3 && !STOPWORDS.has(w))
        .slice(0, 4);

      if (words.length >= 2) {
        chain = [
          words.slice(0, 3).join(' '),
          words.slice(0, 2).join(' '),
          words[0],
          'beauty style',
        ];
      } else if (words.length === 1) {
        chain = [words[0], 'beauty style', 'fashion'];
      } else {
        chain = ['beauty style', 'fashion', 'style'];
      }
    }
  }

  // Deduplicate while preserving order
  const seen = new Set<string>();
  return chain.filter(k => {
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// ── Hairstyle ────────────────────────────────────────────────────────────────

const HAIRSTYLE_NAMES = [
  'bob','pixie','fade','undercut','buzz cut','crew cut','pompadour','quiff',
  'layers','bangs','fringe','shag','mullet','mohawk','dreads','locs','braids',
  'cornrows','man bun','ponytail','wolf cut','butterfly cut','curtain bangs',
  'lob','blunt cut','balayage','highlights','ombre','side part',
];

function hairstyleChain(q: string, g: 'men' | 'women'): string[] {
  // 1. Specific named style
  const named = HAIRSTYLE_NAMES.find(s => q.includes(s));
  if (named) return [`${g} ${named} hairstyle`, `${g} hairstyle`, 'hairstyle inspiration'];

  // 2. Hair texture / length
  if (/curly/.test(q))   return [`${g} curly hairstyle`, `${g} hairstyle`, 'curly hair'];
  if (/wavy/.test(q))    return [`${g} wavy hairstyle`, `${g} hairstyle`, 'wavy hair'];
  if (/straight/.test(q))return [`${g} straight hairstyle`, `${g} hairstyle`, 'straight hair'];
  if (/long/.test(q))    return [`${g} long hairstyle`, `${g} hairstyle`, 'long hair style'];
  if (/short/.test(q))   return [`${g} short hairstyle`, `${g} hairstyle`, 'short hair style'];
  if (/medium/.test(q))  return [`${g} medium hairstyle`, `${g} hairstyle`, 'medium hair'];
  if (/thick|volume/.test(q)) return [`${g} voluminous hairstyle`, `${g} hairstyle`, 'thick hair style'];
  if (/thin|fine/.test(q))    return [`${g} hairstyle thin hair`, `${g} hairstyle`, 'fine hair style'];

  // 3. Hair color
  if (/color|colour|dye|blonde|brunette|highlights|ombre|balayage/.test(q))
    return [`${g} hair color`, 'hair color highlights', 'hair coloring'];

  // 4. Occasion
  if (/bridal|wedding/.test(q)) return [`${g} bridal hairstyle`, 'bridal hair', 'wedding hair updo'];
  if (/party|event/.test(q))    return [`${g} party hairstyle`, `${g} hairstyle`, 'party hair'];

  // 5. Face shape
  if (/oval face/.test(q))   return [`${g} hairstyle oval face`, `${g} hairstyle`, 'best hairstyles'];
  if (/round face/.test(q))  return [`${g} hairstyle round face`, `${g} hairstyle`, 'best hairstyles'];
  if (/square face/.test(q)) return [`${g} hairstyle square face`, `${g} hairstyle`, 'best hairstyles'];
  if (/heart face/.test(q))  return [`${g} hairstyle heart face`, `${g} hairstyle`, 'best hairstyles'];

  // Generic hairstyle fallback
  return [`${g} hairstyle inspiration`, `${g} hairstyle`, 'hairstyle', 'hair style'];
}

// ── Makeup ───────────────────────────────────────────────────────────────────

function makeupChain(q: string): string[] {
  if (/bridal|wedding/.test(q))    return ['bridal makeup look', 'bridal makeup', 'wedding makeup', 'makeup'];
  if (/party|festive/.test(q))     return ['party makeup look', 'party makeup', 'glam makeup', 'makeup'];
  if (/natural|everyday|no.?makeup/.test(q)) return ['natural makeup look', 'everyday makeup', 'no makeup look', 'makeup'];
  if (/smokey|smoky/.test(q))      return ['smokey eye makeup', 'bold eye makeup', 'dramatic makeup', 'makeup'];
  if (/bold|dramatic/.test(q))     return ['bold makeup look', 'dramatic eye makeup', 'glam makeup', 'makeup'];
  if (/korean|glass skin/.test(q)) return ['korean glass skin makeup', 'dewy skin makeup', 'korean beauty', 'makeup'];
  if (/contour/.test(q))           return ['contouring makeup', 'makeup contouring', 'sculpted makeup', 'makeup'];
  if (/eye|eyeshadow/.test(q))     return ['eye makeup look', 'eyeshadow makeup', 'eye makeup', 'makeup'];
  if (/lip|lipstick/.test(q))      return ['bold lip makeup', 'lipstick look', 'lip color', 'makeup'];
  if (/glow|dewy/.test(q))         return ['glowing skin makeup', 'dewy makeup look', 'radiant makeup', 'makeup'];
  return ['makeup look', 'beauty makeup', 'makeup', 'cosmetics'];
}

// ── Skincare ─────────────────────────────────────────────────────────────────

function skincareChain(q: string): string[] {
  if (/acne|pimple/.test(q))           return ['acne skin treatment', 'clear skin acne', 'skincare acne', 'skincare'];
  if (/glow|glowing|radiant/.test(q))  return ['glowing radiant skin', 'glow skin', 'radiant complexion', 'skincare'];
  if (/dark circle/.test(q))           return ['dark circles eye treatment', 'under eye treatment', 'eye care', 'skincare'];
  if (/wrinkle|aging|anti.?age/.test(q)) return ['anti aging skincare', 'wrinkle treatment', 'mature skin', 'skincare'];
  if (/bright|whitening/.test(q))      return ['skin brightening', 'even skin tone', 'bright complexion', 'skincare'];
  if (/oily/.test(q))                  return ['oily skin care routine', 'mattifying skincare', 'oily skin', 'skincare'];
  if (/dry/.test(q))                   return ['dry skin hydration', 'moisturizing skincare', 'dry skin', 'skincare'];
  if (/sensitive/.test(q))             return ['sensitive skin care', 'gentle skincare', 'calming skincare', 'skincare'];
  if (/routine/.test(q))               return ['skincare routine steps', 'daily skincare routine', 'skincare routine', 'skincare'];
  return ['skincare routine', 'healthy skin', 'skin care', 'skincare'];
}
