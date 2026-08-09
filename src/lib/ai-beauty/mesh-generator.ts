/**
 * MeshGenerator - 3D Mesh Generation from Facial Landmarks
 * 
 * Converts 468 facial landmarks (from TensorFlow.js Face Landmarks Detection)
 * into a 3D mesh with vertices, faces (triangles), and normals for Three.js rendering.
 * 
 * @see Design Document: Phase 5 - 3D Digital Twin Generation
 * @see Requirements: 2.1, 2.5
 */

import type { FaceAnalysisData } from './types';

/**
 * 3D Mesh data structure for Three.js BufferGeometry
 */
export interface MeshData {
  /** Vertex positions as flat Float32Array [x, y, z, x, y, z, ...] */
  vertices: Float32Array;
  
  /** Triangle face indices as flat Uint16Array [a, b, c, a, b, c, ...] */
  faces: Uint16Array;
  
  /** Vertex normals as flat Float32Array [nx, ny, nz, nx, ny, nz, ...] */
  normals: Float32Array;
  
  /** UV coordinates for texture mapping [u, v, u, v, ...] */
  uvs: Float32Array;
  
  /** Number of vertices */
  vertexCount: number;
  
  /** Number of faces (triangles) */
  faceCount: number;
}

/**
 * Face topology definition - maps MediaPipe Face Mesh landmark indices to triangles
 * MediaPipe Face Mesh provides 468 landmarks with known connectivity
 * 
 * This is a simplified topology focused on the primary facial features.
 * Full topology: https://github.com/tensorflow/tfjs-models/blob/master/face-landmarks-detection/mesh_map.jpg
 */
const FACE_TRIANGLES: number[] = [
  // Forehead region
  10, 338, 297, 10, 297, 332, 10, 332, 284,
  
  // Right eye region
  33, 7, 163, 33, 163, 144, 33, 144, 145,
  145, 153, 154, 154, 155, 133,
  
  // Left eye region  
  263, 249, 390, 263, 390, 373, 263, 373, 374,
  374, 380, 381, 381, 382, 362,
  
  // Nose bridge
  6, 168, 197, 6, 197, 195, 6, 195, 5,
  
  // Nose tip and nostrils
  4, 5, 195, 4, 195, 197, 1, 4, 19,
  1, 19, 94, 1, 94, 2,
  
  // Upper lip region
  61, 185, 40, 61, 40, 39, 61, 39, 37,
  37, 0, 267, 267, 269, 270, 270, 409, 291,
  
  // Lower lip region
  146, 91, 181, 146, 181, 84, 146, 84, 17,
  17, 314, 405, 17, 405, 321, 321, 375, 291,
  
  // Right cheek
  127, 162, 21, 127, 21, 54, 127, 54, 103,
  103, 67, 109, 109, 10, 338,
  
  // Left cheek
  356, 389, 251, 356, 251, 284, 356, 284, 332,
  332, 297, 338, 338, 10, 109,
  
  // Jaw line (right)
  172, 136, 150, 150, 149, 176, 176, 148, 152,
  
  // Jaw line (left)
  397, 365, 379, 379, 378, 400, 400, 377, 152,
  
  // Face outline connection
  10, 109, 67, 10, 67, 9, 9, 8, 168,
  168, 6, 197, 197, 195, 5, 5, 4, 1,
  
  // Additional face surface triangles for better coverage
  // Connecting major regions
  127, 34, 162, 356, 264, 389,
  234, 93, 132, 454, 323, 361,
  
  // Fill gaps in cheek area
  50, 101, 36, 280, 330, 266,
  
  // Connect temple to cheek
  54, 103, 67, 284, 332, 297
];

/**
 * MeshGenerator Class
 * 
 * Converts facial landmarks into a renderable 3D mesh with proper topology
 * and lighting calculations.
 */
export class MeshGenerator {
  private landmarks: FaceAnalysisData['landmarks'];
  
