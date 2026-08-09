/**
 * Beauty Compatibility Scoring Engine Tests
 * 
 * Unit tests for compatibility scoring functionality.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CompatibilityScoringEngine, type ScoringConfig } from './compatibility-scoring';
import type { FaceAnalysisData, HairAnalysisData } from './types';
import type { HairstyleAsset } from './ar-overlay-renderer';

describe('CompatibilityScoringEngine', () => {
  let mockFaceAnalysis: FaceAnalysisData;
  let mockHairAnalysis: HairAnalysisData;
  let mockStyle: HairstyleAsset;

  beforeEach(() => {
    mockFaceAnalysis = {
      landmarks: [],
      faceShape: 'oval',
      skinTone: '#c58c85',
      facialFeatures: {
        eyeShape: 'almond',
        eyeColor: 'brown',
        lipShape: 'full',
        noseShape: 'straight',
      },
      confidence: 0.9,
      timestamp: Date.now(),
    };

    mockHairAnalysis = {
      color: '#2c1810',
      length: 'medium',
      texture: 'wavy',
      density: 'medium',
      segmentationMask: new ImageData(1, 1),
      confidence: 0.85,
      timestamp: Date.now(),
    };

    mockStyle = {
      id: 'wolf-cut',
      name: 'Wolf Cut',
      imageUrl: '/styles/wolf-cut.png',
      category: 'modern',
      scaleFactor: 1.5,
      offsetY: -0.5,
    };
  });

  describe('Constructor', () => {
    it('should throw error if API key is empty', () => {
      expect(() => {
        new CompatibilityScoringEngine({ apiKey: '' });
      }).toThrow('OpenAI API key is required');
    });

    it('should initialize with valid config', () => {
      const engine = new CompatibilityScoringEngine({
        apiKey: 'sk-test-key',
        enableCache: true,
      });

      expect(engine).toBeDefined();
      expect(engine.getCacheSize()).toBe(0);
    });

    it('should apply default config values', () => {
      const engine = new CompatibilityScoringEngine({
        apiKey: 'sk-test-key',
      });

      expect(engine).toBeDefined();
    });
  });

  describe('preparePrompt', () => {
    it('should create structured prompt with all required fields', () => {
      const engine = new CompatibilityScoringEngine({ apiKey: 'sk-test-key' });
      
      const prompt = engine.preparePrompt(mockFaceAnalysis, mockHairAnalysis, mockStyle);

      // Verify prompt contains all required fields
      expect(prompt).toContain(mockFaceAnalysis.faceShape);
      expect(prompt).toContain(mockFaceAnalysis.skinTone);
      expect(prompt).toContain(mockFaceAnalysis.facialFeatures.eyeShape);
      expect(prompt).toContain(mockFaceAnalysis.facialFeatures.eyeColor);
      expect(prompt).toContain(mockHairAnalysis.color);
      expect(prompt).toContain(mockHairAnalysis.texture);
      expect(prompt).toContain(mockHairAnalysis.length);
      expect(prompt).toContain(mockHairAnalysis.density);
      expect(prompt).toContain(mockStyle.name);
      expect(prompt).toContain(mockStyle.category);
      
      // Verify JSON response format is specified
      expect(prompt).toContain('score');
      expect(prompt).toContain('reasoning');
      expect(prompt).toContain('confidence');
    });
  });

  describe('Cache Management', () => {
    it('should start with empty cache', () => {
      const engine = new CompatibilityScoringEngine({ 
        apiKey: 'sk-test-key',
        enableCache: true,
      });

      expect(engine.getCacheSize()).toBe(0);
    });

    it('should clear cache', () => {
      const engine = new CompatibilityScoringEngine({ 
        apiKey: 'sk-test-key',
        enableCache: true,
      });

      engine.clearCache();
      expect(engine.getCacheSize()).toBe(0);
    });
  });

  describe('Fallback Scoring', () => {
    it('should generate fallback scores when API fails', () => {
      const engine = new CompatibilityScoringEngine({ apiKey: 'sk-invalid' });
      
      // Access private method through type assertion for testing
      const fallbackScore = (engine as any).fallbackScoring(
        mockFaceAnalysis,
        mockHairAnalysis,
        mockStyle
      );

      expect(fallbackScore).toBeDefined();
      expect(fallbackScore.styleId).toBe(mockStyle.id);
      expect(fallbackScore.styleName).toBe(mockStyle.name);
      expect(fallbackScore.compatibilityScore).toBeGreaterThanOrEqual(0);
      expect(fallbackScore.compatibilityScore).toBeLessThanOrEqual(100);
      expect(fallbackScore.reasoning).toBeTruthy();
      expect(fallbackScore.confidence).toBeGreaterThan(0);
      expect(fallbackScore.confidence).toBeLessThanOrEqual(1);
      expect(fallbackScore.tags).toContain('fallback-scoring');
    });

    it('should score oval face with Wolf Cut highly', () => {
      const engine = new CompatibilityScoringEngine({ apiKey: 'sk-invalid' });
      
      const fallbackScore = (engine as any).fallbackScoring(
        mockFaceAnalysis,
        mockHairAnalysis,
        mockStyle
      );

      // Oval faces generally work well with Wolf Cut
      expect(fallbackScore.compatibilityScore).toBeGreaterThan(40);
    });

    it('should consider hair texture in scoring', () => {
      const engine = new CompatibilityScoringEngine({ apiKey: 'sk-invalid' });
      
      const curlyHair: HairAnalysisData = {
        ...mockHairAnalysis,
        texture: 'curly',
      };

      const beachWavesStyle: HairstyleAsset = {
        id: 'beach-waves',
        name: 'Beach Waves',
        imageUrl: '/styles/beach-waves.png',
        category: 'casual',
      };

      const score = (engine as any).fallbackScoring(
        mockFaceAnalysis,
        curlyHair,
        beachWavesStyle
      );

      expect(score.reasoning).toContain('texture');
    });
  });

  describe('Configuration', () => {
    it('should accept custom model', () => {
      const engine = new CompatibilityScoringEngine({
        apiKey: 'sk-test-key',
        model: 'gpt-4-turbo',
      });

      expect(engine).toBeDefined();
    });

    it('should accept custom concurrency limit', () => {
      const engine = new CompatibilityScoringEngine({
        apiKey: 'sk-test-key',
        maxConcurrent: 5,
      });

      expect(engine).toBeDefined();
    });

    it('should accept custom timeout', () => {
      const engine = new CompatibilityScoringEngine({
        apiKey: 'sk-test-key',
        timeout: 5000,
      });

      expect(engine).toBeDefined();
    });
  });
});
