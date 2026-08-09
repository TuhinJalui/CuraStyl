/**
 * Gaussian Splat Renderer
 * 
 * Implements Gaussian Splatting technique for photorealistic 3D avatar rendering.
 * Gaussian Splatting represents geometry as a collection of 3D Gaussians with
 * position, color, scale, and rotation, providing smooth interpolation between points.
 * 
 * @see Design Document: Phase 5 - 3D Digital Twin Generation
 * @see Requirements: 2.2, 2.3
 */

import * as THREE from 'three';
import type { DigitalTwinModel, FaceAnalysisData } from './types';
import type { MeshData } from './mesh-generator';

/**
 * Gaussian Splat data structure
 */
export interface GaussianSplatData {
  /** 3D positions of Gaussian centers [x, y, z, x, y, z, ...] */
  positions: Float32Array;
  
  /** RGBA colors [r, g, b, a, r, g, b, a, ...] (0-255) */
  colors: Uint8Array;
  
  /** 3D scales [sx, sy, sz, sx, sy, sz, ...] */
  scales: Float32Array;
  
  /** Quaternion rotations [x, y, z, w, x, y, z, w, ...] */
  rotations: Float32Array;
}

/**
 * Gaussian Splat Renderer
 * 
 * Creates photorealistic 3D avatars using Gaussian Splatting technique.
 * Converts mesh data into Gaussian splat representation with proper
 * color, scale, and orientation for smooth rendering.
 */
export class GaussianSplatRenderer {
  private meshData: MeshData;
  private videoFrame?: HTMLCanvasElement | HTMLVideoElement;
  
  /**
   * Create a new Gaussian Splat Renderer
   * @param meshData - The 3D mesh data from MeshGenerator
   * @param videoFrame - Optional video frame for texture extraction
   */
  constructor(meshData: MeshData, videoFrame?: HTMLCanvasElement | HTMLVideoElement) {
    this.meshData = meshData;
    this.videoFrame = videoFrame;
  }
  
  /**
   * Generate Gaussian Splat data from mesh vertices
   * 
   * Each vertex becomes a Gaussian splat with position, color, scale, and rotation.
   * Colors are sampled from the video frame if available.
   * 
   * @returns GaussianSplatData structure for rendering
   */
  public generateGaussianSplats(): GaussianSplatData {
    const vertexCount = this.meshData.vertexCount;
    
    // Allocate arrays for Gaussian splat data
    const positions = new Float32Array(vertexCount * 3);
    const colors = new Uint8Array(vertexCount * 4);
    const scales = new Float32Array(vertexCount * 3);
    const rotations = new Float32Array(vertexCount * 4);
    
    // Copy vertex positions
    positions.set(this.meshData.vertices);
    
    // Generate colors from texture or use default
    this.generateColors(colors);
    
    // Calculate scales based on local vertex density
    this.calculateScales(scales);
    
    // Calculate rotations based on vertex normals
    this.calculateRotations(rotations);
    
    return {
      positions,
      colors,
      scales,
      rotations,
    };
  }
  
  /**
   * Generate colors for Gaussian splats
   * 
   * If video frame is available, samples colors from texture using UV coordinates.
   * Otherwise, uses default skin-tone colors.
   * 
   * @param colors - Output color array to fill
   */
  private generateColors(colors: Uint8Array): void {
    if (this.videoFrame) {
      this.sampleColorsFromTexture(colors);
    } else {
      this.useDefaultColors(colors);
    }
  }
  
  /**
   * Sample colors from video frame texture using UV coordinates
   * 
   * @param colors - Output color array to fill
   */
  private sampleColorsFromTexture(colors: Uint8Array): void {
    if (!this.videoFrame) {
      this.useDefaultColors(colors);
      return;
    }
    
    // Create temporary canvas for pixel sampling if source is video
    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D | null;
    
    if (this.videoFrame instanceof HTMLVideoElement) {
      canvas = document.createElement('canvas');
      canvas.width = this.videoFrame.videoWidth || 640;
      canvas.height = this.videoFrame.videoHeight || 480;
      ctx = canvas.getContext('2d', { willReadFrequently: true });
      
      if (ctx) {
        ctx.drawImage(this.videoFrame, 0, 0, canvas.width, canvas.height);
      }
    } else {
      canvas = this.videoFrame;
      ctx = canvas.getContext('2d', { willReadFrequently: true });
    }
    
    if (!ctx) {
      console.warn('Failed to get canvas context, using default colors');
      this.useDefaultColors(colors);
      return;
    }
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    
    // Sample color for each vertex using UV coordinates
    for (let i = 0; i < this.meshData.vertexCount; i++) {
      const u = this.meshData.uvs[i * 2 + 0];
      const v = this.meshData.uvs[i * 2 + 1];
      
      // Convert UV to pixel coordinates
      const x = Math.floor(u * (canvas.width - 1));
      const y = Math.floor(v * (canvas.height - 1));
      const pixelIndex = (y * canvas.width + x) * 4;
      
      // Copy RGBA values
      colors[i * 4 + 0] = pixels[pixelIndex + 0]; // R
      colors[i * 4 + 1] = pixels[pixelIndex + 1]; // G
      colors[i * 4 + 2] = pixels[pixelIndex + 2]; // B
      colors[i * 4 + 3] = 255; // A (fully opaque)
    }
  }
  
