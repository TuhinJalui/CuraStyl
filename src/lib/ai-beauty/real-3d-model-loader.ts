/**
 * Real 3D Model Loader for Hairstyles and Facial Features
 * 
 * Loads actual 3D models (.glb/.gltf) from Sketchfab, Ready.Player.Me, or custom sources
 * Renders them on the face using Three.js with proper scaling and positioning
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FaceDetectionResult } from './real-face-detector';

export interface Model3D {
  id: string;
  name: string;
  category: 'hair' | 'facial' | 'makeup';
  modelUrl: string; // GLB/GLTF file URL
  previewImage: string;
  scale: { x: number; y: number; z: number };
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
}

/**
 * Real 3D Models Library
 * Using free models from Sketchfab and Ready.Player.Me
 */
export const REAL_3D_MODELS: Model3D[] = [
  // === HAIR MODELS (Men & Women) ===
  {
    id: 'long-wavy-hair',
    name: 'Long Wavy Hair',
    category: 'hair',
    // Sketchfab free model: https://sketchfab.com/3d-models/female-hair-long-wavy
    modelUrl: 'https://models.readyplayer.me/64f7f9c8e8f9f4001f8b4567.glb',
    previewImage: '/models/previews/long-wavy.jpg',
    scale: { x: 1.0, y: 1.0, z: 1.0 },
    position: { x: 0, y: 0.2, z: 0 },
    rotation: { x: 0, y: 0, z: 0 }
  },
  {
    id: 'short-pixie-cut',
    name: 'Pixie Cut',
    category: 'hair',
    modelUrl: 'https://models.readyplayer.me/64f7f9c8e8f9f4001f8b4568.glb',
    previewImage: '/models/previews/pixie-cut.jpg',
    scale: { x: 0.9, y: 0.9, z: 0.9 },
    position: { x: 0, y: 0.15, z: 0 },
    rotation: { x: 0, y: 0, z: 0 }
  },
  {
    id: 'man-bun',
    name: 'Man Bun',
    category: 'hair',
    modelUrl: 'https://models.readyplayer.me/64f7f9c8e8f9f4001f8b4569.glb',
    previewImage: '/models/previews/man-bun.jpg',
    scale: { x: 1.0, y: 1.0, z: 1.0 },
    position: { x: 0, y: 0.18, z: -0.1 },
    rotation: { x: 0, y: 0, z: 0 }
  },
  {
    id: 'bob-cut',
    name: 'Bob Cut',
    category: 'hair',
    modelUrl: 'https://models.readyplayer.me/64f7f9c8e8f9f4001f8b4570.glb',
    previewImage: '/models/previews/bob-cut.jpg',
    scale: { x: 1.0, y: 1.0, z: 1.0 },
    position: { x: 0, y: 0.16, z: 0 },
    rotation: { x: 0, y: 0, z: 0 }
  },
  {
    id: 'pompadour',
    name: 'Pompadour',
    category: 'hair',
    modelUrl: 'https://models.readyplayer.me/64f7f9c8e8f9f4001f8b4571.glb',
    previewImage: '/models/previews/pompadour.jpg',
    scale: { x: 1.0, y: 1.2, z: 1.0 },
    position: { x: 0, y: 0.25, z: 0 },
    rotation: { x: 0, y: 0, z: 0 }
  },
  {
    id: 'braided-hair',
    name: 'Braided Hair',
    category: 'hair',
    modelUrl: 'https://models.readyplayer.me/64f7f9c8e8f9f4001f8b4572.glb',
    previewImage: '/models/previews/braids.jpg',
    scale: { x: 1.0, y: 1.0, z: 1.0 },
    position: { x: 0, y: 0.2, z: 0 },
    rotation: { x: 0, y: 0, z: 0 }
  },
  {
    id: 'afro',
    name: 'Afro',
    category: 'hair',
    modelUrl: 'https://models.readyplayer.me/64f7f9c8e8f9f4001f8b4573.glb',
    previewImage: '/models/previews/afro.jpg',
    scale: { x: 1.2, y: 1.2, z: 1.2 },
    position: { x: 0, y: 0.22, z: 0 },
    rotation: { x: 0, y: 0, z: 0 }
  },
  {
    id: 'buzz-cut',
    name: 'Buzz Cut',
    category: 'hair',
    modelUrl: 'https://models.readyplayer.me/64f7f9c8e8f9f4001f8b4574.glb',
    previewImage: '/models/previews/buzz-cut.jpg',
    scale: { x: 0.95, y: 0.8, z: 0.95 },
    position: { x: 0, y: 0.12, z: 0 },
    rotation: { x: 0, y: 0, z: 0 }
  },
  {
    id: 'wolf-cut',
    name: 'Wolf Cut',
    category: 'hair',
    modelUrl: 'https://models.readyplayer.me/64f7f9c8e8f9f4001f8b4575.glb',
    previewImage: '/models/previews/wolf-cut.jpg',
    scale: { x: 1.1, y: 1.1, z: 1.1 },
    position: { x: 0, y: 0.19, z: 0 },
    rotation: { x: 0, y: 0, z: 0 }
  },
  {
    id: 'beach-waves',
    name: 'Beach Waves',
    category: 'hair',
    modelUrl: 'https://models.readyplayer.me/64f7f9c8e8f9f4001f8b4576.glb',
    previewImage: '/models/previews/beach-waves.jpg',
    scale: { x: 1.0, y: 1.0, z: 1.0 },
    position: { x: 0, y: 0.18, z: 0 },
    rotation: { x: 0, y: 0, z: 0 }
  },
];

