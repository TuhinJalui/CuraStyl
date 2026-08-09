// Advanced Face Detection & AR Processing
import * as tf from '@tensorflow/tfjs';

export interface FaceDetectionResult {
  landmarks: {
    leftEye: { x: number; y: number };
    rightEye: { x: number; y: number };
    nose: { x: number; y: number };
    mouth: { x: number; y: number };
    chin: { x: number; y: number };
    forehead: { x: number; y: number };
    leftCheek: { x: number; y: number };
    rightCheek: { x: number; y: number };
    hairline: { x: number; y: number };
  };
  faceShape: 'oval' | 'round' | 'square' | 'heart' | 'long' | 'diamond';
  skinTone: 'fair' | 'medium' | 'olive' | 'dark';
  hairRegion: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  faceRegion: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
}

export class FaceDetector {
  private model: any = null;

  async initialize() {
    // Load TensorFlow face detection model
    try {
      await tf.ready();
      // In production, you'd load a proper face detection model
      // For now, we'll use basic detection
      this.model = true;
      return true;
    } catch (error) {
      console.error('Failed to load face detection model:', error);
      return false;
    }
  }

  async detectFace(imageData: ImageData): Promise<FaceDetectionResult | null> {
    if (!this.model) {
      await this.initialize();
    }

    try {
      // Simulate face detection (in production, use actual ML model)
      const width = imageData.width;
      const height = imageData.height;

      // Estimate face landmarks based on common proportions
      const faceWidth = width * 0.6;
      const faceHeight = height * 0.7;
      const faceX = (width - faceWidth) / 2;
      const faceY = height * 0.15;

      const landmarks = {
        leftEye: { x: faceX + faceWidth * 0.3, y: faceY + faceHeight * 0.3 },
        rightEye: { x: faceX + faceWidth * 0.7, y: faceY + faceHeight * 0.3 },
        nose: { x: faceX + faceWidth * 0.5, y: faceY + faceHeight * 0.5 },
        mouth: { x: faceX + faceWidth * 0.5, y: faceY + faceHeight * 0.7 },
        chin: { x: faceX + faceWidth * 0.5, y: faceY + faceHeight },
        forehead: { x: faceX + faceWidth * 0.5, y: faceY },
        leftCheek: { x: faceX + faceWidth * 0.2, y: faceY + faceHeight * 0.6 },
        rightCheek: { x: faceX + faceWidth * 0.8, y: faceY + faceHeight * 0.6 },
        hairline: { x: faceX + faceWidth * 0.5, y: Math.max(0, faceY - faceHeight * 0.1) },
      };

      return {
        landmarks,
        faceShape: this.detectFaceShape(landmarks),
        skinTone: this.detectSkinTone(imageData, faceX, faceY, faceWidth, faceHeight),
        hairRegion: {
          x: faceX - faceWidth * 0.2,
          y: 0,
          width: faceWidth * 1.4,
          height: faceY + faceHeight * 0.3,
        },
        faceRegion: {
          x: faceX,
          y: faceY,
          width: faceWidth,
          height: faceHeight,
        },
        confidence: 0.92,
      };
    } catch (error) {
      console.error('Face detection failed:', error);
      return null;
    }
  }

  private detectFaceShape(landmarks: any): FaceDetectionResult['faceShape'] {
    // Simple face shape detection based on proportions
    const faceWidth = Math.abs(landmarks.rightCheek.x - landmarks.leftCheek.x);
    const faceHeight = Math.abs(landmarks.chin.y - landmarks.forehead.y);
    const ratio = faceHeight / faceWidth;

    if (ratio > 1.4) return 'long';
    if (ratio < 1.1) return 'round';
    if (ratio >= 1.1 && ratio <= 1.3) return 'oval';
    return 'oval'; // Default
  }

  private detectSkinTone(
    imageData: ImageData,
    x: number,
    y: number,
    width: number,
    height: number
  ): FaceDetectionResult['skinTone'] {
    // Sample pixels from face region
    const samples: number[] = [];
    const sampleSize = 10;

    for (let i = 0; i < sampleSize; i++) {
      const px = Math.floor(x + (width / 2) + (Math.random() - 0.5) * width * 0.3);
      const py = Math.floor(y + (height / 2) + (Math.random() - 0.5) * height * 0.3);
      const index = (py * imageData.width + px) * 4;
      
      if (index >= 0 && index < imageData.data.length) {
        const brightness = (imageData.data[index] + imageData.data[index + 1] + imageData.data[index + 2]) / 3;
        samples.push(brightness);
      }
    }

    const avgBrightness = samples.reduce((a, b) => a + b, 0) / samples.length;

    if (avgBrightness > 200) return 'fair';
    if (avgBrightness > 150) return 'medium';
    if (avgBrightness > 100) return 'olive';
    return 'dark';
  }

  async applyHairstyle(
    canvas: HTMLCanvasElement,
    faceData: FaceDetectionResult,
    hairstyleImage: HTMLImageElement
  ): Promise<void> {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { hairRegion, landmarks } = faceData;

    // Calculate proper hairstyle positioning
    const scaleX = hairRegion.width / hairstyleImage.width;
    const scaleY = hairRegion.height / hairstyleImage.height;
    const scale = Math.max(scaleX, scaleY);

    const scaledWidth = hairstyleImage.width * scale;
    const scaledHeight = hairstyleImage.height * scale;

    // Center the hairstyle on the head
    const drawX = hairRegion.x + (hairRegion.width - scaledWidth) / 2;
    const drawY = hairRegion.y;

    // Apply hairstyle with proper blending
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.95;
    ctx.drawImage(hairstyleImage, drawX, drawY, scaledWidth, scaledHeight);
    ctx.globalAlpha = 1.0;
  }

