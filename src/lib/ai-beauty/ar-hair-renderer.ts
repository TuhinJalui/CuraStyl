/**
 * AR Hair Renderer - Three.js + MediaPipe anchors
 * Anchors GLB hairstyles to forehead/temples/crown with occlusion & shadows
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { FaceMeshResult, Point3D } from './mediapipe-face-engine';
import { glbHairstyleExtractor, type ExtractedHairstyle } from './glb-hairstyle-extractor';
import ProceduralHairGenerator from './procedural-3d-hair';

export interface HairstyleCatalogItem {
  id: string;
  name: string;
  category: string;
  difficulty: string;
  price: string;
  gender: 'men' | 'women';
  thumbnail: string;
  mesh: THREE.Group;
  faceShapes: string[];
  glbSource?: string;
  sourceNodes?: string[];
  bounds?: ExtractedHairstyle['bounds'];
}

const MEN_STYLES_META = [
  { name: 'Classic Pompadour', category: 'Classic', difficulty: 'Medium', price: '₹800-1200', shapes: ['oval', 'square', 'heart'] },
  { name: 'Undercut Fade', category: 'Modern', difficulty: 'Easy', price: '₹600-1000', shapes: ['oval', 'round', 'square'] },
  { name: 'Textured Crop', category: 'Trendy', difficulty: 'Easy', price: '₹700-1100', shapes: ['oval', 'round', 'heart'] },
  { name: 'Slick Back', category: 'Classic', difficulty: 'Easy', price: '₹600-900', shapes: ['oval', 'long', 'square'] },
  { name: 'Quiff', category: 'Modern', difficulty: 'Medium', price: '₹800-1200', shapes: ['oval', 'round', 'heart'] },
  { name: 'Side Part', category: 'Classic', difficulty: 'Easy', price: '₹500-800', shapes: ['oval', 'long', 'square'] },
  { name: 'Buzz Cut', category: 'Minimal', difficulty: 'Easy', price: '₹300-500', shapes: ['oval', 'round', 'square', 'long'] },
  { name: 'Fringe', category: 'Trendy', difficulty: 'Medium', price: '₹700-1000', shapes: ['oval', 'heart', 'long'] },
  { name: 'Mohawk Fade', category: 'Bold', difficulty: 'Hard', price: '₹1200-1800', shapes: ['oval', 'square'] },
  { name: 'Long & Layered', category: 'Casual', difficulty: 'Medium', price: '₹800-1200', shapes: ['oval', 'long', 'heart'] },
];

const WOMEN_STYLES_META = [
  { name: 'Beach Waves', category: 'Casual', difficulty: 'Easy', price: '₹1000-1500', shapes: ['oval', 'heart', 'long'] },
  { name: 'Sleek Straight', category: 'Classic', difficulty: 'Easy', price: '₹1200-1800', shapes: ['oval', 'long', 'square'] },
  { name: 'Loose Curls', category: 'Romantic', difficulty: 'Medium', price: '₹1500-2200', shapes: ['oval', 'round', 'heart'] },
  { name: 'Bob Cut', category: 'Modern', difficulty: 'Medium', price: '₹1200-1800', shapes: ['oval', 'round', 'square'] },
  { name: 'Pixie Cut', category: 'Bold', difficulty: 'Hard', price: '₹1000-1500', shapes: ['oval', 'heart', 'square'] },
  { name: 'High Ponytail', category: 'Sporty', difficulty: 'Easy', price: '₹600-1000', shapes: ['oval', 'long', 'round'] },
  { name: 'Messy Bun', category: 'Casual', difficulty: 'Easy', price: '₹500-800', shapes: ['oval', 'round', 'heart'] },
  { name: 'Braided Crown', category: 'Boho', difficulty: 'Hard', price: '₹1500-2500', shapes: ['oval', 'heart', 'long'] },
  { name: 'Voluminous Blowout', category: 'Glam', difficulty: 'Medium', price: '₹1200-2000', shapes: ['oval', 'round', 'long'] },
  { name: 'Side Swept Bangs', category: 'Trendy', difficulty: 'Medium', price: '₹800-1200', shapes: ['oval', 'heart', 'square'] },
];

export class ARHairRenderer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private loader: GLTFLoader;
  private hairGroup: THREE.Group | null = null;
  private catalog: HairstyleCatalogItem[] = [];
  private catalogLoaded = false;
  private thumbRenderer: THREE.WebGLRenderer;
  private thumbScene: THREE.Scene;
  private thumbCamera: THREE.PerspectiveCamera;
  private lastFaceResult: FaceMeshResult | null = null;
  private smoothedTransform = {
    x: 0, y: 0, z: 0,
    scale: 1,
    rotX: 0, rotY: 0, rotZ: 0,
  };
  private occlusionCanvas: HTMLCanvasElement;
  private occlusionCtx: CanvasRenderingContext2D;

  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.01, 100);
    this.camera.position.set(0, 0, 2);

    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.loader = new GLTFLoader();
    this.setupLighting(this.scene);

    this.thumbRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
    this.thumbRenderer.setSize(128, 128);
    this.thumbScene = new THREE.Scene();
    this.thumbCamera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
    this.thumbCamera.position.set(0, 0.2, 2.5);
    this.setupLighting(this.thumbScene);

    this.occlusionCanvas = document.createElement('canvas');
    this.occlusionCtx = this.occlusionCanvas.getContext('2d')!;
  }

  private setupLighting(scene: THREE.Scene): void {
    const key = new THREE.DirectionalLight(0xfff5ee, 1.1);
    key.position.set(1, 2, 2);
    key.castShadow = true;
    key.shadow.mapSize.set(512, 512);
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xc4d4ff, 0.45);
    fill.position.set(-2, 0, 1);
    scene.add(fill);

    const rim = new THREE.DirectionalLight(0xffffff, 0.35);
    rim.position.set(0, 1, -2);
    scene.add(rim);

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  }

  async loadCatalog(gender: 'men' | 'women'): Promise<HairstyleCatalogItem[]> {
    console.log(`🎨 Starting catalog load for ${gender}...`);
    
    glbHairstyleExtractor.clearCache();
    const meta = gender === 'men' ? MEN_STYLES_META : WOMEN_STYLES_META;
    const glbStyles = await glbHairstyleExtractor.loadAndExtract(gender);
    
    console.log(`📦 Extracted ${glbStyles.length} ${gender} hairstyles from GLB file`);
    
    const items: HairstyleCatalogItem[] = [];
    const sourceStyles = glbStyles.length > 0 ? glbStyles : [];
    const itemCount = sourceStyles.length > 0 ? sourceStyles.length : meta.length;

    for (let i = 0; i < itemCount; i++) {
      const glbStyle = sourceStyles[i];
      const m = meta[i % meta.length];
      let mesh: THREE.Group;

      if (glbStyle) {
        mesh = glbStyle.mesh.clone(true);
        this.normalizeHairMesh(mesh);
        console.log(`  ✓ GLB hairstyle ${i + 1}: "${glbStyle.name}" (${glbStyle.bounds?.width.toFixed(2)} x ${glbStyle.bounds?.height.toFixed(2)})`);
      } else {
        mesh = ProceduralHairGenerator.generateHairModel(m.name);
        this.normalizeHairMesh(mesh);
        console.log(`  ⚠ Procedural fallback ${i + 1}: "${m.name}"`);
      }

      mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material instanceof THREE.MeshStandardMaterial) {
            child.material.side = THREE.DoubleSide;
            // Make sure material colors are bright and visible
            if (!child.material.color || child.material.color.getHex() === 0x000000) {
              child.material.color = new THREE.Color(0x8B4513); // Default brown hair color
            }
          }
        }
      });

      const thumbnail = await this.generateThumbnail(mesh);

      items.push({
        id: glbStyle?.id ?? `${gender}_${i}`,
        name: glbStyle?.name ?? m.name,
        category: m.category,
        difficulty: m.difficulty,
        price: m.price,
        gender,
        thumbnail,
        mesh,
        faceShapes: m.shapes,
        glbSource: glbStyle?.collection,
        sourceNodes: glbStyle?.sourceNodes,
        bounds: glbStyle?.bounds,
      });
    }

    this.catalog = items;
    this.catalogLoaded = true;
    console.log(`✅ AR catalog loaded: ${items.length} ${gender} hairstyles ready`);
    return items;
  }

  getCatalog(): HairstyleCatalogItem[] {
    return this.catalog;
  }

  isCatalogLoaded(): boolean {
    return this.catalogLoaded;
  }

  private normalizeHairMesh(mesh: THREE.Group): void {
    const box = new THREE.Box3().setFromObject(mesh);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    // Center the mesh at origin
    mesh.position.sub(center);

    // Normalize scale based on width (consistent sizing)
    const targetWidth = 1;
    const width = Math.max(size.x, 0.001);
    const scale = targetWidth / width;
    mesh.scale.setScalar(scale);
    mesh.updateMatrixWorld(true);

    // Recalculate bounds after normalization
    const normalizedBox = new THREE.Box3().setFromObject(mesh);
    const normalizedSize = new THREE.Vector3();
    normalizedBox.getSize(normalizedSize);

    // Store fit metadata for positioning calculations
    mesh.userData.fitWidth = normalizedSize.x || 1;
    mesh.userData.fitHeight = normalizedSize.y || 0.4;
    mesh.userData.fitDepth = normalizedSize.z || 0.6;
    mesh.userData.crownLift = THREE.MathUtils.clamp(normalizedSize.y * 0.2, 0.08, 0.22);
    
    console.log(`  Normalized mesh: ${normalizedSize.x.toFixed(2)} x ${normalizedSize.y.toFixed(2)} x ${normalizedSize.z.toFixed(2)}`);
  }

  private async generateThumbnail(mesh: THREE.Group): Promise<string> {
    const clone = mesh.clone(true);
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((mat) => {
          if (mat instanceof THREE.MeshStandardMaterial) {
            mat.side = THREE.DoubleSide;
            mat.needsUpdate = true;
          }
        });
      }
    });

    this.thumbScene.clear();
    this.setupLighting(this.thumbScene);
    this.thumbScene.add(clone);

    const box = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    clone.position.sub(center);

    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    this.thumbCamera.position.set(0, maxDim * 0.15, maxDim * 2.8);
    this.thumbCamera.lookAt(0, 0, 0);
    this.thumbCamera.updateProjectionMatrix();

    this.thumbRenderer.setClearColor(0x1a1a2e, 1);
    this.thumbRenderer.render(this.thumbScene, this.thumbCamera);
    return this.thumbRenderer.domElement.toDataURL('image/png');
  }

  applyHairstyle(item: HairstyleCatalogItem): void {
    // CRITICAL: Remove any existing hairstyle first to prevent overlapping
    if (this.hairGroup) {
      this.scene.remove(this.hairGroup);
      this.hairGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => mat.dispose());
          } else {
            child.material?.dispose();
          }
        }
      });
      this.hairGroup = null;
    }

    // Reset smoothing to prevent position carry-over from previous hairstyle
    this.smoothedTransform = { x: 0, y: 0, z: 0, scale: 1, rotX: 0, rotY: 0, rotZ: 0 };

    // Clone the hairstyle mesh - deep clone to ensure complete isolation
    this.hairGroup = item.mesh.clone(true);
    this.hairGroup.visible = true;
    
    this.hairGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.visible = true;
        child.frustumCulled = false; // CRITICAL: Don't cull hair from rendering
        
        // Clone material to prevent shared state
        if (Array.isArray(child.material)) {
          child.material = child.material.map(mat => {
            const cloned = mat.clone();
            if (cloned instanceof THREE.MeshStandardMaterial) {
              cloned.side = THREE.DoubleSide;
              cloned.transparent = false;
              cloned.opacity = 1.0;
              cloned.depthWrite = true;
              cloned.depthTest = true;
              cloned.needsUpdate = true;
            }
            return cloned;
          });
        } else {
          child.material = child.material.clone();
          if (child.material instanceof THREE.MeshStandardMaterial) {
            child.material.side = THREE.DoubleSide;
            child.material.transparent = false;
            child.material.opacity = 1.0;
            child.material.depthWrite = true;
            child.material.depthTest = true;
            child.material.needsUpdate = true;
          }
        }
      }
    });

    this.scene.add(this.hairGroup);
    console.log(`✅ Applied hairstyle: ${item.name} (${item.id}) - ${this.hairGroup.children.length} meshes`);
  }

  clearHairstyle(): void {
    if (this.hairGroup) {
      this.scene.remove(this.hairGroup);
      
      // Properly dispose of geometries and materials
      this.hairGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => mat.dispose());
          } else {
            child.material?.dispose();
          }
        }
      });
      
      this.hairGroup = null;
      console.log('✅ Cleared hairstyle');
    }
  }

  /**
   * Anchor hair to face landmarks with smoothing & collision correction
   */
  private updateHairTransform(face: FaceMeshResult, width: number): void {
    if (!this.hairGroup) return;

    const { anchors, headPose, faceWidth } = face;
    const forehead = this.toWorld(anchors.foreheadCenter);
    const leftTemple = this.toWorld(anchors.leftTemple);
    const rightTemple = this.toWorld(anchors.rightTemple);
    const crown = this.toWorld(anchors.crown);

    const templeDist = Math.sqrt(
      Math.pow(rightTemple.x - leftTemple.x, 2) +
      Math.pow(rightTemple.y - leftTemple.y, 2)
    );

    const faceWidthWorld = Math.max(templeDist, (faceWidth / Math.max(width, 1)) * 2);
    const fitWidth = Math.max(this.hairGroup.userData.fitWidth ?? 1, 0.001);
    const fitHeight = Math.max(this.hairGroup.userData.fitHeight ?? 0.4, 0.001);
    const fitDepth = Math.max(this.hairGroup.userData.fitDepth ?? 0.6, 0.001);
    
    // More aggressive width coverage to ensure MAXIMUM visibility
    const widthCoverage = THREE.MathUtils.clamp(1.85 + fitHeight * 0.20, 1.75, 2.25);
    const targetScale = THREE.MathUtils.clamp((faceWidthWorld * widthCoverage) / fitWidth, 0.45, 2.8);

    const centerX = (leftTemple.x + rightTemple.x) / 2;
    const crownLift = THREE.MathUtils.clamp(this.hairGroup.userData.crownLift ?? 0.12, 0.06, 0.24);
    
    const targetX = centerX;
    const targetY = crown.y + crownLift * targetScale;
    // Position hair MORE forward to ensure it's ALWAYS visible
    const targetZ = Math.min(forehead.z, crown.z) - THREE.MathUtils.clamp(fitDepth * targetScale * 0.08, 0.03, 0.15);

    const lerp = 0.35;
    this.smoothedTransform.x += (targetX - this.smoothedTransform.x) * lerp;
    this.smoothedTransform.y += (targetY - this.smoothedTransform.y) * lerp;
    this.smoothedTransform.z += (targetZ - this.smoothedTransform.z) * lerp;
    this.smoothedTransform.scale += (targetScale - this.smoothedTransform.scale) * lerp;

    const targetRotX = headPose.pitch * (Math.PI / 180) * 0.65;
    const targetRotY = -headPose.yaw * (Math.PI / 180) * 0.85;
    const targetRotZ = -headPose.roll * (Math.PI / 180);

    this.smoothedTransform.rotX += (targetRotX - this.smoothedTransform.rotX) * lerp;
    this.smoothedTransform.rotY += (targetRotY - this.smoothedTransform.rotY) * lerp;
    this.smoothedTransform.rotZ += (targetRotZ - this.smoothedTransform.rotZ) * lerp;

    const minScale = Math.max(0.4, (faceWidth / Math.max(width, 1)) * 2.5);
    const maxScale = Math.max(minScale + 0.5, (faceWidth / Math.max(width, 1)) * 9.0);
    const clampedScale = THREE.MathUtils.clamp(this.smoothedTransform.scale, minScale, maxScale);
    
    // Less vertical offset for better head coverage
    const yOffset = -0.015 * clampedScale;

    this.hairGroup.position.set(
      this.smoothedTransform.x,
      this.smoothedTransform.y + yOffset,
      this.smoothedTransform.z
    );
    this.hairGroup.scale.setScalar(clampedScale);
    this.hairGroup.rotation.set(
      this.smoothedTransform.rotX,
      this.smoothedTransform.rotY,
      this.smoothedTransform.rotZ
    );
    
    console.log(`Hair transform: pos(${this.hairGroup.position.x.toFixed(2)}, ${this.hairGroup.position.y.toFixed(2)}, ${this.hairGroup.position.z.toFixed(2)}) scale=${clampedScale.toFixed(2)}`);
  }

  private toWorld(point: Point3D): THREE.Vector3 {
    // Mirrored coords: flip X for selfie camera
    const x = (0.5 - point.x) * 2;
    const y = -(point.y - 0.5) * 2;
    const z = -point.z * 2;
    return new THREE.Vector3(x, y, z);
  }

  /**
   * Render AR frame: video + 3D hair + forehead occlusion
   */
  renderFrame(
    outputCanvas: HTMLCanvasElement,
    video: HTMLVideoElement,
    face: FaceMeshResult
  ): void {
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (w === 0 || h === 0) return;

    this.lastFaceResult = face;
    outputCanvas.width = w;
    outputCanvas.height = h;

    const ctx = outputCanvas.getContext('2d');
    if (!ctx) return;

    // Draw mirrored video
    ctx.save();
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, w, h);
    ctx.restore();

    if (face.detected && this.hairGroup) {
      this.updateHairTransform(face, w);

      // Update camera to match video aspect ratio
      this.camera.aspect = w / h;
      this.camera.fov = 50;
      this.camera.updateProjectionMatrix();
      
      this.renderer.setSize(w, h, false);
      this.renderer.setPixelRatio(1);
      this.renderer.setClearColor(0x000000, 0); // Transparent background

      // Render 3D scene
      this.renderer.render(this.scene, this.camera);

      // Composite 3D hair on top of video with FULL opacity for maximum visibility
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1.0; // FULL opacity - hair must be clearly visible
      ctx.drawImage(this.renderer.domElement, 0, 0, w, h);
      ctx.restore();
      
      // Apply occlusion mask to hide hair behind forehead
      this.applyOcclusionMask(ctx, face, w, h, video);
      
      console.log(`✅ 3D hair rendered - Scale: ${this.hairGroup.scale.x.toFixed(2)}, Pos: (${this.hairGroup.position.x.toFixed(2)}, ${this.hairGroup.position.y.toFixed(2)}, ${this.hairGroup.position.z.toFixed(2)})`);
    } else if (this.hairGroup) {
      // Hair selected but waiting for face lock — show preview hint
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      ctx.fillRect(0, 0, w, h);
    }
  }

  /**
   * Dynamic occlusion: hide hair in front of forehead/eyes
   */
  private applyOcclusionMask(
    ctx: CanvasRenderingContext2D,
    face: FaceMeshResult,
    w: number,
    h: number,
    video: HTMLVideoElement
  ): void {
    const lm = face.landmarks;
    if (lm.length < 468) return;

    const mirrorX = (x: number) => (1 - x) * w;
    const topY = Math.min(lm[70]?.y ?? 0.35, lm[300]?.y ?? 0.35) * h;
    const bottomY = (lm[2]?.y ?? 0.55) * h;
    const leftX = mirrorX(lm[234]?.x ?? 0.3);
    const rightX = mirrorX(lm[454]?.x ?? 0.7);
    const padX = Math.abs(rightX - leftX) * 0.08;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(Math.min(leftX, rightX) + padX, topY);
    ctx.quadraticCurveTo(w / 2, topY - h * 0.03, Math.max(leftX, rightX) - padX, topY);
    ctx.lineTo(Math.max(leftX, rightX) - padX * 1.2, bottomY);
    ctx.quadraticCurveTo(w / 2, bottomY + h * 0.04, Math.min(leftX, rightX) + padX * 1.2, bottomY);
    ctx.closePath();
    ctx.clip();

    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, w, h);
    ctx.restore();
  }

  getCompatibilityScore(item: HairstyleCatalogItem, faceShape: string): number {
    if (item.faceShapes.includes(faceShape)) return 85 + Math.floor(Math.random() * 12);
    if (faceShape === 'oval') return 75 + Math.floor(Math.random() * 15);
    return 55 + Math.floor(Math.random() * 20);
  }

  dispose(): void {
    this.clearHairstyle();
    this.renderer.dispose();
    this.thumbRenderer.dispose();
    this.catalog = [];
    this.catalogLoaded = false;
  }
}

export const arHairRenderer = new ARHairRenderer();
