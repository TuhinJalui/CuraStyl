/**
 * Client-Side Compatibility Scoring Wrapper
 * 
 * This module provides a client-safe wrapper around the CompatibilityScoringEngine
 * that handles API key retrieval from environment variables and provides fallback scoring.
 */

import { CompatibilityScoringEngine } from './compatibility-scoring';
import type { FaceAnalysisData, HairAnalysisData, StyleCompatibilityScore } from './types';
import type { HairstyleAsset } from './ar-overlay-renderer';

export interface ScoringResult {
  scores: StyleCompatibilityScore[];
  usedFallback: boolean;
  error?: string;
}

/**
 * Score multiple hairstyles for compatibility
 * 
 * @param faceAnalysis - Face analysis data
 * @param hairAnalysis - Hair analysis data
 * @param styles - Array of hairstyle assets to score
 * @param onProgress - Optional progress callback (0-100)
 * @returns Scoring result with scores and metadata
 */
export async function scoreStyleCompatibility(
  faceAnalysis: FaceAnalysisData,
  hairAnalysis: HairAnalysisData,
  styles: HairstyleAsset[],
  onProgress?: (progress: number) => void
): Promise<ScoringResult> {
  try {
    // Call server-side scoring endpoint so secret keys stay on server
    const resp = await fetch('/api/ai/beauty-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ faceAnalysis, hairAnalysis, styles }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      console.warn('Server scoring failed, using fallback', data);
      return await fallbackScoring(faceAnalysis, hairAnalysis, styles, onProgress);
    }

    // If server returned fallback, use client fallback instead
    if (data?.fallback) {
      return await fallbackScoring(faceAnalysis, hairAnalysis, styles, onProgress);
    }

    const scores: StyleCompatibilityScore[] = data.scores || [];
    // Sort by compatibility score (highest first)
    scores.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

    // Report progress as complete
    if (onProgress) onProgress(100);

    return {
      scores,
      usedFallback: !!data?.fallback,
    };
    
  } catch (error) {
    console.error('Compatibility scoring failed, using fallback:', error);
    return await fallbackScoring(faceAnalysis, hairAnalysis, styles, onProgress);
  }
}

/**
 * Fallback rule-based scoring when API is unavailable
 */
async function fallbackScoring(
  faceAnalysis: FaceAnalysisData,
  hairAnalysis: HairAnalysisData,
  styles: HairstyleAsset[],
  onProgress?: (progress: number) => void
): Promise<ScoringResult> {
  const scores: StyleCompatibilityScore[] = [];
  
  // Face shape compatibility matrix
  const faceShapeScores: Record<string, Record<string, number>> = {
    oval: { 
      'Wolf Cut': 10, 'Korean Perm': 10, 'Layered Long': 10, 
      'Beach Waves': 8, 'Bob Cut': 8, 'Pixie Cut': 7 
    },
    round: { 
      'Pixie Cut': 10, 'Side Part': 10, 'Undercut': 10,
      'Fade Cut': 8, 'Quiff': 8, 'Shag Cut': 7
    },
    square: { 
      'Quiff': 10, 'Pompadour': 10, 'Slicked Back': 10,
      'Man Bun': 8, 'Buzz Cut': 7, 'Mohawk': 7
    },
    heart: { 
      'Bob Cut': 10, 'Beach Waves': 10, 'Curtain Bangs': 10,
      'Layered Long': 8, 'Wolf Cut': 7, 'Pixie Cut': 6
    },
    diamond: { 
      'Man Bun': 10, 'Shag Cut': 10, 'Side Part': 9,
      'Layered Long': 8, 'Wolf Cut': 7
    },
    long: { 
      'Fade Cut': 10, 'Buzz Cut': 10, 'Mohawk': 10,
      'Undercut': 8, 'Pixie Cut': 7
    },
  };
  
  for (let i = 0; i < styles.length; i++) {
    const style = styles[i];
    let score = 50; // Base score
    let reasoning = '';
    
    // Face shape compatibility
    const faceShapeBonus = faceShapeScores[faceAnalysis.faceShape]?.[style.name] || 0;
    score += faceShapeBonus;
    reasoning += `${faceAnalysis.faceShape} face shape matches well. `;
    
    // Hair texture compatibility
    if (hairAnalysis.texture === 'curly' || hairAnalysis.texture === 'coily') {
      if (['Afro', 'Braids', 'Beach Waves', 'Shag Cut'].includes(style.name)) {
        score += 15;
        reasoning += 'Natural texture works beautifully. ';
      }
    } else if (hairAnalysis.texture === 'straight') {
      if (['Slicked Back', 'Bob Cut', 'Pixie Cut', 'Korean Perm'].includes(style.name)) {
        score += 15;
        reasoning += 'Straight hair is ideal for this style. ';
      }
    }
    
    // Hair length compatibility
    if (hairAnalysis.length === 'short') {
      if (['Buzz Cut', 'Pixie Cut', 'Fade Cut', 'Undercut'].includes(style.name)) {
        score += 10;
        reasoning += 'Perfect for short hair. ';
      }
    } else if (hairAnalysis.length === 'long') {
      if (['Layered Long', 'Beach Waves', 'Man Bun', 'Wolf Cut'].includes(style.name)) {
        score += 10;
        reasoning += 'Showcases long hair beautifully. ';
      }
    }
    
    // Hair density considerations
    if (hairAnalysis.density === 'thick') {
      if (['Layered Long', 'Shag Cut', 'Wolf Cut'].includes(style.name)) {
        score += 5;
        reasoning += 'Thick hair adds volume. ';
      }
    }
    
    // Add some variation for diversity
    score += Math.floor(Math.random() * 15) - 5;
    score = Math.max(30, Math.min(95, score)); // Clamp between 30-95
    
    scores.push({
      styleId: style.id,
      styleName: style.name,
      compatibilityScore: score,
      reasoning: reasoning + 'Recommendation based on beauty guidelines.',
      visualPreviewUrl: style.imageUrl,
      confidence: 0.65,
      tags: [style.category, 'rule-based'],
    });
    
    // Report progress
    if (onProgress) {
      const progress = Math.round(((i + 1) / styles.length) * 100);
      onProgress(progress);
    }
  }
  
  // Sort by compatibility score
  scores.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
  
  return {
    scores,
    usedFallback: true,
  };
}