  /**
   * Use default skin-tone colors for Gaussian splats
   * 
   * @param colors - Output color array to fill
   */
  private useDefaultColors(colors: Uint8Array): void {
    // Default skin tone color (warm peachy tone)
    const defaultR = 232;
    const defaultG = 190;
    const defaultB = 172;
    const defaultA = 255;
    
    for (let i = 0; i < this.meshData.vertexCount; i++) {
      colors[i * 4 + 0] = defaultR;
      colors[i * 4 + 1] = defaultG;
      colors[i * 4 + 2] = defaultB;
      colors[i * 4 + 3] = defaultA;
    }
  }
  
  /**
   * Calculate scales for Gaussian splats based on local vertex density
   * 
   * Splats in dense regions should be smaller, splats in sparse regions larger.
   * This provides smooth interpolation across the mesh.
   * 
   * @param scales - Output scale array to fill
   */
  private calculateScales(scales: Float32Array): void {
    const vertices = this.meshData.vertices;
    const faces = this.meshData.faces;
    
    // Calculate average edge length for each vertex
    const vertexEdgeLengths: number[][] = Array.from(
      { length: this.meshData.vertexCount },
      () => []
    );
    
    // Collect edge lengths from face connectivity
    for (let i = 0; i < faces.length; i += 3) {
      const i0 = faces[i + 0];
      const i1 = faces[i + 1];
      const i2 = faces[i + 2];
      
      // Calculate three edge lengths
      const len01 = this.calculateDistance(vertices, i0, i1);
      const len12 = this.calculateDistance(vertices, i1, i2);
      const len20 = this.calculateDistance(vertices, i2, i0);
      
      vertexEdgeLengths[i0].push(len01, len20);
      vertexEdgeLengths[i1].push(len01, len12);
      vertexEdgeLengths[i2].push(len12, len20);
    }
    
    // Calculate average scale for each vertex
    for (let i = 0; i < this.meshData.vertexCount; i++) {
      const edgeLengths = vertexEdgeLengths[i];
      
      let avgLength = 0.01; // Default small scale
      
      if (edgeLengths.length > 0) {
        const sum = edgeLengths.reduce((a, b) => a + b, 0);
        avgLength = sum / edgeLengths.length;
      }
      
      // Use average edge length as splat radius
      // Scale by 0.5 to ensure smooth overlap
      const scale = avgLength * 0.5;
      
      scales[i * 3 + 0] = scale; // sx
      scales[i * 3 + 1] = scale; // sy
      scales[i * 3 + 2] = scale; // sz
    }
  }
  