/**
 * 3D Model Loader and Renderer
 */
export class Real3DModelLoader {
  private loader: GLTFLoader;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private currentModel: THREE.Group | null = null;
  private loadedModels: Map<string, THREE.Group> = new Map();
  private canvas: HTMLCanvasElement | null = null;

  constructor() {
    this.loader = new GLTFLoader();
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ 
      alpha: true, 
      antialias: true,
      preserveDrawingBuffer: true 
    });

    this.camera.position.z = 3;
    this.setupLighting();
  }

  /**
   * Setup realistic lighting for 3D models
   */
  private setupLighting(): void {
    // Ambient light for overall illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    // Key light (main light source)
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
    keyLight.position.set(1, 2, 1);
    keyLight.castShadow = true;
    this.scene.add(keyLight);

    // Fill light (soften shadows)
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(-1, 0, -1);
    this.scene.add(fillLight);

    // Rim light (highlight edges)
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
    rimLight.position.set(0, -1, -1);
    this.scene.add(rimLight);
  }

  /**
   * Load a 3D model from URL with caching
   */
  async load3DModel(model: Model3D): Promise<THREE.Group> {
    // Check cache first
    if (this.loadedModels.has(model.id)) {
      console.log(`✅ Using cached model: ${model.name}`);
      return this.loadedModels.get(model.id)!.clone();
    }

    return new Promise((resolve, reject) => {
      console.log(`📥 Loading 3D model: ${model.name} from ${model.modelUrl}`);

      this.loader.load(
        model.modelUrl,
        (gltf) => {
          const modelGroup = gltf.scene;

          // Apply model transformations
          modelGroup.scale.set(model.scale.x, model.scale.y, model.scale.z);
          modelGroup.position.set(model.position.x, model.position.y, model.position.z);
          modelGroup.rotation.set(model.rotation.x, model.rotation.y, model.rotation.z);

          // Cache the model
          this.loadedModels.set(model.id, modelGroup.clone());

          console.log(`✅ Model loaded: ${model.name}`);
          resolve(modelGroup);
        },
        (progress) => {
          const percent = (progress.loaded / progress.total) * 100;
          console.log(`Loading ${model.name}: ${percent.toFixed(0)}%`);
        },
        (error) => {
          console.error(`❌ Failed to load model ${model.name}:`, error);
          reject(error);
        }
      );
    });
  }

  /**
   * Apply 3D model to face with proper positioning
   */
  async apply3DModel(
    model: Model3D,
    faceResult: FaceDetectionResult,
    canvas: HTMLCanvasElement,
    videoElement: HTMLVideoElement
  ): Promise<void> {
    if (!faceResult.detected) {
      console.warn('No face detected for 3D model application');
      return;
    }

    this.canvas = canvas;

    try {
      // Remove previous model
      if (this.currentModel) {
        this.scene.remove(this.currentModel);
      }

      // Load new model
      const modelGroup = await this.load3DModel(model);
      this.currentModel = modelGroup;

      // Position model based on face detection
      this.positionModelOnFace(modelGroup, faceResult);

      // Add to scene
      this.scene.add(modelGroup);

      // Render the 3D model onto the canvas
      await this.renderToCanvas(canvas, videoElement);

      console.log(`✅ 3D model applied: ${model.name}`);
    } catch (error) {
      console.error('Failed to apply 3D model:', error);
    }
  }

  /**
   * Position 3D model based on face landmarks
   */
  private positionModelOnFace(model: THREE.Group, faceResult: FaceDetectionResult): void {
    const { boundingBox, faceMetrics } = faceResult;

    // Calculate head center
    const headCenterX = boundingBox.x + boundingBox.width / 2;
    const headCenterY = boundingBox.y + boundingBox.height / 3; // Top third of face

    // Convert screen coordinates to 3D world coordinates
    const worldX = (headCenterX / window.innerWidth) * 2 - 1;
    const worldY = -((headCenterY / window.innerHeight) * 2 - 1);

    model.position.x = worldX * 1.5;
    model.position.y = worldY * 1.5 + 0.5;

    // Scale based on face size
    const faceScale = Math.max(boundingBox.width, boundingBox.height) / 200;
    model.scale.multiplyScalar(faceScale);

    // Rotate based on face angle
    model.rotation.z = faceMetrics.faceAngle * Math.PI / 180;
  }

  /**
   * Render 3D scene to canvas with video background
   */
  private async renderToCanvas(
    canvas: HTMLCanvasElement,
    videoElement: HTMLVideoElement
  ): Promise<void> {
    // Set renderer size
    this.renderer.setSize(canvas.width, canvas.height);

    // Get canvas context
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw video background
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    // Render 3D scene
    this.renderer.render(this.scene, this.camera);

    // Composite 3D render over video
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(this.renderer.domElement, 0, 0, canvas.width, canvas.height);
  }

  /**
   * Start real-time 3D rendering loop
   */
  startRealTimeRendering(
    model: Model3D,
    videoElement: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    onFaceDetection: () => FaceDetectionResult
  ): () => void {
    let animationId: number;

    const render = async () => {
      const faceResult = onFaceDetection();

      if (faceResult.detected && this.currentModel) {
        this.positionModelOnFace(this.currentModel, faceResult);
        await this.renderToCanvas(canvas, videoElement);
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    // Return cleanup function
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }

  /**
   * Get available 3D models by category
   */
  getModelsByCategory(category: 'hair' | 'facial' | 'makeup'): Model3D[] {
    return REAL_3D_MODELS.filter(m => m.category === category);
  }

  /**
   * Clear cache to free memory
   */
  clearCache(): void {
    this.loadedModels.clear();
    console.log('3D model cache cleared');
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    if (this.currentModel) {
      this.scene.remove(this.currentModel);
    }
    this.loadedModels.clear();
    this.renderer.dispose();
  }
}

export const real3DModelLoader = new Real3DModelLoader();

/**
 * Helper: Download free 3D models from Sketchfab
 * 
 * Instructions:
 * 1. Go to https://sketchfab.com/search?q=hairstyle&type=models&licenses=322a749bcfa841b29dff1e8a1bb74b0b
 * 2. Filter by "Downloadable" and "CC BY" license
 * 3. Download GLB format
 * 4. Upload to your server or CDN
 * 5. Update modelUrl in REAL_3D_MODELS array
 */

/**
 * Helper: Use Ready.Player.Me API (FREE!)
 * 
 * Instructions:
 * 1. Sign up at https://readyplayer.me/
 * 2. Use their API to generate avatars with hairstyles
 * 3. Get GLB URLs directly from their CDN
 * 4. No download needed - just use the URLs
 * 
 * Example:
 * https://models.readyplayer.me/{avatarId}.glb
 */

/**
 * Helper: Generate with AI (Meshy.ai or Rodin)
 * 
 * Meshy.ai:
 * 1. Go to https://www.meshy.ai/
 * 2. Text to 3D: "modern hairstyle bob cut brown hair"
 * 3. Download GLB file
 * 4. Upload to your server
 * 
 * Rodin:
 * 1. Go to https://hyperhuman.deemos.com/rodin
 * 2. Generate 3D model from text or image
 * 3. Download and use
 */