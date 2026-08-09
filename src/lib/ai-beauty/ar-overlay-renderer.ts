/**
 * AR Overlay Renderer
 * 
 * Renders virtual hairstyles and makeup overlays on live camera feed using face tracking data.
 * Handles coordinate transformation, lighting adjustment, and smooth rendering.
 * 
 * @see Design Document: Phase 6 - AR Virtual Makeover  
 * @see Requirements: 3.4, 3.5, 3.9
 */

import type { FaceTrackingData } from './ar-face-tracker';

/**
 * Hairstyle asset configuration
 */
export interface HairstyleAsset {
  /** Unique style identifier */
  id: string;
  
  /** Display name */
  name: string;
  
  /** Image URL or data URI */
  imageUrl: string;
  
  /** Style category */
  category: string;
  
  /** Anchor points for positioning (relative to face landmarks) */
  anchorPoints?: {
    top: number; // Landmark index for top of hair
    left: number; // Landmark index for left side
    right: number; // Landmark index for right side
  };
  
  /** Scale factor relative to face */
  scaleFactor?: number;
  
  /** Vertical offset in face-relative units */
  offsetY?: number;
}

/**
 * AR Overlay Renderer
 * 
 * Renders hairstyle overlays on canvas using face tracking data.
 */
export class AROverlayRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private currentStyle: HairstyleAsset | null = null;
  private styleImage: HTMLImageElement | null = null;
  private frameCount = 0;
  private lastFrameTime = 0;
  
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    
    if (!context) {
      throw new Error('Failed to get 2D context from canvas');
    }
    
    this.ctx = context;
  }
  
  /**
   * Load and set a hairstyle for rendering
   * 
   * @param style - Hairstyle asset to load
   * @returns Promise that resolves when style is loaded
   */
  async loadStyle(style: HairstyleAsset): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        this.styleImage = img;
        this.currentStyle = style;
        resolve();
      };
      
      img.onerror = () => {
        reject(new Error(`Failed to load style image: ${style.imageUrl}`));
      };
      
      img.src = style.imageUrl;
    });
  }
  
  /**
   * Render AR overlay on canvas using face tracking data
   * 
   * @param trackingData - Face tracking information
   * @param videoElement - Source video element
   * @param lightingAdjustment - Lighting adjustment factor (0-2, 1 = no change)
   */
  render(
    trackingData: FaceTrackingData,
    videoElement: HTMLVideoElement,
    lightingAdjustment: number = 1.0
  ): void {
    const now = performance.now();
    
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw video frame
    this.ctx.drawImage(videoElement, 0, 0, this.canvas.width, this.canvas.height);
    
    // Render style overlay if available
    if (this.currentStyle && this.styleImage && trackingData.landmarks.length > 0) {
      this.renderStyleOverlay(trackingData, lightingAdjustment);
    }
    
    // Track frame rate
    this.frameCount++;
    if (now - this.lastFrameTime >= 1000) {
      const fps = this.frameCount;
      
      // Requirement 3.6: Should maintain at least 30 FPS
      if (fps < 30) {
        console.warn(`AR rendering FPS below target: ${fps} FPS (target: 30+ FPS)`);
      }
      
      this.frameCount = 0;
      this.lastFrameTime = now;
    }
  }
  
  /**
   * Render style overlay on the tracked face
   * 
   * @param trackingData - Face tracking data
   * @param lightingAdjustment - Lighting multiplier
   */
  private renderStyleOverlay(
    trackingData: FaceTrackingData,
    lightingAdjustment: number
  ): void {
    if (!this.styleImage || !this.currentStyle) return;
    
    const landmarks = trackingData.landmarks;
    const { width, height } = this.canvas;
    
    // Default anchor points if not specified
    const anchorTop = this.currentStyle.anchorPoints?.top ?? 10; // Forehead
    const anchorLeft = this.currentStyle.anchorPoints?.left ?? 234; // Left temple
    const anchorRight = this.currentStyle.anchorPoints?.right ?? 454; // Right temple
    
    // Get anchor positions in canvas coordinates
    const topPoint = landmarks[anchorTop];
    const leftPoint = landmarks[anchorLeft];
    const rightPoint = landmarks[anchorRight];
    
    const topX = topPoint.x * width;
    const topY = topPoint.y * height;
    const leftX = leftPoint.x * width;
    const rightX = rightPoint.x * width;
    
    // Calculate style dimensions
    const styleWidth = (rightX - leftX) * (this.currentStyle.scaleFactor ?? 1.5);
    const styleHeight = this.styleImage.height * (styleWidth / this.styleImage.width);
    
    // Calculate style position (centered on top anchor with offset)
    const offsetY = (this.currentStyle.offsetY ?? -0.5) * styleHeight;
    const styleX = topX - styleWidth / 2;
    const styleY = topY + offsetY;
    
    // Apply transformations
    this.ctx.save();
    
    // Translate to style position
    this.ctx.translate(styleX + styleWidth / 2, styleY + styleHeight / 2);
    
    // Apply rotation
    this.ctx.rotate(trackingData.rotation.roll * Math.PI / 180);
    
    // Apply scaling based on face scale
    const scale = trackingData.scale;
    this.ctx.scale(scale, scale);
    
    // Apply lighting adjustment
    this.ctx.globalAlpha = Math.min(1.0, lightingAdjustment);
    
    // Draw style image
    this.ctx.drawImage(
      this.styleImage,
      -styleWidth / 2,
      -styleHeight / 2,
      styleWidth,
      styleHeight
    );
    
    this.ctx.restore();
  }
  
  /**
   * Get current frame rate
   */
  getCurrentFPS(): number {
    return this.frameCount;
  }
  
  /**
   * Clear the overlay
   */
  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

/**
 * Calculate lighting adjustment factor from video frame
 * 
 * Analyzes average brightness of the video frame to adjust AR overlay lighting.
 * 
 * @param videoElement - Video element to analyze
 * @param canvas - Temporary canvas for analysis
 * @returns Lighting adjustment factor (0-2, 1 = normal)
 */
export function calculateLightingAdjustment(
  videoElement: HTMLVideoElement,
  canvas?: HTMLCanvasElement
): number {
  // Create temporary canvas if not provided
  const tempCanvas = canvas || document.createElement('canvas');
  tempCanvas.width = 100; // Sample at lower resolution for performance
  tempCanvas.height = 75;
  
  const ctx = tempCanvas.getContext('2d');
  if (!ctx) return 1.0;
  
  // Draw downsampled video frame
  ctx.drawImage(videoElement, 0, 0, tempCanvas.width, tempCanvas.height);
  
  // Get pixel data
  const imageData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
  const pixels = imageData.data;
  
  // Calculate average brightness
  let totalBrightness = 0;
  const pixelCount = pixels.length / 4;
  
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    
    // Calculate luminance
    const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    totalBrightness += brightness;
  }
  
  const avgBrightness = totalBrightness / pixelCount;
  
  // Convert brightness to adjustment factor
  // Dark environment (0.0-0.3): increase overlay brightness
  // Normal environment (0.3-0.7): no adjustment
  // Bright environment (0.7-1.0): decrease overlay brightness
  let adjustment = 1.0;
  
  if (avgBrightness < 0.3) {
    // Dark environment - brighten overlay
    adjustment = 1.0 + (0.3 - avgBrightness) * 2;
  } else if (avgBrightness > 0.7) {
    // Bright environment - darken overlay slightly
    adjustment = 1.0 - (avgBrightness - 0.7) * 0.5;
  }
  
  return Math.max(0.5, Math.min(1.5, adjustment));
}
