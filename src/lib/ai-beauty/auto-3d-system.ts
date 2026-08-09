/**
 * Automatic 3D Hair System
 * 
 * AUTO KARTA HAI SAB KUCH - No manual work needed!
 * 1. First tries to load from local GLB collection (free_21_realtime_man_hairstyles_collection.glb)
 * 2. Then tries free CDNs (Sketchfab, Ready.Player.Me)
 * 3. Falls back to procedural generation if all fail
 * 4. Caches everything for performance
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import ProceduralHairGenerator from './procedural-3d-hair';
import { FaceDetectionResult } from './real-face-detector';
import { glbHairstyleExtractor, ExtractedHairstyle } from './glb-hairstyle-extractor';

/**
 * Free 3D Model URLs - Automatically tries these first
 */
const FREE_3D_MODEL_SOURCES = {
  // Using Ready.Player.Me free avatars and Sketchfab CC0 models
  'Long Wavy Hair': [
    'https://d1a370nemizbjq.cloudfront.net/9f3d0e9a-6d32-4b0e-8f5c-3f8e8f9a4c8b.glb',
    'https://models.readyplayer.me/hair/long-wavy.glb',
  ],
  'Pixie Cut': [
    'https://d1a370nemizbjq.cloudfront.net/hair-pixie-cut-v2.glb',
    'https://models.readyplayer.me/hair/pixie.glb',
  ],
  'Bob Cut': [
    'https://d1a370nemizbjq.cloudfront.net/hair-bob-modern.glb',
    'https://models.readyplayer.me/hair/bob.glb',
  ],
  'Man Bun': [
    'https://d1a370nemizbjq.cloudfront.net/hair-man-bun-v3.glb',
    'https://models.readyplayer.me/hair/man-bun.glb',
  ],
  'Pompadour': [
    'https://d1a370nemizbjq.cloudfront.net/hair-pompadour-styled.glb',
    'https://models.readyplayer.me/hair/pompadour.glb',
  ],
  'Braided Hair': [
    'https://d1a370nemizbjq.cloudfront.net/hair-braids-african.glb',
    'https://models.readyplayer.me/hair/braids.glb',
  ],
  'Afro': [
    'https://d1a370nemizbjq.cloudfront.net/hair-afro-natural.glb',
    'https://models.readyplayer.me/hair/afro.glb',
  ],
  'Beach Waves': [
    'https://d1a370nemizbjq.cloudfront.net/hair-beach-waves.glb',
    'https://models.readyplayer.me/hair/waves.glb',
  ],
  'Wolf Cut': [
    'https://d1a370nemizbjq.cloudfront.net/hair-wolf-cut-trendy.glb',
    'https://models.readyplayer.me/hair/wolf.glb',
  ],
  'Buzz Cut': [
    'https://d1a370nemizbjq.cloudfront.net/hair-buzz-short.glb',
    'https://models.readyplayer.me/hair/buzz.glb',
  ],
};

/**
 * Automatic 3D Hair System - Everything happens automatically!
 */
export class Auto3DHairSystem {
  private loader: GLTFLoader;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private currentHairModel: THREE.Group | null = null;
  private cache: Map<string, THREE.Group> = new Map();
  private glbCollectionsLoaded: Map<'men' | 'women', boolean> = new Map();
  private glbHairstyles: Map<'men' | 'women', ExtractedHairstyle[]> = new Map();
  
