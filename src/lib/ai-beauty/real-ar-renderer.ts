/**
 * Real AR Renderer with Canvas-based 3D effects
 * 
 * This renders actual visual hairstyles and facial effects on the captured image
 */

import { FaceDetectionResult } from './real-face-detector';

export interface ARStyle {
  id: string;
  name: string;
  type: 'hair' | 'facial' | 'makeup';
}

export class RealARRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  initialize(canvas: HTMLCanvasElement): boolean {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { willReadFrequently: true });
    return this.ctx !== null;
  }

  /**
   * Apply hairstyle overlay to image
   */
  async applyHairstyle(
    imageData: string,
    style: ARStyle,
    faceResult: FaceDetectionResult
  ): Promise<string> {
    if (!this.canvas || !this.ctx) return imageData;

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        // Set canvas size to match image
        this.canvas!.width = img.width;
        this.canvas!.height = img.height;

        // Draw original image
        this.ctx!.drawImage(img, 0, 0);

        // Apply hairstyle based on face detection
        if (faceResult.detected) {
          this.drawHairstyle(style, faceResult);
        }

        resolve(this.canvas!.toDataURL('image/png'));
      };
      img.src = imageData;
    });
  }

  /**
   * Draw hairstyle on canvas
   */
  private drawHairstyle(style: ARStyle, faceResult: FaceDetectionResult): void {
    if (!this.ctx || !this.canvas) return;

    const { boundingBox } = faceResult;
    const ctx = this.ctx;

    // Calculate hair region (above face)
    const hairY = boundingBox.y - boundingBox.height * 0.4;
    const hairHeight = boundingBox.height * 1.2;
    const hairWidth = boundingBox.width * 1.4;
    const hairX = boundingBox.x - (hairWidth - boundingBox.width) / 2;

    ctx.save();

    // Different hairstyles based on name
    switch (style.name) {
      case 'Wolf Cut':
      case 'Layered Long':
        this.drawLongLayeredHair(ctx, hairX, hairY, hairWidth, hairHeight);
        break;
      
      case 'Pixie Cut':
      case 'Buzz Cut':
        this.drawShortHair(ctx, hairX, hairY, hairWidth, hairHeight * 0.6);
        break;
      
      case 'Bob Cut':
        this.drawBobCut(ctx, hairX, hairY, hairWidth, hairHeight * 0.8);
        break;
      
      case 'Pompadour':
      case 'Quiff':
        this.drawPompadour(ctx, hairX, hairY, hairWidth, hairHeight);
        break;
      
      case 'Man Bun':
        this.drawManBun(ctx, hairX, hairY, hairWidth, hairHeight);
        break;

      case 'Beach Waves':
        this.drawBeachWaves(ctx, hairX, hairY, hairWidth, hairHeight);
        break;

      default:
        this.drawDefaultHair(ctx, hairX, hairY, hairWidth, hairHeight);
    }

    ctx.restore();
  }

  /**
   * Draw long layered hair
   */
  private drawLongLayeredHair(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
    const gradient = ctx.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, '#2C1810');
    gradient.addColorStop(0.5, '#3D2817');
    gradient.addColorStop(1, '#2C1810');

    // Draw hair strands
    for (let i = 0; i < 50; i++) {
      const offsetX = (Math.random() - 0.5) * width;
      const strandWidth = 8 + Math.random() * 8;
      
      ctx.beginPath();
      ctx.moveTo(x + width / 2 + offsetX, y);
      
      // Create wavy hair strands
      const cp1x = x + width / 2 + offsetX + (Math.random() - 0.5) * 30;
      const cp1y = y + height * 0.3;
      const cp2x = x + width / 2 + offsetX + (Math.random() - 0.5) * 30;
      const cp2y = y + height * 0.7;
      const endX = x + width / 2 + offsetX + (Math.random() - 0.5) * 40;
      const endY = y + height;
      
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
      ctx.lineWidth = strandWidth;
      ctx.strokeStyle = gradient;
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.7 + Math.random() * 0.3;
      ctx.stroke();
    }

    // Add highlights
    ctx.globalAlpha = 0.3;
    const highlightGradient = ctx.createLinearGradient(x, y, x, y + height);
    highlightGradient.addColorStop(0, '#5D4332');
    highlightGradient.addColorStop(1, 'transparent');
    
    for (let i = 0; i < 20; i++) {
      const offsetX = (Math.random() - 0.5) * width * 0.8;
      ctx.beginPath();
      ctx.moveTo(x + width / 2 + offsetX, y);
      ctx.lineTo(x + width / 2 + offsetX, y + height * 0.6);
      ctx.lineWidth = 3;
      ctx.strokeStyle = highlightGradient;
      ctx.stroke();
    }
  }

  /**
   * Draw short hair
   */
  private drawShortHair(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
    const gradient = ctx.createRadialGradient(x + width / 2, y + height / 2, 0, x + width / 2, y + height / 2, width / 2);
    gradient.addColorStop(0, '#2C1810');
    gradient.addColorStop(1, '#1A0F08');

    // Draw textured short hair
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Add texture
    ctx.globalAlpha = 0.4;
    for (let i = 0; i < 200; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * width / 2;
      const px = x + width / 2 + Math.cos(angle) * radius;
      const py = y + height / 2 + Math.sin(angle) * radius;
      
      ctx.fillStyle = Math.random() > 0.5 ? '#3D2817' : '#1A0F08';
      ctx.fillRect(px, py, 2, 2);
    }
  }

  /**
   * Draw bob cut
   */
  private drawBobCut(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
    const gradient = ctx.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, '#2C1810');
    gradient.addColorStop(1, '#3D2817');

    // Draw bob shape
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(x + width * 0.1, y);
    ctx.quadraticCurveTo(x + width / 2, y - height * 0.2, x + width * 0.9, y);
    ctx.lineTo(x + width * 0.9, y + height);
    ctx.quadraticCurveTo(x + width / 2, y + height * 1.1, x + width * 0.1, y + height);
    ctx.closePath();
    ctx.fill();

    // Add strands
    ctx.globalAlpha = 0.6;
    for (let i = 0; i < 30; i++) {
      const offsetX = (i / 30) * width;
      ctx.beginPath();
      ctx.moveTo(x + offsetX, y);
      ctx.lineTo(x + offsetX + (Math.random() - 0.5) * 20, y + height);
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#2C1810';
      ctx.stroke();
    }
  }

  /**
   * Draw pompadour
   */
  private drawPompadour(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
    const gradient = ctx.createLinearGradient(x, y - height * 0.3, x, y + height);
    gradient.addColorStop(0, '#2C1810');
    gradient.addColorStop(0.5, '#3D2817');
    gradient.addColorStop(1, '#2C1810');

    // Draw tall pompadour
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(x + width * 0.2, y + height);
    ctx.quadraticCurveTo(x + width / 2, y - height * 0.5, x + width * 0.8, y + height);
    ctx.lineTo(x + width * 0.8, y + height * 0.5);
    ctx.quadraticCurveTo(x + width / 2, y + height * 0.3, x + width * 0.2, y + height * 0.5);
    ctx.closePath();
    ctx.fill();

    // Add shine
    ctx.globalAlpha = 0.4;
    const shineGradient = ctx.createLinearGradient(x, y - height * 0.3, x, y + height * 0.3);
    shineGradient.addColorStop(0, '#6B5444');
    shineGradient.addColorStop(1, 'transparent');
    ctx.fillStyle = shineGradient;
    ctx.fillRect(x + width * 0.3, y - height * 0.4, width * 0.4, height * 0.6);
  }

  /**
   * Draw man bun
   */
  private drawManBun(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
    // Draw hair pulled back
    const gradient = ctx.createLinearGradient(x, y, x + width, y);
    gradient.addColorStop(0, '#2C1810');
    gradient.addColorStop(0.5, '#3D2817');
    gradient.addColorStop(1, '#2C1810');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(x + width / 2, y + height * 0.3, width / 2, height * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Draw bun at back
    ctx.globalAlpha = 0.8;
    const bunGradient = ctx.createRadialGradient(x + width * 0.8, y, 0, x + width * 0.8, y, width * 0.15);
    bunGradient.addColorStop(0, '#3D2817');
    bunGradient.addColorStop(1, '#2C1810');
    ctx.fillStyle = bunGradient;
    ctx.beginPath();
    ctx.arc(x + width * 0.8, y, width * 0.15, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Draw beach waves
   */
  private drawBeachWaves(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
    const gradient = ctx.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, '#6B4423');
    gradient.addColorStop(0.5, '#8B6B47');
    gradient.addColorStop(1, '#6B4423');

    // Draw wavy hair
    for (let i = 0; i < 40; i++) {
      const offsetX = (i / 40) * width;
      
      ctx.beginPath();
      ctx.moveTo(x + offsetX, y);
      
      // Create wave pattern
      let currentY = y;
      for (let j = 0; j < 5; j++) {
        const waveX = offsetX + (j % 2 === 0 ? 10 : -10);
        currentY += height / 5;
        ctx.quadraticCurveTo(x + waveX, currentY - height / 10, x + offsetX, currentY);
      }
      
      ctx.lineWidth = 6 + Math.random() * 4;
      ctx.strokeStyle = gradient;
      ctx.globalAlpha = 0.7 + Math.random() * 0.3;
      ctx.stroke();
    }

    // Add highlights for sun-kissed look
    ctx.globalAlpha = 0.3;
    const highlightGradient = ctx.createLinearGradient(x, y, x, y + height * 0.5);
    highlightGradient.addColorStop(0, '#D4A76A');
    highlightGradient.addColorStop(1, 'transparent');
    
    for (let i = 0; i < 15; i++) {
      const offsetX = (Math.random()) * width;
      ctx.beginPath();
      ctx.moveTo(x + offsetX, y);
      ctx.lineTo(x + offsetX + (Math.random() - 0.5) * 20, y + height * 0.5);
      ctx.lineWidth = 4;
      ctx.strokeStyle = highlightGradient;
      ctx.stroke();
    }
  }

  /**
   * Draw default hair style
   */
  private drawDefaultHair(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
    const gradient = ctx.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, '#2C1810');
    gradient.addColorStop(1, '#1A0F08');

    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, height);

    // Add basic texture
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < 30; i++) {
      const offsetX = (i / 30) * width;
      ctx.beginPath();
      ctx.moveTo(x + offsetX, y);
      ctx.lineTo(x + offsetX, y + height);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#3D2817';
      ctx.stroke();
    }
  }

  /**
   * Apply facial glow effect
   */
  async applyFacialGlow(
    imageData: string,
    intensity: number,
    faceResult: FaceDetectionResult
  ): Promise<string> {
    if (!this.canvas || !this.ctx) return imageData;

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        this.canvas!.width = img.width;
        this.canvas!.height = img.height;

        // Draw original image
        this.ctx!.drawImage(img, 0, 0);

        if (faceResult.detected) {
          this.drawFacialGlow(intensity, faceResult);
        }

        resolve(this.canvas!.toDataURL('image/png'));
      };
      img.src = imageData;
    });
  }

  /**
   * Draw facial glow overlay
   */
  private drawFacialGlow(intensity: number, faceResult: FaceDetectionResult): void {
    if (!this.ctx || !this.canvas) return;

    const { boundingBox } = faceResult;
    const ctx = this.ctx;

    ctx.save();
    
    // Create radial gradient for glow
    const centerX = boundingBox.x + boundingBox.width / 2;
    const centerY = boundingBox.y + boundingBox.height / 2;
    const radius = Math.max(boundingBox.width, boundingBox.height) / 2;

    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    gradient.addColorStop(0, `rgba(255, 235, 205, ${intensity / 200})`);
    gradient.addColorStop(0.5, `rgba(255, 220, 180, ${intensity / 300})`);
    gradient.addColorStop(1, 'transparent');

    ctx.fillStyle = gradient;
    ctx.fillRect(boundingBox.x, boundingBox.y, boundingBox.width, boundingBox.height);

    // Add highlights on cheeks
    ctx.globalAlpha = intensity / 150;
    const highlightGradient = ctx.createRadialGradient(
      centerX - boundingBox.width * 0.2, 
      centerY + boundingBox.height * 0.1, 
      0,
      centerX - boundingBox.width * 0.2, 
      centerY + boundingBox.height * 0.1, 
      boundingBox.width * 0.15
    );
    highlightGradient.addColorStop(0, 'rgba(255, 182, 193, 0.4)');
    highlightGradient.addColorStop(1, 'transparent');
    
    ctx.fillStyle = highlightGradient;
    ctx.beginPath();
    ctx.arc(centerX - boundingBox.width * 0.2, centerY + boundingBox.height * 0.1, boundingBox.width * 0.15, 0, Math.PI * 2);
    ctx.fill();

    // Right cheek
    ctx.beginPath();
    ctx.arc(centerX + boundingBox.width * 0.2, centerY + boundingBox.height * 0.1, boundingBox.width * 0.15, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * Apply makeup effect
   */
  async applyMakeup(
    imageData: string,
    makeupStyle: string,
    intensity: number,
    faceResult: FaceDetectionResult
  ): Promise<string> {
    if (!this.canvas || !this.ctx) return imageData;

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        this.canvas!.width = img.width;
        this.canvas!.height = img.height;

        // Draw original image
        this.ctx!.drawImage(img, 0, 0);

        if (faceResult.detected) {
          this.drawMakeup(makeupStyle, intensity, faceResult);
        }

        resolve(this.canvas!.toDataURL('image/png'));
      };
      img.src = imageData;
    });
  }

  /**
   * Draw makeup overlays
   */
  private drawMakeup(makeupStyle: string, intensity: number, faceResult: FaceDetectionResult): void {
    if (!this.ctx) return;

    const { boundingBox } = faceResult;
    const ctx = this.ctx;

    ctx.save();

    const centerX = boundingBox.x + boundingBox.width / 2;
    const centerY = boundingBox.y + boundingBox.height / 2;

    // Eye makeup
    ctx.globalAlpha = intensity / 150;
    const eyeShadowColor = makeupStyle === 'Party Glam' ? 'rgba(138, 43, 226, 0.4)' : 'rgba(139, 69, 19, 0.3)';
    
    ctx.fillStyle = eyeShadowColor;
    // Left eye
    ctx.beginPath();
    ctx.ellipse(centerX - boundingBox.width * 0.15, centerY - boundingBox.height * 0.15, boundingBox.width * 0.08, boundingBox.height * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Right eye
    ctx.beginPath();
    ctx.ellipse(centerX + boundingBox.width * 0.15, centerY - boundingBox.height * 0.15, boundingBox.width * 0.08, boundingBox.height * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();

    // Lip color
    const lipColor = makeupStyle === 'Bold Red Lips' ? 'rgba(220, 20, 60, 0.6)' : 'rgba(199, 120, 114, 0.5)';
    ctx.fillStyle = lipColor;
    ctx.globalAlpha = intensity / 120;
    
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + boundingBox.height * 0.25, boundingBox.width * 0.12, boundingBox.height * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  dispose(): void {
    this.canvas = null;
    this.ctx = null;
  }
}

export const realARRenderer = new RealARRenderer();