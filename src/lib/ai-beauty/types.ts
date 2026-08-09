/**
 * AI Beauty Engine Type Definitions
 * 
 * This file contains all TypeScript interfaces for the AI Beauty Intelligence Engine™
 * matching the design document specifications.
 */

/**
 * Hair Analysis Data
 * 
 * Contains comprehensive hair characteristics detected by the hair segmentation engine.
 * @see Design Document: HairAnalysisData
 */
export interface HairAnalysisData {
  /** Hex color code of dominant hair color (e.g., "#3d2614") */
  color: string;
  
  /** Hair length classification */
  length: 'short' | 'medium' | 'long';
  
  /** Hair texture/pattern classification */
  texture: 'straight' | 'wavy' | 'curly' | 'coily';
  
  /** Hair density/volume classification */
  density: 'thin' | 'medium' | 'thick';
  
  /** Binary segmentation mask identifying hair pixels */
  segmentationMask: ImageData;
  
  /** Confidence score for the analysis (0-1) */
  confidence: number;
  
  /** Unix timestamp of when analysis was performed */
  timestamp: number;
}

/**
 * Face Analysis Data
 * 
 * Contains facial landmark coordinates and feature classifications.
 * @see Design Document: FaceAnalysisData
 */
export interface FaceAnalysisData {
  /** Array of 468 facial landmark points in 3D space */
  landmarks: {
    x: number;
    y: number;
    z: number;
  }[];
  
  /** Classified face shape category */
  faceShape: 'oval' | 'round' | 'square' | 'heart' | 'diamond' | 'long';
  
  /** Hex color code of dominant skin tone */
  skinTone: string;
  
  /** Detailed facial feature classifications */
  facialFeatures: {
    eyeShape: string;
    eyeColor: string;
    lipShape: string;
    noseShape: string;
  };
  
  /** Confidence score for the analysis (0-1) */
  confidence: number;
  
  /** Unix timestamp of when analysis was performed */
  timestamp: number;
}

/**
 * 3D Digital Twin Model Data
 * 
 * Contains all data required to render the user's 3D avatar.
 * @see Design Document: DigitalTwinModel
 */
export interface DigitalTwinModel {
  /** Raw 3D mesh vertex data */
  meshData: Float32Array;
  
  /** Gaussian Splat rendering data */
  gaussianSplatData: {
    positions: Float32Array;
    colors: Uint8Array;
    scales: Float32Array;
    rotations: Float32Array;
  };
  
  /** Base64 encoded texture map */
  textureMap: string;
  
  /** Animation rig data for head rotation and expressions */
  animationRig: object;
}

/**
 * Style Compatibility Score
 * 
 * Contains AI-generated compatibility assessment for a specific hairstyle.
 * @see Design Document: StyleCompatibilityScore
 */
export interface StyleCompatibilityScore {
  /** Unique identifier for the style */
  styleId: string;
  
  /** Display name of the style */
  styleName: string;
  
  /** Compatibility percentage (0-100) */
  compatibilityScore: number;
  
  /** AI-generated explanation of the score */
  reasoning: string;
  
  /** URL to AR preview image */
  visualPreviewUrl: string;
  
  /** Confidence in the scoring (0-1) */
  confidence: number;
  
  /** Style categorization tags */
  tags: string[];
}

/**
 * Salon Match Data
 * 
 * Contains salon information and match quality metrics.
 * @see Design Document: SalonMatch
 */
export interface SalonMatch {
  /** Unique salon identifier */
  salonId: string;
  
  /** Salon business name */
  salonName: string;
  
  /** Overall match quality score (0-100) */
  matchScore: number;
  
  /** Array of style specializations that match user's recommended styles */
  expertiseMatch: string[];
  
  /** Location details */
  location: {
    address: string;
    distance: number; // in miles/km
    coordinates: { lat: number; lng: number };
  };
  
  /** Booking availability information */
  availability: {
    nextAvailable: string; // ISO date string
    slots: string[]; // Array of available time slots
  };
  
  /** Pricing information */
  pricing: {
    estimatedCost: number;
    currency: string;
  };
  
  /** Average rating (0-5) */
  rating: number;
  
  /** Number of reviews */
  reviewCount: number;
}

/**
 * AI Beauty Blueprint (Complete Report)
 * 
 * Aggregated analysis results for PDF report generation.
 * @see Design Document: AIBeautyBlueprint
 */
export interface AIBeautyBlueprint {
  /** User identifier */
  userId: string;
  
  /** ISO date string of report generation */
  generatedAt: string;
  
  /** Complete face analysis results */
  faceAnalysis: FaceAnalysisData;
  
  /** Complete hair analysis results */
  hairAnalysis: HairAnalysisData;
  
  /** Top recommended styles with compatibility scores */
  topStyles: StyleCompatibilityScore[];
  
  /** Recommended salons ranked by match quality */
  recommendedSalons: SalonMatch[];
  
  /** Before/after AR preview images */
  beforeAfterPreviews: {
    before: string; // Image URL
    after: string; // Image URL
    styleId: string;
  }[];
  
  /** URL to generated PDF report */
  pdfUrl: string;
}

/**
 * User Preferences from Consultation Phase
 */
export interface UserPreferences {
  hairGoal?: string;
  skinGoal?: string;
  budget?: string;
  distance?: string;
  preferences?: string[];
}

/**
 * Legacy Beauty Profile (from existing implementation)
 * TODO: Migrate to use FaceAnalysisData and HairAnalysisData
 */
export interface BeautyProfile {
  faceShape?: string;
  skinTone?: string;
  skinHealth?: number;
  hairDensity?: string;
  hairHealth?: number;
  beautyScore?: number;
}
