/**
 * Salon Intelligence & Matching System
 * 
 * Implements location-based salon search, weighted ranking algorithm,
 * and intelligent filtering based on style compatibility and user preferences.
 * 
 * @see Design Document: Phase 8 - Salon Intelligence
 * @see Requirements: 5.1-5.10
 */

import type { SalonMatch, StyleCompatibilityScore } from './types';

/**
 * Salon Intelligence Configuration
 */
export interface SalonIntelligenceConfig {
  /** User's current location coordinates */
  userLocation: { lat: number; lng: number };
  
  /** Search radius in miles (default: 25) */
  searchRadius?: number;
  
  /** Top recommended styles from compatibility scoring */
  topStyles: StyleCompatibilityScore[];
  
  /** User's budget preference */
  budgetRange?: { min: number; max: number };
  
  /** Minimum rating filter (0-5) */
  minRating?: number;
  
  /** Supabase client for database queries */
  supabaseClient?: any; // Type would be imported from @supabase/supabase-js
}

/**
 * Raw salon data from database
 */
interface RawSalonData {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  specializations: string[]; // Array of style tags they specialize in
  rating: number;
  review_count: number;
  pricing_tier: 'budget' | 'standard' | 'premium' | 'luxury';
  next_available: string; // ISO date string
  available_slots: string[];
}

/**
 * Salon Intelligence Engine
 * 
 * Handles salon search, ranking, and matching based on user preferences and compatibility scores.
 */
export class SalonIntelligenceEngine {
  private config: Required<Omit<SalonIntelligenceConfig, 'supabaseClient' | 'budgetRange' | 'minRating'>> & {
    budgetRange?: { min: number; max: number };
    minRating?: number;
    supabaseClient?: any;
  };
  
  constructor(config: SalonIntelligenceConfig) {
    this.config = {
      searchRadius: 25, // Default 25 miles
      ...config,
    };
  }
  
  /**
   * Find and rank salons based on compatibility and preferences
   * 
   * @returns Array of ranked salon matches
   */
  async findMatchingSalons(): Promise<SalonMatch[]> {
    let searchRadius = this.config.searchRadius;
    let salons: RawSalonData[] = [];
    
    // Try expanding search radius if no results (Requirement 5.7, 5.8)
    const radiusOptions = [searchRadius, 50, 100];
    
    for (const radius of radiusOptions) {
      salons = await this.querySalons(radius);
      
      if (salons.length >= 3) {
        break; // Found enough salons
      }
      
      console.log(`No results in ${radius} miles, expanding search...`);
    }
    
    // If still no results, suggest online consultation
    if (salons.length === 0) {
      console.warn('No salons found within 100 miles. Consider online consultation.');
      return [];
    }
    
    // Filter salons by user preferences
    let filteredSalons = this.filterSalons(salons);
    
    // Rank salons by weighted scoring algorithm
    const rankedSalons = this.rankSalons(filteredSalons);
    
    // Return top matches (at least 3, or all if less than 3 available)
    return rankedSalons.slice(0, Math.max(3, rankedSalons.length));
  }
  
  /**
   * Query salons from database within radius
   * 
   * @param radius - Search radius in miles
   * @returns Array of raw salon data
   */
  private async querySalons(radius: number): Promise<RawSalonData[]> {
    // If Supabase client is available, query real database
    if (this.config.supabaseClient) {
      try {
        // Use PostGIS distance calculation
        const { data, error } = await this.config.supabaseClient
          .rpc('salons_within_radius', {
            user_lat: this.config.userLocation.lat,
            user_lng: this.config.userLocation.lng,
            radius_miles: radius,
          });
        
        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error('Database query failed:', error);
        return this.getMockSalons(radius);
      }
    }
    
    // Fallback to mock data for development
    return this.getMockSalons(radius);
  }
  