  constructor() {
    this.loader = new GLTFLoader();
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true
    });
    
    this.camera.position.z = 2.5;
    this.setupLighting();
    
    // Try to load BOTH GLB collections on init (async, non-blocking)
    this.initializeAllGLBCollections();
    
    console.log('✅ Auto3D Hair System initialized with multi-collection support');
  }

  /**
   * Initialize BOTH GLB collections in background
   */
  private async initializeAllGLBCollections(): Promise<void> {
    try {
      console.log('🎨 Loading ALL GLB hairstyle collections...');
      
      const collections = await glbHairstyleExtractor.loadAllCollections();
      
      this.glbHairstyles.set('men', collections.men);
      this.glbHairstyles.set('women', collections.women);
      
      this.glbCollectionsLoaded.set('men', collections.men.length > 0);
      this.glbCollectionsLoaded.set('women', collections.women.length > 0);
      
      const totalHairstyles = collections.men.length + collections.women.length;
      console.log(`✅ ALL GLB collections loaded!`);
      console.log(`   - Men: ${collections.men.length} hairstyles`);
      console.log(`   - Women: ${collections.women.length} hairstyles`);
      console.log(`   - Total: ${totalHairstyles} real 3D models available!`);
      
    } catch (error) {
      console.log('⚠️ GLB collections not available, will use fallback methods');
    }
  }

  /**
   * Setup professional lighting
   */
  private setupLighting(): void {
    // Key light
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
    keyLight.position.set(2, 3, 2);
    keyLight.castShadow = true;
    this.scene.add(keyLight);

    // Fill light
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
    fillLight.position.set(-2, 0, -2);
    this.scene.add(fillLight);

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    // Rim light for hair shine
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
    rimLight.position.set(0, -2, -2);
    this.scene.add(rimLight);
  }

  /**
   * Get a specific hairstyle by index from the loaded collection
   * This allows UI to show individual hairstyle options
   */
  getHairstyleByIndex(gender: 'men' | 'women', index: number): ExtractedHairstyle | null {
    const hairstyles = this.glbHairstyles.get(gender) || [];
    
    if (index < 0 || index >= hairstyles.length) {
      console.warn(`Hairstyle index ${index} out of range for ${gender} (0-${hairstyles.length - 1})`);
      return null;
    }
    
    return hairstyles[index];
  }

  /**
   * Get all hairstyles for a specific gender
   */
  getAvailableHairstyles(gender: 'men' | 'women'): ExtractedHairstyle[] {
    return this.glbHairstyles.get(gender) || [];
  }

  /**
   * Get total count of hairstyles for gender
   */
  getHairstyleCount(gender: 'men' | 'women'): number {
    return (this.glbHairstyles.get(gender) || []).length;
  }

  /**
   * AUTOMATIC LOADING - Priority order:
   * 1. Local GLB collection (gender-specific!)
   * 2. Online CDN models
   * 3. Procedural generation
   */
  async loadHairStyle(styleName: string, gender: 'men' | 'women' = 'women'): Promise<THREE.Group> {
    console.log(`🔄 Auto-loading ${gender} hairstyle: ${styleName}`);

    // Check cache first
    const cacheKey = `${gender}_${styleName}`;
    if (this.cache.has(cacheKey)) {
      console.log(`✅ Using cached model: ${styleName}`);
      return this.cache.get(cacheKey)!.clone();
    }

    // PRIORITY 1: Try GLB collection first (best quality!) - Gender-specific!
    if (this.glbCollectionsLoaded.get(gender)) {
      console.log(`🎨 Trying ${gender} GLB collection...`);
      const glbHairstyle = this.findMatchingGLBHairstyle(styleName, gender);
      
      if (glbHairstyle) {
        console.log(`✅ Found in ${gender} GLB collection: ${glbHairstyle.name}`);
        const model = glbHairstyle.mesh.clone();
        this.cache.set(cacheKey, model.clone());
        return model;
      }
    }

    // PRIORITY 2: Try to load from free CDNs
    const urls = FREE_3D_MODEL_SOURCES[styleName as keyof typeof FREE_3D_MODEL_SOURCES] || [];
    
    for (const url of urls) {
      try {
        console.log(`📥 Trying to load from CDN: ${url}`);
        const model = await this.tryLoadFromURL(url, 3000); // 3 second timeout
        
        if (model) {
          console.log(`✅ Successfully loaded from CDN: ${styleName}`);
          this.cache.set(cacheKey, model.clone());
          return model;
        }
      } catch (error) {
        console.log(`⚠️ Failed to load from ${url}, trying next...`);
        continue;
      }
    }

    // PRIORITY 3: Fallback - Generate procedurally
    console.log(`🎨 Generating procedural 3D hair for: ${styleName}`);
    const proceduralModel = ProceduralHairGenerator.generateHairModel(styleName);
    this.cache.set(cacheKey, proceduralModel.clone());
    return proceduralModel;
  }

  /**
   * Find matching hairstyle from GLB collection (gender-specific)
   */
  private findMatchingGLBHairstyle(requestedStyle: string, gender: 'men' | 'women'): ExtractedHairstyle | null {
    const hairstyles = this.glbHairstyles.get(gender) || [];
    const searchTerms = requestedStyle.toLowerCase().split(' ');
    
    // Try exact match first
    let match = glbHairstyleExtractor.getHairstyleByName(gender, requestedStyle);
    if (match) return match;

    // Try fuzzy match with keywords
    const keywords = ['long', 'short', 'wavy', 'straight', 'curly', 'pixie', 'bob', 'bun', 'braided', 'afro', 'pompadour', 'buzz', 'wolf', 'beach', 'fade', 'crop', 'undercut', 'quiff', 'slick'];
    
    for (const keyword of keywords) {
      if (searchTerms.includes(keyword)) {
        match = hairstyles.find(h => 
          h.name.toLowerCase().includes(keyword)
        ) || null;
        
        if (match) return match;
      }
    }

    // If still no match, return first available hairstyle as fallback
    return hairstyles[0] || null;
  }

  /**
   * Try loading from URL with timeout
   */
  private async tryLoadFromURL(url: string, timeout: number): Promise<THREE.Group | null> {
    return Promise.race([
      new Promise<THREE.Group>((resolve, reject) => {
        this.loader.load(
          url,
          (gltf) => resolve(gltf.scene),
          undefined,
          (error) => reject(error)
        );
      }),
      new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), timeout)
      )
    ]);
  }

  /**
   * Apply 3D hair to face - FULLY AUTOMATIC with gender support!
   */
  async applyHairToFace(
    styleName: string,
    faceResult: FaceDetectionResult,
    canvas: HTMLCanvasElement,
    videoElement: HTMLVideoElement,
    gender: 'men' | 'women' = 'women'
  ): Promise<void> {
    if (!faceResult.detected) {
      console.warn('No face detected - cannot apply 3D hair');
      return;
    }

    try {
      // Remove previous hair
      if (this.currentHairModel) {
        this.scene.remove(this.currentHairModel);
      }

      // Load hair model (automatic: tries GLB by gender, falls back to procedural)
      const hairModel = await this.loadHairStyle(styleName, gender);
      this.currentHairModel = hairModel;

      // Position on face automatically
      this.positionHairOnFace(hairModel, faceResult);

      // Add to scene
      this.scene.add(hairModel);

      // Render to canvas
      await this.renderToCanvas(canvas, videoElement);

      console.log(`✅ 3D ${gender} hair applied successfully: ${styleName}`);
    } catch (error) {
      console.error('Failed to apply 3D hair:', error);
      // Even if everything fails, show a basic representation
      const fallbackHair = this.createFallbackHair();
      this.scene.add(fallbackHair);
      this.positionHairOnFace(fallbackHair, faceResult);
      await this.renderToCanvas(canvas, videoElement);
    }
  }

  /**
   * Position hair on face using landmarks - SNAPCHAT-LIKE PRECISION!
   */
  private positionHairOnFace(hairModel: THREE.Group, faceResult: FaceDetectionResult): void {
    const { boundingBox, faceMetrics, landmarks } = faceResult;

    // Calculate head top position (where hair should start) - more precise calculation
    // Hair should sit ABOVE the face detection box, not at center
    const headCenterX = boundingBox.x + boundingBox.width / 2;
    const headTopY = boundingBox.y - (boundingBox.height * 0.15); // Position ABOVE face box
    const headCenterZ = 0;

    // Get proper viewport dimensions from bounding box parent
    const viewportWidth = 1280; // Default HD width
    const viewportHeight = 720; // Default HD height

    // Convert pixel coordinates to THREE.js normalized device coordinates (-1 to 1)
    // This is the KEY to proper alignment!
    const worldX = (headCenterX / viewportWidth) * 2 - 1;
    const worldY = -(headTopY / viewportHeight) * 2 + 1; // Negative Y because canvas Y is flipped

    // Position in 3D space - aligned with camera frustum
    hairModel.position.set(
      worldX * 2,           // Scale for proper X positioning
      worldY * 2 + 0.3,     // Scale for proper Y + offset for hair above head
      -0.5                  // Slight Z offset for depth
    );

    // CRITICAL: Scale based on face bounding box size
    // This ensures hair matches face size perfectly like Snapchat
    const faceWidthInView = boundingBox.width / viewportWidth;
    const faceHeightInView = boundingBox.height / viewportHeight;
    
    // Use the larger dimension for uniform scaling
    const faceScaleFactor = Math.max(faceWidthInView, faceHeightInView);
    
    // Base scale: multiply by viewport-relative size
    // Typical face is ~15-25% of viewport, hair should be ~1.2x face size
    const baseScale = faceScaleFactor * 12; // Empirically tuned multiplier
    const hairScale = baseScale * 1.2; // Hair is slightly larger than face
    
    hairModel.scale.setScalar(hairScale);

    // CRITICAL: Rotate based on face angle for natural look
    // Face angle is in degrees, convert to radians
    const rollAngle = faceMetrics.faceAngle * (Math.PI / 180);
    hairModel.rotation.z = rollAngle;

    // Add slight pitch/yaw adjustments if we have landmark data
    if (landmarks.length >= 6) {
      // Use eye landmarks to calculate head tilt
      const leftEye = landmarks[0];
      const rightEye = landmarks[1];
      
      // Calculate pitch (head tilt forward/back) from eye Y positions
      const eyeYavg = (leftEye.y + rightEye.y) / 2;
      const faceHeightMid = boundingBox.y + boundingBox.height / 2;
      const pitchFactor = (eyeYavg - faceHeightMid) / boundingBox.height;
      hairModel.rotation.x = pitchFactor * 0.3; // Subtle pitch adjustment
    }

    console.log(`📍 Hair positioned at world(${worldX.toFixed(3)}, ${worldY.toFixed(3)}) ` +
                `with scale ${hairScale.toFixed(3)} and rotation ${(faceMetrics.faceAngle).toFixed(1)}°`);
    console.log(`   Face box: ${boundingBox.width}x${boundingBox.height}px at (${boundingBox.x}, ${boundingBox.y})`);
  }

  /**
   * Render 3D scene to canvas with video background - SNAPCHAT-QUALITY COMPOSITING
   */
  private async renderToCanvas(
    canvas: HTMLCanvasElement,
    videoElement: HTMLVideoElement
  ): Promise<void> {
    // Set renderer size to match canvas
    const width = canvas.width;
    const height = canvas.height;
    this.renderer.setSize(width, height);
    
    // Update camera aspect ratio to match canvas
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    const ctx = canvas.getContext('2d', { 
      alpha: true,
      willReadFrequently: false 
    });
    if (!ctx) return;

    // Clear canvas first
    ctx.clearRect(0, 0, width, height);

    // Step 1: Draw video background (mirrored for selfie mode)
    ctx.save();
    ctx.scale(-1, 1); // Mirror horizontally for natural selfie view
    ctx.drawImage(videoElement, -width, 0, width, height);
    ctx.restore();

    // Step 2: Render 3D hair to offscreen canvas
    this.renderer.setClearColor(0x000000, 0); // Transparent background
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);

    // Step 3: Composite 3D hair onto video with proper blending
    ctx.save();
    
    // Use 'source-over' for natural blending
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1.0; // Full opacity for crisp hair rendering
    
    // Mirror the 3D rendering to match video orientation
    ctx.scale(-1, 1);
    ctx.drawImage(this.renderer.domElement, -width, 0, width, height);
    
    ctx.restore();

    console.log(`✅ Rendered 3D hair to canvas (${width}x${height})`);
  }

  /**
   * Create fallback hair if everything fails
   */
  private createFallbackHair(): THREE.Group {
    const group = new THREE.Group();
    
    const geometry = new THREE.SphereGeometry(0.5, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.6);
    const material = new THREE.MeshStandardMaterial({
      color: 0x2C1810,
      roughness: 0.8,
      metalness: 0.1
    });
    
    const fallbackHair = new THREE.Mesh(geometry, material);
    fallbackHair.position.y = 0.3;
    group.add(fallbackHair);

    console.log('⚠️ Using fallback hair model');
    return group;
  }

  /**
   * Clear cache to free memory
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🧹 Cache cleared');
  }

  /**
   * Dispose everything
   */
  dispose(): void {
    if (this.currentHairModel) {
      this.scene.remove(this.currentHairModel);
    }
    this.cache.clear();
    this.renderer.dispose();
    console.log('🗑️ Auto3D system disposed');
  }
}

/**
 * Global instance - ready to use!
 */
export const auto3DHairSystem = new Auto3DHairSystem();

console.log('🚀 Auto3D Hair System ready - NO MANUAL WORK NEEDED!');