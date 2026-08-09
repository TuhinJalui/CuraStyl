// Smart Salon Matching based on hairstyle/treatment selection

interface SalonMatch {
  salonId: string;
  salonName: string;
  slug: string;
  area: string;
  rating: number;
  price: number;
  distance: string;
  specialization: string[];
  availability: 'high' | 'medium' | 'low';
  matchScore: number;
  coverImage: string;
}

export async function findSalonsForStyle(
  styleType: 'hair' | 'facial' | 'makeup',
  styleName: string,
  priceRange: string,
  userLocation?: { lat: number; lng: number }
): Promise<SalonMatch[]> {
  try {
    // Fetch salons from database
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();

    // Get all salons with services
    const { data: salons } = await supabase
      .from('salons')
      .select(`
        id,
        name,
        slug,
        area,
        rating,
        starting_price,
        lat,
        lng,
        cover_image,
        amenities,
        services:services(name, category, price)
      `)
      .eq('is_active', true)
      .order('rating', { ascending: false });

    if (!salons) return [];

    // Match salons based on style
    const matches: SalonMatch[] = [];

    for (const salon of salons) {
      const services = salon.services as any[];
      
      // Check if salon offers this style
      const relevantServices = services.filter(s => 
        matchesStyle(s, styleType, styleName)
      );

      if (relevantServices.length === 0) continue;

      // Calculate match score
      const matchScore = calculateMatchScore(
        salon,
        relevantServices,
        priceRange,
        userLocation
      );

      // Get average price for this style
      const avgPrice = relevantServices.reduce((sum, s) => sum + s.price, 0) / relevantServices.length;

      // Calculate distance (if location provided)
      const distance = userLocation
        ? calculateDistance(userLocation, { lat: salon.lat, lng: salon.lng })
        : 'Unknown';

      matches.push({
        salonId: salon.id,
        salonName: salon.name,
        slug: salon.slug,
        area: salon.area,
        rating: salon.rating,
        price: avgPrice,
        distance,
        specialization: getSpecializations(relevantServices),
        availability: estimateAvailability(salon.rating),
        matchScore,
        coverImage: salon.cover_image,
      });
    }

    // Sort by match score
    return matches
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 5);

  } catch (error) {
    console.error('Salon matching error:', error);
    return [];
  }
}

function matchesStyle(service: any, styleType: string, styleName: string): boolean {
  const serviceName = service.name.toLowerCase();
  const serviceCategory = service.category.toLowerCase();
  const styleNameLower = styleName.toLowerCase();

  if (styleType === 'hair') {
    return (
      serviceCategory.includes('hair') ||
      serviceName.includes('cut') ||
      serviceName.includes('style') ||
      serviceName.includes('color') ||
      serviceName.includes('treatment')
    );
  }

  if (styleType === 'facial') {
    return (
      serviceCategory.includes('facial') ||
      serviceName.includes('facial') ||
      serviceName.includes('glow') ||
      serviceName.includes('treatment')
    );
  }

  if (styleType === 'makeup') {
    return (
      serviceCategory.includes('makeup') ||
      serviceName.includes('makeup') ||
      serviceName.includes('bridal')
    );
  }

  return false;
}

function calculateMatchScore(
  salon: any,
  services: any[],
  priceRange: string,
  userLocation?: { lat: number; lng: number }
): number {
  let score = 0;

  // Rating weight (40%)
  score += (salon.rating / 5) * 40;

  // Service availability (30%)
  score += Math.min(services.length / 5, 1) * 30;

  // Price match (20%)
  const avgPrice = services.reduce((sum, s) => sum + s.price, 0) / services.length;
  const [minPrice, maxPrice] = priceRange.split('-').map(p => parseInt(p.replace(/[₹,]/g, '')));
  if (avgPrice >= minPrice && avgPrice <= maxPrice) {
    score += 20;
  } else if (avgPrice < minPrice) {
    score += 15; // Bonus for being cheaper
  }

  // Distance weight (10%) - if location provided
  if (userLocation) {
    const distance = parseFloat(calculateDistance(userLocation, { lat: salon.lat, lng: salon.lng }));
    if (distance < 5) score += 10;
    else if (distance < 10) score += 7;
    else if (distance < 15) score += 4;
  } else {
    score += 5; // Default bonus
  }

  return Math.min(score, 100);
}

function calculateDistance(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): string {
  const R = 6371; // Earth's radius in km
  const dLat = (to.lat - from.lat) * Math.PI / 180;
  const dLon = (to.lng - from.lng) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(from.lat * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  if (distance < 1) return `${Math.round(distance * 1000)}m`;
  return `${distance.toFixed(1)}km`;
}

function getSpecializations(services: any[]): string[] {
  const specs = new Set<string>();
  services.forEach(s => {
    if (s.category) specs.add(s.category);
  });
  return Array.from(specs).slice(0, 3);
}

function estimateAvailability(rating: number): 'high' | 'medium' | 'low' {
  if (rating >= 4.5) return 'low'; // Popular salons have low availability
  if (rating >= 4.0) return 'medium';
  return 'high';
}

export function getSalonRecommendation(
  faceShape: string,
  skinTone: string,
  styleType: string
): {
  recommendedStyles: string[];
  tips: string[];
  priceEstimate: string;
} {
  const recommendations: Record<string, any> = {
    oval: {
      hair: {
        men: ['Textured Crop', 'Quiff', 'Side Part'],
        women: ['Beach Waves', 'Bob Cut', 'Loose Curls'],
      },
      tips: ['Your face shape is versatile - most styles work well!', 'Try adding volume on top for balance'],
    },
    round: {
      hair: {
        men: ['Pompadour', 'Undercut Fade', 'Mohawk Fade'],
        women: ['Sleek Straight', 'Long & Layered', 'Side Swept Bangs'],
      },
      tips: ['Add height to elongate your face', 'Avoid too much width at the sides'],
    },
    square: {
      hair: {
        men: ['Textured Crop', 'Fringe', 'Slick Back'],
        women: ['Beach Waves', 'Loose Curls', 'Side Swept Bangs'],
      },
      tips: ['Soften angular features with layers', 'Side-swept styles work great'],
    },
    heart: {
      hair: {
        men: ['Side Part', 'Textured Crop', 'Quiff'],
        women: ['Bob Cut', 'Chin-Length Layers', 'Beach Waves'],
      },
      tips: ['Balance narrow chin with volume at jawline', 'Avoid too much volume on top'],
    },
    long: {
      hair: {
        men: ['Fringe', 'Textured Crop', 'Side Part'],
        women: ['Side Swept Bangs', 'Bob Cut', 'Voluminous Blowout'],
      },
      tips: ['Add width at the sides', 'Bangs can shorten the appearance of your face'],
    },
  };

  const faceData = recommendations[faceShape] || recommendations.oval;
  
  return {
    recommendedStyles: faceData.hair?.men || faceData.hair?.women || [],
    tips: faceData.tips || [],
    priceEstimate: '₹800-2000',
  };
}