  /**
   * Get mock salon data for development/testing
   */
  private getMockSalons(radius: number): RawSalonData[] {
    const mockSalons: RawSalonData[] = [
      {
        id: 'salon-1',
        name: 'Luxe Beauty Studio',
        address: '123 Fashion Street, Mumbai',
        latitude: this.config.userLocation.lat + 0.01,
        longitude: this.config.userLocation.lng + 0.01,
        specializations: ['Wolf Cut', 'Korean Perm', 'Layered Long', 'Beach Waves'],
        rating: 4.8,
        review_count: 245,
        pricing_tier: 'premium',
        next_available: new Date(Date.now() + 86400000).toISOString(),
        available_slots: ['10:00 AM', '2:00 PM', '4:00 PM'],
      },
      {
        id: 'salon-2',
        name: 'Glamour Salon & Spa',
        address: '456 Style Avenue, Mumbai',
        latitude: this.config.userLocation.lat + 0.02,
        longitude: this.config.userLocation.lng - 0.01,
        specializations: ['Bob Cut', 'Pixie Cut', 'Curtain Bangs', 'Fade Cut'],
        rating: 4.6,
        review_count: 189,
        pricing_tier: 'standard',
        next_available: new Date(Date.now() + 172800000).toISOString(),
        available_slots: ['11:00 AM', '3:00 PM'],
      },
      {
        id: 'salon-3',
        name: 'Radiant Hair Lounge',
        address: '789 Beauty Boulevard, Mumbai',
        latitude: this.config.userLocation.lat - 0.015,
        longitude: this.config.userLocation.lng + 0.02,
        specializations: ['Quiff', 'Pompadour', 'Slicked Back', 'Man Bun'],
        rating: 4.9,
        review_count: 312,
        pricing_tier: 'luxury',
        next_available: new Date(Date.now() + 259200000).toISOString(),
        available_slots: ['9:00 AM', '1:00 PM', '5:00 PM'],
      },
      {
        id: 'salon-4',
        name: 'Urban Cuts',
        address: '321 Modern Lane, Mumbai',
        latitude: this.config.userLocation.lat + 0.03,
        longitude: this.config.userLocation.lng + 0.03,
        specializations: ['Buzz Cut', 'Undercut', 'Fade Cut', 'Mohawk'],
        rating: 4.4,
        review_count: 156,
        pricing_tier: 'budget',
        next_available: new Date(Date.now() + 43200000).toISOString(),
        available_slots: ['12:00 PM', '3:00 PM', '6:00 PM'],
      },
      {
        id: 'salon-5',
        name: 'Elite Beauty Bar',
        address: '555 Prestige Plaza, Mumbai',
        latitude: this.config.userLocation.lat - 0.02,
        longitude: this.config.userLocation.lng - 0.025,
        specializations: ['Shag Cut', 'Wolf Cut', 'Beach Waves', 'Layered Long'],
        rating: 4.7,
        review_count: 278,
        pricing_tier: 'premium',
        next_available: new Date(Date.now() + 129600000).toISOString(),
        available_slots: ['10:00 AM', '2:00 PM', '4:00 PM', '6:00 PM'],
      },
    ];
    
    // Filter by approximate distance
    return mockSalons.filter(salon => {
      const distance = this.calculateDistance(
        this.config.userLocation,
        { lat: salon.latitude, lng: salon.longitude }
      );
      return distance <= radius;
    });
  }
  
  /**
   * Filter salons by user preferences
   * 
   * @param salons - Array of raw salon data
   * @returns Filtered salon array
   */
  private filterSalons(salons: RawSalonData[]): RawSalonData[] {
    return salons.filter(salon => {
      // Filter by minimum rating (Requirement 5.9)
      if (this.config.minRating && salon.rating < this.config.minRating) {
        return false;
      }
      
      // Filter by budget range (Requirement 5.9)
      if (this.config.budgetRange) {
        const salonPrice = this.getPricingEstimate(salon.pricing_tier);
        if (salonPrice < this.config.budgetRange.min || salonPrice > this.config.budgetRange.max) {
          return false;
        }
      }
      
      return true;
    });
  }
  
