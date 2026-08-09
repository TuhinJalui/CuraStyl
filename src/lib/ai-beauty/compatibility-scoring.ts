/**
 * Beauty Compatibility Scoring Engine
 * 
 * Uses OpenAI Vision API to score hairstyle compatibility based on facial features and hair analysis.
 * Provides AI-powered recommendations with explanatory reasoning.
 * 
 * @see Design Document: Phase 7 - Beauty Compatibility Engine
 * @see Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9
 */

import { generateWithRetry, getKeyStatus } from '@/lib/ai/gemini-client';
import type { FaceAnalysisData, HairAnalysisData, StyleCompatibilityScore } from './types';
import type { HairstyleAsset } from './ar-overlay-renderer';

/**
 * Compatibility scoring configuration
 */
export interface ScoringConfig {
  /** OpenAI API key */
  apiKey?: string;
  
  /** Model to use (default: gpt-4o for vision capabilities) */
  model?: string;
  
  /** Max concurrent requests */
  maxConcurrent?: number;
  
  /** Enable caching */
  enableCache?: boolean;
  
  /** Request timeout in milliseconds (default: 10000) */
  timeout?: number;
}

/**
 * Compatibility Scoring Engine
 * 
 * Scores hairstyle compatibility using OpenAI Vision API with fallback to rule-based scoring.
 */
export class CompatibilityScoringEngine {
  private config: Required<ScoringConfig>;
  private cache: Map<string, StyleCompatibilityScore> = new Map();
  
  constructor(config: ScoringConfig) {
    this.config = {
      apiKey: config.apiKey ?? '',
      model: config.model ?? 'gpt-4o',
      maxConcurrent: config.maxConcurrent ?? 3,
      enableCache: config.enableCache ?? true,
      timeout: config.timeout ?? 10000,
    };
    // If an OpenAI key was provided, warn that Gemini is preferred in-server.
    const keyStatus = getKeyStatus();
    if ((!this.config.apiKey || this.config.apiKey.trim() === '') && keyStatus.totalKeys === 0) {
      console.warn('No Gemini API keys configured and no OpenAI key provided — engine will use fallback scoring only');
    }
  }
  
  /**
   * Prepare structured prompt for OpenAI Vision API
   * 
   * @param faceAnalysis - Face analysis data
   * @param hairAnalysis - Hair analysis data
   * @param style - Hairstyle to evaluate
   * @returns Structured prompt text
   */
  preparePrompt(
    faceAnalysis: FaceAnalysisData,
    hairAnalysis: HairAnalysisData,
    style: HairstyleAsset
  ): string {
    return `You are a professional beauty consultant AI. Analyze the compatibility between the person's features and the proposed hairstyle.

**Person's Features:**
- Face Shape: ${faceAnalysis.faceShape}
- Skin Tone: ${faceAnalysis.skinTone}
- Eye Shape: ${faceAnalysis.facialFeatures.eyeShape}
- Eye Color: ${faceAnalysis.facialFeatures.eyeColor}

**Hair Characteristics:**
- Current Color: ${hairAnalysis.color}
- Texture: ${hairAnalysis.texture}
- Length: ${hairAnalysis.length}
- Density: ${hairAnalysis.density}

**Proposed Hairstyle:**
- Name: ${style.name}
- Category: ${style.category}

**Instructions:**
1. Provide a compatibility score from 0 to 100 (0 = poor match, 100 = perfect match)
2. Explain your reasoning in 2-3 sentences
3. Consider face shape, hair texture, and overall style harmony

**Response Format (JSON):**
{
  "score": <number 0-100>,
  "reasoning": "<explanation>",
  "confidence": <number 0-1>
}`;
  }
  
  /**
   * Score a single style using OpenAI Vision API
   * 
   * @param faceAnalysis - Face analysis data
   * @param hairAnalysis - Hair analysis data  
   * @param style - Hairstyle to score
   * @returns Style compatibility score
   */
  async scoreStyle(
    faceAnalysis: FaceAnalysisData,
    hairAnalysis: HairAnalysisData,
    style: HairstyleAsset
  ): Promise<StyleCompatibilityScore> {
    // Check cache first
    const cacheKey = this.getCacheKey(faceAnalysis, hairAnalysis, style);
    
    if (this.config.enableCache && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }
    
    // Try API with retries
    try {
      const result = await this.scoreWithRetry(faceAnalysis, hairAnalysis, style);
      
      // Cache result
      if (this.config.enableCache) {
        this.cache.set(cacheKey, result);
      }
      
      return result;
    } catch (error) {
      console.error('OpenAI API failed, using fallback scoring:', error);
      return this.fallbackScoring(faceAnalysis, hairAnalysis, style);
    }
  }
  