  /**
   * Create a new MeshGenerator instance
   * @param faceData - Face analysis data containing 468 landmarks
   */
  constructor(faceData: FaceAnalysisData) {
    if (!faceData.landmarks || faceData.landmarks.length !== 468) {
      throw new Error(
        `Invalid face data: expected 468 landmarks, got ${faceData.landmarks?.length ?? 0}`
      );
    }
    this.landmarks = faceData.landmarks;
  }
  
  /**
   * Generate complete mesh data from facial landmarks
   * 
   * Converts landmarks to mesh vertices, creates face topology,
   * and calculates normals for lighting.
   * 
   * @returns MeshData structure ready for Three.js BufferGeometry
   * @throws Error if mesh generation fails
   */
  public generateMesh(): MeshData {
    const startTime = performance.now();
    
    try {
      // Step 1: Convert landmarks to vertices
      const vertices = this.landmarksToVertices();
      
      // Step 2: Create face topology (triangle indices)
      const faces = this.createFaceTopology();
      
      // Step 3: Calculate vertex normals for lighting
      const normals = this.calculateNormals(vertices, faces);
      
      // Step 4: Generate UV coordinates for texture mapping
      const uvs = this.generateUVCoordinates();
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Requirement 2.1: Mesh generation should complete within 2 seconds
      if (duration > 2000) {
        console.warn(
          `Mesh generation took ${duration.toFixed(2)}ms, exceeds 2000ms target`
        );
      }
      
      return {
        vertices,
        faces,
        normals,
        uvs,
        vertexCount: vertices.length / 3,
        faceCount: faces.length / 3,
      };
    } catch (error) {
      throw new Error(
        `Mesh generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
  
  /**
   * Convert 468 facial landmarks into flat vertex array
   * 
   * Normalizes coordinates to center the face at origin and scale appropriately
   * for Three.js rendering.
   * 
   * @returns Float32Array of vertices in format [x, y, z, x, y, z, ...]
   */
  private landmarksToVertices(): Float32Array {
    const vertices = new Float32Array(this.landmarks.length * 3);
    
    // Find bounding box for normalization
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    
    for (const landmark of this.landmarks) {
      minX = Math.min(minX, landmark.x);
      minY = Math.min(minY, landmark.y);
      minZ = Math.min(minZ, landmark.z);
      maxX = Math.max(maxX, landmark.x);
      maxY = Math.max(maxY, landmark.y);
      maxZ = Math.max(maxZ, landmark.z);
    }
    
    // Calculate center and scale
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const centerZ = (minZ + maxZ) / 2;
    
    // Scale to unit size (largest dimension = 1)
    const rangeX = maxX - minX;
    const rangeY = maxY - minY;
    const rangeZ = maxZ - minZ;
    const scale = Math.max(rangeX, rangeY, rangeZ);
    
    // Normalize and store vertices
    for (let i = 0; i < this.landmarks.length; i++) {
      const landmark = this.landmarks[i];
      vertices[i * 3 + 0] = (landmark.x - centerX) / scale;
      vertices[i * 3 + 1] = (landmark.y - centerY) / scale;
      vertices[i * 3 + 2] = (landmark.z - centerZ) / scale;
    }
    
    return vertices;
  }
  
  /**
   * Create face topology by mapping landmark indices to triangle faces
   * 
   * Uses predefined FACE_TRIANGLES topology based on MediaPipe Face Mesh structure
   * 
   * @returns Uint16Array of face indices in format [a, b, c, a, b, c, ...]
   */
  private createFaceTopology(): Uint16Array {
    // Validate triangle indices
    for (let i = 0; i < FACE_TRIANGLES.length; i++) {
      const index = FACE_TRIANGLES[i];
      if (index < 0 || index >= 468) {
        throw new Error(
          `Invalid triangle index ${index} at position ${i} (must be 0-467)`
        );
      }
    }
    
    return new Uint16Array(FACE_TRIANGLES);
  }
  
  /**
   * Calculate vertex normals for proper lighting
   * 
   * Normals are calculated by averaging the face normals of all triangles
   * that share each vertex. This provides smooth shading.
   * 
   * @param vertices - Vertex position array
   * @param faces - Face index array
   * @returns Float32Array of normals in format [nx, ny, nz, nx, ny, nz, ...]
   */
  private calculateNormals(vertices: Float32Array, faces: Uint16Array): Float32Array {
    const normals = new Float32Array(vertices.length);
    normals.fill(0);
    
    // Temporary vectors for calculation
    const v0 = { x: 0, y: 0, z: 0 };
    const v1 = { x: 0, y: 0, z: 0 };
    const v2 = { x: 0, y: 0, z: 0 };
    const edge1 = { x: 0, y: 0, z: 0 };
    const edge2 = { x: 0, y: 0, z: 0 };
    const normal = { x: 0, y: 0, z: 0 };
    
    // Calculate face normals and accumulate to vertex normals
    for (let i = 0; i < faces.length; i += 3) {
      const i0 = faces[i + 0];
      const i1 = faces[i + 1];
      const i2 = faces[i + 2];
      
      // Get vertex positions
      v0.x = vertices[i0 * 3 + 0];
      v0.y = vertices[i0 * 3 + 1];
      v0.z = vertices[i0 * 3 + 2];
      
      v1.x = vertices[i1 * 3 + 0];
      v1.y = vertices[i1 * 3 + 1];
      v1.z = vertices[i1 * 3 + 2];
      
      v2.x = vertices[i2 * 3 + 0];
      v2.y = vertices[i2 * 3 + 1];
      v2.z = vertices[i2 * 3 + 2];
      
      // Calculate edges
      edge1.x = v1.x - v0.x;
      edge1.y = v1.y - v0.y;
      edge1.z = v1.z - v0.z;
      
      edge2.x = v2.x - v0.x;
      edge2.y = v2.y - v0.y;
      edge2.z = v2.z - v0.z;
      
      // Calculate face normal via cross product
      normal.x = edge1.y * edge2.z - edge1.z * edge2.y;
      normal.y = edge1.z * edge2.x - edge1.x * edge2.z;
      normal.z = edge1.x * edge2.y - edge1.y * edge2.x;
      
      // Accumulate to vertex normals
      normals[i0 * 3 + 0] += normal.x;
      normals[i0 * 3 + 1] += normal.y;
      normals[i0 * 3 + 2] += normal.z;
      
      normals[i1 * 3 + 0] += normal.x;
      normals[i1 * 3 + 1] += normal.y;
      normals[i1 * 3 + 2] += normal.z;
      
      normals[i2 * 3 + 0] += normal.x;
      normals[i2 * 3 + 1] += normal.y;
      normals[i2 * 3 + 2] += normal.z;
    }
    
    // Normalize all vertex normals
    for (let i = 0; i < normals.length; i += 3) {
      const nx = normals[i + 0];
      const ny = normals[i + 1];
      const nz = normals[i + 2];
      
      const length = Math.sqrt(nx * nx + ny * ny + nz * nz);
      
      if (length > 0) {
        normals[i + 0] = nx / length;
        normals[i + 1] = ny / length;
        normals[i + 2] = nz / length;
      } else {
        // Default normal pointing forward if length is zero
        normals[i + 0] = 0;
        normals[i + 1] = 0;
        normals[i + 2] = 1;
      }
    }
    
    return normals;
  }
  
  /**
   * Generate UV coordinates for texture mapping
   * 
   * Maps 3D landmarks to 2D texture coordinates by projecting
   * to the XY plane and normalizing to [0, 1] range.
   * 
   * @returns Float32Array of UV coordinates in format [u, v, u, v, ...]
   */
  private generateUVCoordinates(): Float32Array {
    const uvs = new Float32Array(this.landmarks.length * 2);
    
    // Find X and Y bounds for normalization
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    for (const landmark of this.landmarks) {
      minX = Math.min(minX, landmark.x);
      minY = Math.min(minY, landmark.y);
      maxX = Math.max(maxX, landmark.x);
      maxY = Math.max(maxY, landmark.y);
    }
    
    const rangeX = maxX - minX;
    const rangeY = maxY - minY;
    
    // Generate normalized UV coordinates
    for (let i = 0; i < this.landmarks.length; i++) {
      const landmark = this.landmarks[i];
      
      // Normalize to [0, 1] range
      const u = rangeX > 0 ? (landmark.x - minX) / rangeX : 0.5;
      const v = rangeY > 0 ? (landmark.y - minY) / rangeY : 0.5;
      
      uvs[i * 2 + 0] = u;
      uvs[i * 2 + 1] = v;
    }
    
    return uvs;
  }
  
  /**
   * Estimate the file size of the generated mesh data
   * 
   * Used to validate Requirement 2.5: Model size < 5MB
   * 
   * @param meshData - The generated mesh data
   * @returns Estimated size in bytes
   */
  public static estimateMeshSize(meshData: MeshData): number {
    const verticesSize = meshData.vertices.byteLength;
    const facesSize = meshData.faces.byteLength;
    const normalsSize = meshData.normals.byteLength;
    const uvsSize = meshData.uvs.byteLength;
    
    // Add overhead for object structure (~1KB)
    const overhead = 1024;
    
    return verticesSize + facesSize + normalsSize + uvsSize + overhead;
  }
  
  /**
   * Validate mesh data integrity
   * 
   * Checks for common mesh issues like degenerate triangles,
   * out-of-bounds indices, or invalid normals.
   * 
   * @param meshData - The mesh data to validate
   * @returns Object with validation results
   */
  public static validateMesh(meshData: MeshData): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check vertex count
    if (meshData.vertexCount !== 468) {
      errors.push(`Expected 468 vertices, got ${meshData.vertexCount}`);
    }
    
    // Check that vertices, normals, and UVs have matching counts
    if (meshData.vertices.length !== meshData.normals.length) {
      errors.push('Vertex and normal counts do not match');
    }
    
    if (meshData.vertices.length / 3 !== meshData.uvs.length / 2) {
      errors.push('Vertex and UV counts do not match');
    }
    
    // Check face indices are in valid range
    for (let i = 0; i < meshData.faces.length; i++) {
      const index = meshData.faces[i];
      if (index >= meshData.vertexCount) {
        errors.push(`Face index ${index} out of bounds (max ${meshData.vertexCount - 1})`);
      }
    }
    
    // Check for degenerate triangles (same vertex repeated)
    for (let i = 0; i < meshData.faces.length; i += 3) {
      const i0 = meshData.faces[i + 0];
      const i1 = meshData.faces[i + 1];
      const i2 = meshData.faces[i + 2];
      
      if (i0 === i1 || i1 === i2 || i0 === i2) {
        warnings.push(`Degenerate triangle at face ${i / 3}`);
      }
    }
    
    // Check normals are normalized
    for (let i = 0; i < meshData.normals.length; i += 3) {
      const nx = meshData.normals[i + 0];
      const ny = meshData.normals[i + 1];
      const nz = meshData.normals[i + 2];
      const length = Math.sqrt(nx * nx + ny * ny + nz * nz);
      
      if (Math.abs(length - 1.0) > 0.01) {
        warnings.push(`Normal at vertex ${i / 3} not normalized (length: ${length})`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

/**
 * Helper function to create a mesh from face analysis data
 * 
 * Convenience wrapper around MeshGenerator for simple use cases.
 * 
 * @param faceData - Face analysis data containing 468 landmarks
 * @returns Generated mesh data
 */
export function generateMeshFromLandmarks(faceData: FaceAnalysisData): MeshData {
  const generator = new MeshGenerator(faceData);
  return generator.generateMesh();
}