  /**
   * Rank salons using weighted scoring algorithm
   * 
   * Formula: 0.5 × expertise + 0.3 × rating + 0.2 × distance
   * (Requirement 5.4)
   * 
   * @param salons - Array of filtered salon data
   * @returns Ranked array of salon matches
   */
  private rankSalons(salons: RawSalonData[]): SalonMatch[] {
    const salonMatches: SalonMatch[] = salons.map(salon => {
      // Calculate expertise match score (0-100)
      const expertiseScore = this.calculateExpertiseScore(salon);
      
      // Normalize rating to 0-100 scale
      const ratingScore = (salon.rating / 5) * 100;
      
      // Calculate distance and normalize (closer = higher score)
      const distance = this.calculateDistance(
        this.config.userLocation,
        { lat: salon.latitude, lng: salon.longitude }
      );
      const maxDistance = this.config.searchRadius;
      const distanceScore = Math.max(0, (1 - distance / maxDistance) * 100);
      
      // Apply weighted formula
      const matchScore = Math.round(
        0.5 * expertiseScore +
        0.3 * ratingScore +
        0.2 * distanceScore
      );
      
      // Get matched specializations
      const expertiseMatch = this.getMatchedSpecializations(salon);
      
      return {
        salonId: salon.id,
        salonName: salon.name,
        matchScore,
        expertiseMatch,
        location: {
          address: salon.address,
          distance: Math.round(distance * 10) / 10, // Round to 1 decimal
          coordinates: { lat: salon.latitude, lng: salon.longitude },
        },
        availability: {
          nextAvailable: salon.next_available,
          slots: salon.available_slots,
        },
        pricing: {
          estimatedCost: this.getPricingEstimate(salon.pricing_tier),
          currency: 'INR',
        },
        rating: salon.rating,
        reviewCount: salon.review_count,
      };
    });
    
    // Sort by match score (highest first)
    return salonMatches.sort((a, b) => b.matchScore - a.matchScore);
  }
  
  /**
   * Calculate expertise match score based on style compatibility
   * 
   * @param salon - Raw salon data
   * @returns Expertise score (0-100)
   */
  private calculateExpertiseScore(salon: RawSalonData): number {
    const topStyleNames = this.config.topStyles
      .slice(0, 5) // Consider top 5 recommended styles
      .map(s => s.styleName);
    
    const matchedCount = salon.specializations.filter(spec =>
      topStyleNames.includes(spec)
    ).length;
    
    if (matchedCount === 0) return 30; // Base score for no match
    
    // More matches = higher score
    return Math.min(100, 30 + (matchedCount * 20));
  }
  
  /**
   * Get list of matched specializations
   */
  private getMatchedSpecializations(salon: RawSalonData): string[] {
    const topStyleNames = this.config.topStyles
      .slice(0, 5)
      .map(s => s.styleName);
    
    return salon.specializations.filter(spec =>
      topStyleNames.includes(spec)
    );
  }
  
  /**
   * Calculate distance between two coordinates using Haversine formula
   * 
   * @param point1 - First coordinate
   * @param point2 - Second coordinate
   * @returns Distance in miles
   */
  private calculateDistance(
    point1: { lat: number; lng: number },
    point2: { lat: number; lng: number }
  ): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(point2.lat - point1.lat);
    const dLng = this.toRadians(point2.lng - point1.lng);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(point1.lat)) *
        Math.cos(this.toRadians(point2.lat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
  
  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
  
  /**
   * Get pricing estimate from pricing tier
   */
  private getPricingEstimate(tier: string): number {
    const estimates: Record<string, number> = {
      budget: 750,      // ₹500-1000
      standard: 2000,   // ₹1000-3000
      premium: 6500,    // ₹3000-10000
      luxury: 15000,    // ₹10000+
    };
    
    return estimates[tier] || 2000;
  }
}