  /**
   * Calculate distance between two vertices
   * 
   * @param vertices - Vertex array
   * @param i0 - First vertex index
   * @param i1 - Second vertex index
   * @returns Euclidean distance
   */
  private calculateDistance(vertices: Float32Array, i0: number, i1: number): number {
    const dx = vertices[i1 * 3 + 0] - vertices[i0 * 3 + 0];
    const dy = vertices[i1 * 3 + 1] - vertices[i0 * 3 + 1];
    const dz = vertices[i1 * 3 + 2] - vertices[i0 * 3 + 2];
    
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  
  /**
   * Calculate rotations for Gaussian splats based on vertex normals
   * 
   * Aligns each Gaussian ellipsoid with the surface normal to create
   * smooth surface appearance.
   * 
   * @param rotations - Output rotation array to fill (quaternions)
   */
  private calculateRotations(rotations: Float32Array): void {
    const normals = this.meshData.normals;
    
    // Default "up" direction for reference
    const up = new THREE.Vector3(0, 0, 1);
    const normal = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    
    for (let i = 0; i < this.meshData.vertexCount; i++) {
      // Get vertex normal
      normal.set(
        normals[i * 3 + 0],
        normals[i * 3 + 1],
        normals[i * 3 + 2]
      );
      
      // Calculate rotation from up vector to normal
      quaternion.setFromUnitVectors(up, normal);
      
      // Store as quaternion [x, y, z, w]
      rotations[i * 4 + 0] = quaternion.x;
      rotations[i * 4 + 1] = quaternion.y;
      rotations[i * 4 + 2] = quaternion.z;
      rotations[i * 4 + 3] = quaternion.w;
    }
  }
  
  /**
   * Create a Three.js material for Gaussian Splat rendering
   * 
   * Uses a custom shader to render Gaussians with proper blending
   * and antialiasing.
   * 
   * @returns Three.js ShaderMaterial configured for Gaussian rendering
   */
  public static createGaussianMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        opacity: { value: 1.0 },
      },
      vertexShader: `
        attribute vec3 color;
        attribute vec3 scale;
        attribute vec4 rotation;
        
        varying vec3 vColor;
        varying vec2 vUv;
        
        // Rotate point by quaternion
        vec3 rotateByQuaternion(vec3 v, vec4 q) {
          vec3 qvec = q.xyz;
          vec3 uv = cross(qvec, v);
          vec3 uuv = cross(qvec, uv);
          return v + 2.0 * (uv * q.w + uuv);
        }
        
        void main() {
          vColor = color;
          vUv = uv;
          
          // Apply scale to vertex position
          vec3 scaledPosition = position * scale;
          
          // Apply rotation
          vec3 rotatedPosition = rotateByQuaternion(scaledPosition, rotation);
          
          // Transform to screen space
          vec4 mvPosition = modelViewMatrix * vec4(rotatedPosition, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          
          // Point size for splat rendering (optional fallback)
          gl_PointSize = 10.0;
        }
      `,
      fragmentShader: `
        uniform float opacity;
        
        varying vec3 vColor;
        varying vec2 vUv;
        
        void main() {
          // Calculate Gaussian falloff from center
          vec2 center = vUv - vec2(0.5);
          float dist = length(center);
          float gaussian = exp(-4.0 * dist * dist);
          
          // Apply color and Gaussian alpha
          gl_FragColor = vec4(vColor, gaussian * opacity);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide,
    });
  }
}

/**
 * Apply texture mapping to a Three.js mesh
 * 
 * Creates a texture from video frame or canvas and applies it to the mesh material.
 * 
 * @param mesh - The Three.js mesh to texture
 * @param videoFrame - Video element or canvas containing the texture image
 * @returns The created texture
 */
export function applyTextureToMesh(
  mesh: THREE.Mesh,
  videoFrame: HTMLVideoElement | HTMLCanvasElement
): THREE.Texture {
  // Create texture from video/canvas
  const texture = new THREE.Texture(videoFrame);
  texture.needsUpdate = true;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  
  // Apply to mesh material
  if (mesh.material instanceof THREE.MeshStandardMaterial) {
    mesh.material.map = texture;
    mesh.material.needsUpdate = true;
  }
  
  return texture;
}

/**
 * Create a complete Digital Twin Model from face analysis and video frame
 * 
 * Combines mesh generation, Gaussian splat generation, and texture mapping
 * into a complete DigitalTwinModel ready for rendering.
 * 
 * @param meshData - Generated mesh data from MeshGenerator
 * @param videoFrame - Optional video frame for texture
 * @returns Complete DigitalTwinModel structure
 */
export function createDigitalTwinModel(
  meshData: MeshData,
  videoFrame?: HTMLCanvasElement | HTMLVideoElement
): DigitalTwinModel {
  // Generate Gaussian splat data
  const splatRenderer = new GaussianSplatRenderer(meshData, videoFrame);
  const gaussianSplatData = splatRenderer.generateGaussianSplats();
  
  // Create texture map (base64 encoded)
  let textureMap = '';
  
  if (videoFrame) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (videoFrame instanceof HTMLVideoElement) {
      canvas.width = videoFrame.videoWidth || 640;
      canvas.height = videoFrame.videoHeight || 480;
      ctx?.drawImage(videoFrame, 0, 0, canvas.width, canvas.height);
    } else {
      canvas.width = videoFrame.width;
      canvas.height = videoFrame.height;
      ctx?.drawImage(videoFrame, 0, 0);
    }
    
    textureMap = canvas.toDataURL('image/jpeg', 0.85);
  }
  
  // Create animation rig placeholder
  const animationRig = {
    bones: [],
    rotationLimits: {
      pitch: { min: -30, max: 30 },
      yaw: { min: -45, max: 45 },
      roll: { min: -15, max: 15 },
    },
  };
  
  return {
    meshData: meshData.vertices,
    gaussianSplatData,
    textureMap,
    animationRig,
  };
}
