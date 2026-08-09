/**
 * 3D Scene Utilities
 * 
 * Helper functions and constants for 3D rendering with Three.js.
 * Used across the Digital Twin and AR Virtual Makeover phases.
 * 
 * @see Design Document: Phase 5 - 3D Digital Twin Generation
 */

import * as THREE from 'three';

/**
 * Scene Configuration Constants
 */
export const SCENE_CONFIG = {
  // Camera settings
  camera: {
    fov: 50,
    near: 0.1,
    far: 1000,
    defaultPosition: new THREE.Vector3(0, 0, 5),
  },
  
  // Lighting settings
  lighting: {
    ambient: {
      intensity: 0.6,
      color: 0xffffff,
    },
    directional: {
      primary: {
        intensity: 0.8,
        position: new THREE.Vector3(5, 5, 5),
      },
      secondary: {
        intensity: 0.4,
        position: new THREE.Vector3(-5, 5, -5),
      },
    },
  },
  
  // Controls settings
  controls: {
    minDistance: 3,
    maxDistance: 8,
    maxPolarAngle: Math.PI / 1.5,
    minPolarAngle: Math.PI / 3,
    dampingFactor: 0.05,
  },
  
  // Performance settings
  performance: {
    targetFPS: 60,
    maxMemoryMB: 500,
    antialias: true,
    dpr: [1, 2] as [number, number],
  },
} as const;

/**
 * Create a basic material for testing/placeholder purposes
 */
export function createPlaceholderMaterial(color = '#8B7355'): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.8,
    metalness: 0.2,
    side: THREE.DoubleSide,
  });
}

/**
 * Calculate optimal camera distance based on model bounds
 */
export function calculateCameraDistance(
  boundingBox: THREE.Box3,
  fov: number = SCENE_CONFIG.camera.fov
): number {
  const size = new THREE.Vector3();
  boundingBox.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);
  const cameraDistance = maxDim / (2 * Math.tan((fov * Math.PI) / 360));
  return cameraDistance * 1.5; // Add 50% padding
}

/**
 * Create lighting setup for the scene
 */
export function createSceneLighting(): {
  ambient: THREE.AmbientLight;
  directional1: THREE.DirectionalLight;
  directional2: THREE.DirectionalLight;
} {
  const ambient = new THREE.AmbientLight(
    SCENE_CONFIG.lighting.ambient.color,
    SCENE_CONFIG.lighting.ambient.intensity
  );

  const directional1 = new THREE.DirectionalLight(
    0xffffff,
    SCENE_CONFIG.lighting.directional.primary.intensity
  );
  directional1.position.copy(SCENE_CONFIG.lighting.directional.primary.position);
  directional1.castShadow = true;

  const directional2 = new THREE.DirectionalLight(
    0xffffff,
    SCENE_CONFIG.lighting.directional.secondary.intensity
  );
  directional2.position.copy(SCENE_CONFIG.lighting.directional.secondary.position);

  return { ambient, directional1, directional2 };
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private frameCount = 0;
  private lastTime = performance.now();
  private fps = 0;

  /**
   * Update FPS counter (call once per frame)
   */
  update(): number {
    this.frameCount++;
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;

    if (deltaTime >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / deltaTime);
      this.frameCount = 0;
      this.lastTime = currentTime;
    }

    return this.fps;
  }

  /**
   * Get current FPS
   */
  getFPS(): number {
    return this.fps;
  }

  /**
   * Check if performance meets target (60 FPS for digital twin, 30 FPS for AR)
   */
  meetsTarget(targetFPS: number = 60): boolean {
    return this.fps >= targetFPS;
  }
}

/**
 * Memory usage monitoring
 */
export function getMemoryUsage(): number | null {
  if ('memory' in performance) {
    // @ts-ignore - memory API is not standard but available in Chrome
    return Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
  }
  return null;
}

/**
 * Check if WebGL 2 is supported (required for advanced rendering)
 */
export function isWebGL2Supported(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      canvas.getContext('webgl2') ||
      canvas.getContext('experimental-webgl2')
    );
  } catch (e) {
    return false;
  }
}

/**
 * Optimize renderer settings based on device capabilities
 */
export function getOptimalRendererSettings(): {
  antialias: boolean;
  powerPreference: 'high-performance' | 'low-power' | 'default';
  dpr: number;
} {
  // Check if device is mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

  // Check if device has limited memory
  const hasLimitedMemory = 'deviceMemory' in navigator && 
    // @ts-ignore - deviceMemory is experimental
    (navigator.deviceMemory as number) < 4;

  return {
    antialias: !isMobile, // Disable on mobile for performance
    powerPreference: isMobile || hasLimitedMemory ? 'low-power' : 'high-performance',
    dpr: Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2),
  };
}