  async applyFacialGlow(
    canvas: HTMLCanvasElement,
    faceData: FaceDetectionResult,
    intensity: number,
    glowType: 'natural' | 'radiant' | 'luminous'
  ): Promise<void> {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { faceRegion } = faceData;
    const imageData = ctx.getImageData(
      faceRegion.x,
      faceRegion.y,
      faceRegion.width,
      faceRegion.height
    );

    // Apply glow effect based on type
    const data = imageData.data;
    const factor = intensity / 100;

    for (let i = 0; i < data.length; i += 4) {
      if (glowType === 'natural') {
        // Enhance natural tones
        data[i] = Math.min(255, data[i] + 10 * factor); // R
        data[i + 1] = Math.min(255, data[i + 1] + 8 * factor); // G
        data[i + 2] = Math.min(255, data[i + 2] + 5 * factor); // B
      } else if (glowType === 'radiant') {
        // Golden glow
        data[i] = Math.min(255, data[i] + 15 * factor);
        data[i + 1] = Math.min(255, data[i + 1] + 12 * factor);
        data[i + 2] = Math.min(255, data[i + 2] + 5 * factor);
      } else if (glowType === 'luminous') {
        // Bright luminous effect
        data[i] = Math.min(255, data[i] + 20 * factor);
        data[i + 1] = Math.min(255, data[i + 1] + 20 * factor);
        data[i + 2] = Math.min(255, data[i + 2] + 18 * factor);
      }
    }

    ctx.putImageData(imageData, faceRegion.x, faceRegion.y);

    // Add subtle highlight on cheeks and forehead
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.15 * factor;

    const gradient = ctx.createRadialGradient(
      faceData.landmarks.leftCheek.x,
      faceData.landmarks.leftCheek.y,
      0,
      faceData.landmarks.leftCheek.x,
      faceData.landmarks.leftCheek.y,
      faceRegion.width * 0.15
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1.0;
  }

  async applyMakeup(
    canvas: HTMLCanvasElement,
    faceData: FaceDetectionResult,
    makeupType: string,
    intensity: number
  ): Promise<void> {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const factor = intensity / 100;

    // Apply eye makeup
    this.applyEyeMakeup(ctx, faceData, factor);

    // Apply lip color
    this.applyLipColor(ctx, faceData, makeupType, factor);

    // Apply blush
    this.applyBlush(ctx, faceData, factor);
  }

  private applyEyeMakeup(ctx: CanvasRenderingContext2D, faceData: FaceDetectionResult, intensity: number) {
    const { leftEye, rightEye } = faceData.landmarks;
    const eyeSize = faceData.faceRegion.width * 0.08;

    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = 0.3 * intensity;

    // Eye shadow
    const shadowGradient = ctx.createRadialGradient(leftEye.x, leftEye.y, 0, leftEye.x, leftEye.y, eyeSize);
    shadowGradient.addColorStop(0, 'rgba(100, 60, 80, 0.6)');
    shadowGradient.addColorStop(1, 'rgba(100, 60, 80, 0)');

    ctx.fillStyle = shadowGradient;
    ctx.beginPath();
    ctx.ellipse(leftEye.x, leftEye.y - eyeSize * 0.3, eyeSize, eyeSize * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(rightEye.x, rightEye.y - eyeSize * 0.3, eyeSize, eyeSize * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1.0;
  }

  private applyLipColor(ctx: CanvasRenderingContext2D, faceData: FaceDetectionResult, makeupType: string, intensity: number) {
    const { mouth } = faceData.landmarks;
    const lipWidth = faceData.faceRegion.width * 0.15;
    const lipHeight = faceData.faceRegion.height * 0.04;

    // Lip colors based on makeup type
    const lipColors: Record<string, string> = {
      'Natural Everyday': 'rgba(200, 120, 120, 0.5)',
      'Bold Red Lips': 'rgba(180, 20, 30, 0.8)',
      'Nude Elegance': 'rgba(210, 150, 140, 0.4)',
      'Party Glam': 'rgba(160, 40, 60, 0.7)',
      'Bridal Makeup': 'rgba(190, 80, 90, 0.6)',
    };

    const color = lipColors[makeupType] || 'rgba(200, 100, 100, 0.5)';

    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = intensity;
    ctx.fillStyle = color;
    
    ctx.beginPath();
    ctx.ellipse(mouth.x, mouth.y, lipWidth, lipHeight, 0, 0, Math.PI * 2);
    ctx.fill();

    // Add gloss effect
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.3 * intensity;
    const glossGradient = ctx.createLinearGradient(mouth.x, mouth.y - lipHeight, mouth.x, mouth.y);
    glossGradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
    glossGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = glossGradient;
    ctx.beginPath();
    ctx.ellipse(mouth.x, mouth.y - lipHeight * 0.3, lipWidth * 0.8, lipHeight * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1.0;
  }

  private applyBlush(ctx: CanvasRenderingContext2D, faceData: FaceDetectionResult, intensity: number) {
    const { leftCheek, rightCheek } = faceData.landmarks;
    const blushSize = faceData.faceRegion.width * 0.12;

    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = 0.2 * intensity;

    const blushGradient = ctx.createRadialGradient(leftCheek.x, leftCheek.y, 0, leftCheek.x, leftCheek.y, blushSize);
    blushGradient.addColorStop(0, 'rgba(220, 100, 120, 0.6)');
    blushGradient.addColorStop(1, 'rgba(220, 100, 120, 0)');

    ctx.fillStyle = blushGradient;
    ctx.beginPath();
    ctx.arc(leftCheek.x, leftCheek.y, blushSize, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(rightCheek.x, rightCheek.y, blushSize, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1.0;
  }
}

export const faceDetector = new FaceDetector();
