/**
 * 3D Rendering Module
 * 
 * Central export point for all 3D rendering functionality:
 * - Digital Twin generation (Phase 5)
 * - Mesh generation from facial landmarks
 * - Gaussian Splat rendering
 * - Scene utilities and configuration
 * 
 * @see Design Document: Phase 5 - 3D Digital Twin Generation
 */

// Re-export scene utilities
export * from '../3d-scene-utils';

// Types
export type { DigitalTwinModel } from '../types';

// Mesh Generation (Task 7)
export { MeshGenerator, generateMeshFromLandmarks } from '../mesh-generator';
export type { MeshData } from '../mesh-generator';

// Note: Additional modules will be added in Tasks 8-10:
// - GaussianSplatRenderer (Task 8)
// - Animation utilities (Task 9)
