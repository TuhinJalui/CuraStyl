/**
 * 3D Rendering Infrastructure Setup Tests
 * 
 * Validates that the 3D rendering infrastructure is correctly set up:
 * - Dependencies are installed
 * - TypeScript interfaces are defined
 * - Utilities are functional
 * 
 * @see Task 6: Set up 3D rendering infrastructure
 */

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import type { DigitalTwinModel } from '../types';
import { 
  SCENE_CONFIG,
  createPlaceholderMaterial,
  calculateCameraDistance,
  PerformanceMonitor,
  isWebGL2Supported,
  getOptimalRendererSettings
} from '../3d-scene-utils';

describe('3D Rendering Infrastructure Setup', () => {
  describe('Three.js Dependencies', () => {
    it('should have Three.js imported correctly', () => {
      expect(THREE).toBeDefined();
      expect(THREE.Vector3).toBeDefined();
      expect(THREE.Mesh).toBeDefined();
      expect(THREE.Scene).toBeDefined();
    });

    it('should have required Three.js classes available', () => {
      const vector = new THREE.Vector3(1, 2, 3);
      expect(vector.x).toBe(1);
      expect(vector.y).toBe(2);
      expect(vector.z).toBe(3);
    });
  });

  describe('TypeScript Interfaces', () => {
    it('should have DigitalTwinModel interface defined', () => {
      // Type test - this will fail to compile if interface is missing
      const mockModel: DigitalTwinModel = {
        meshData: new Float32Array([1, 2, 3]),
        gaussianSplatData: {
          positions: new Float32Array([0, 0, 0]),
          colors: new Uint8Array([255, 255, 255]),
          scales: new Float32Array([1, 1, 1]),
          rotations: new Float32Array([0, 0, 0, 1]),
        },
        textureMap: 'data:image/png;base64,test',
        animationRig: {},
      };

      expect(mockModel).toBeDefined();
      expect(mockModel.meshData).toBeInstanceOf(Float32Array);
      expect(mockModel.gaussianSplatData.positions).toBeInstanceOf(Float32Array);
    });

    it('should have GaussianSplatData structure in DigitalTwinModel', () => {
      const mockModel: DigitalTwinModel = {
        meshData: new Float32Array(),
        gaussianSplatData: {
          positions: new Float32Array(),
          colors: new Uint8Array(),
          scales: new Float32Array(),
          rotations: new Float32Array(),
        },
        textureMap: '',
        animationRig: {},
      };

      expect(mockModel.gaussianSplatData).toHaveProperty('positions');
      expect(mockModel.gaussianSplatData).toHaveProperty('colors');
      expect(mockModel.gaussianSplatData).toHaveProperty('scales');
      expect(mockModel.gaussianSplatData).toHaveProperty('rotations');
    });
  });

  describe('Scene Configuration', () => {
    it('should have scene configuration defined', () => {
      expect(SCENE_CONFIG).toBeDefined();
      expect(SCENE_CONFIG.camera).toBeDefined();
      expect(SCENE_CONFIG.lighting).toBeDefined();
      expect(SCENE_CONFIG.controls).toBeDefined();
      expect(SCENE_CONFIG.performance).toBeDefined();
    });

    it('should have correct camera settings', () => {
      expect(SCENE_CONFIG.camera.fov).toBe(50);
      expect(SCENE_CONFIG.camera.near).toBe(0.1);
      expect(SCENE_CONFIG.camera.far).toBe(1000);
    });

    it('should have performance targets defined', () => {
      expect(SCENE_CONFIG.performance.targetFPS).toBe(60);
      expect(SCENE_CONFIG.performance.maxMemoryMB).toBe(500);
    });
  });

  describe('Scene Utilities', () => {
    it('should create placeholder material', () => {
      const material = createPlaceholderMaterial();
      expect(material).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(material.roughness).toBe(0.8);
      expect(material.metalness).toBe(0.2);
    });

    it('should create placeholder material with custom color', () => {
      const material = createPlaceholderMaterial('#FF0000');
      expect(material).toBeInstanceOf(THREE.MeshStandardMaterial);
    });

    it('should calculate camera distance from bounding box', () => {
      const box = new THREE.Box3(
        new THREE.Vector3(-1, -1, -1),
        new THREE.Vector3(1, 1, 1)
      );
      const distance = calculateCameraDistance(box, 50);
      expect(distance).toBeGreaterThan(0);
      expect(typeof distance).toBe('number');
    });
  });

  describe('Performance Monitor', () => {
    it('should create performance monitor instance', () => {
      const monitor = new PerformanceMonitor();
      expect(monitor).toBeInstanceOf(PerformanceMonitor);
    });

    it('should return initial FPS as 0', () => {
      const monitor = new PerformanceMonitor();
      expect(monitor.getFPS()).toBe(0);
    });

    it('should check performance targets', () => {
      const monitor = new PerformanceMonitor();
      const meetsTarget60 = monitor.meetsTarget(60);
      const meetsTarget30 = monitor.meetsTarget(30);
      expect(typeof meetsTarget60).toBe('boolean');
      expect(typeof meetsTarget30).toBe('boolean');
    });
  });

  describe('Browser Capabilities', () => {
    it('should check WebGL2 support', () => {
      const supported = isWebGL2Supported();
      expect(typeof supported).toBe('boolean');
    });

    it('should get optimal renderer settings', () => {
      const settings = getOptimalRendererSettings();
      expect(settings).toHaveProperty('antialias');
      expect(settings).toHaveProperty('powerPreference');
      expect(settings).toHaveProperty('dpr');
      expect(typeof settings.antialias).toBe('boolean');
      expect(typeof settings.dpr).toBe('number');
    });
  });
});