  /**
   * Score multiple styles in parallel
   * 
   * @param faceAnalysis - Face analysis data
   * @param hairAnalysis - Hair analysis data
   * @param styles - Array of hairstyles to score
   * @returns Array of compatibility scores
   */
  async scoreMultipleStyles(
    faceAnalysis: FaceAnalysisData,
    hairAnalysis: HairAnalysisData,
    styles: HairstyleAsset[]
  ): Promise<StyleCompatibilityScore[]> {
    // Batch requests with concurrency limit
    const results: StyleCompatibilityScore[] = [];
    
    for (let i = 0; i < styles.length; i += this.config.maxConcurrent) {
      const batch = styles.slice(i, i + this.config.maxConcurrent);
      
      const batchPromises = batch.map(style =>
        this.scoreStyle(faceAnalysis, hairAnalysis, style)
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }
    
    return results;
  }
  
  /**
   * Score with exponential backoff retry
   * 
   * @param faceAnalysis - Face analysis data
   * @param hairAnalysis - Hair analysis data
   * @param style - Hairstyle to score
   * @param retries - Number of retries remaining
   * @returns Style compatibility score
   */
  private async scoreWithRetry(
    faceAnalysis: FaceAnalysisData,
    hairAnalysis: HairAnalysisData,
    style: HairstyleAsset,
    retries = 3
  ): Promise<StyleCompatibilityScore> {
    const delays = [1000, 2000, 4000]; // Exponential backoff: 1s, 2s, 4s
    
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const startTime = performance.now();
        
        const prompt = this.preparePrompt(faceAnalysis, hairAnalysis, style);
        // Use Gemini client wrapper for generation (with retries/key rotation)
        const modelName = this.config.model ?? 'gemini-1.5-flash';
        const responseText = await generateWithRetry(modelName, prompt, { maxTokens: 300, temperature: 0.7 });

        const duration = performance.now() - startTime;

        if (duration > 3000) {
          console.warn(`Gemini response took ${duration.toFixed(0)}ms (target: <3000ms)`);
        }

        const parsed = this.parseAPIResponse(responseText || '{}');
        
        return {
          styleId: style.id,
          styleName: style.name,
          compatibilityScore: parsed.score,
          reasoning: parsed.reasoning,
          visualPreviewUrl: style.imageUrl,
          confidence: parsed.confidence,
          tags: [style.category],
        };
        
      } catch (error) {
        const isLastAttempt = attempt === retries - 1;
        
        if (isLastAttempt) {
          throw error;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delays[attempt]));
      }
    }
    
    throw new Error('All retry attempts failed');
  }
  
  /**
   * Parse OpenAI API response
   * 
   * @param content - API response content
   * @returns Parsed score data
   */
  private parseAPIResponse(content: string): {
    score: number;
    reasoning: string;
    confidence: number;
  } {
    try {
      // Try to extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        
        return {
          score: Math.max(0, Math.min(100, Math.round(data.score || 50))),
          reasoning: data.reasoning || 'No reasoning provided',
          confidence: Math.max(0, Math.min(1, data.confidence || 0.7)),
        };
      }
    } catch (error) {
      console.error('Failed to parse API response:', error);
    }
    
    // Fallback parsing
    return {
      score: 50,
      reasoning: content.substring(0, 200) || 'Unable to parse response',
      confidence: 0.5,
    };
  }
  
  /**
   * Rule-based fallback scoring
   * 
   * @param faceAnalysis - Face analysis data
   * @param hairAnalysis - Hair analysis data
   * @param style - Hairstyle to score
   * @returns Style compatibility score
   */
  private fallbackScoring(
    faceAnalysis: FaceAnalysisData,
    hairAnalysis: HairAnalysisData,
    style: HairstyleAsset
  ): StyleCompatibilityScore {
    let score = 50; // Base score
    let reasoning = '';
    
    // Face shape compatibility
    const faceShapeScores: Record<string, Record<string, number>> = {
      oval: { 'Wolf Cut': 10, 'Korean Perm': 10, 'Layered Long': 10 },
      round: { 'Pixie Cut': 10, 'Side Part': 10, 'Undercut': 10 },
      square: { 'Quiff': 10, 'Pompadour': 10, 'Slicked Back': 10 },
      heart: { 'Bob Cut': 10, 'Beach Waves': 10, 'Curtain Bangs': 10 },
      diamond: { 'Man Bun': 10, 'Shag Cut': 10 },
      long: { 'Fade Cut': 10, 'Buzz Cut': 10, 'Mohawk': 10 },
    };
    
    score += faceShapeScores[faceAnalysis.faceShape]?.[style.name] || 0;
    reasoning += `${faceAnalysis.faceShape} face shape. `;
    
    // Hair texture compatibility
    if (hairAnalysis.texture === 'curly' || hairAnalysis.texture === 'coily') {
      if (['Afro', 'Braids', 'Beach Waves'].includes(style.name)) {
        score += 15;
        reasoning += 'Natural texture works well. ';
      }
    }
    
    // Hair length compatibility
    if (hairAnalysis.length === 'short' && ['Buzz Cut', 'Pixie Cut', 'Fade Cut'].includes(style.name)) {
      score += 10;
      reasoning += 'Good match for current length. ';
    }
    
    // Random variation for diversity
    score += Math.floor(Math.random() * 20) - 10;
    score = Math.max(0, Math.min(100, score));
    
    return {
      styleId: style.id,
      styleName: style.name,
      compatibilityScore: score,
      reasoning: reasoning + 'Score based on traditional beauty guidelines.',
      visualPreviewUrl: style.imageUrl,
      confidence: 0.6,
      tags: [style.category, 'fallback-scoring'],
    };
  }
  
  /**
   * Generate cache key from analysis data and style
   * 
   * @param faceAnalysis - Face analysis data
   * @param hairAnalysis - Hair analysis data
   * @param style - Hairstyle
   * @returns Cache key string
   */
  private getCacheKey(
    faceAnalysis: FaceAnalysisData,
    hairAnalysis: HairAnalysisData,
    style: HairstyleAsset
  ): string {
    const data = {
      face: faceAnalysis.faceShape,
      skin: faceAnalysis.skinTone,
      hair: {
        color: hairAnalysis.color,
        texture: hairAnalysis.texture,
        length: hairAnalysis.length,
      },
      style: style.id,
    };
    
    return JSON.stringify(data);
  }
  
  /**
   * Clear scoring cache
   */
  clearCache(): void {
    this.cache.clear();
  }
  
  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.cache.size;
  }
}
