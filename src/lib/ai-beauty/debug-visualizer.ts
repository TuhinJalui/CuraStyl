/**
 * Debug Visualizer for 3D Hair AR System
 * 
 * Helps debug face detection, positioning, and rendering issues
 */

import { FaceDetectionResult } from './real-face-detector';
import * as THREE from 'three';

export class DebugVisualizer {
  private debugCanvas: HTMLCanvasElement | null = null;
  private debugContext: CanvasRenderingContext2D | null = null;

  /**
   * Enable debug overlay on video/canvas
   */
  enableDebugOverlay(targetCanvas: HTMLCanvasElement): void {
    this.debugCanvas = targetCanvas;
    this.debugContext = targetCanvas.getContext('2d', { alpha: true });
  }

  /**
   * Draw face detection debug info
   */
  drawFaceDetection(
    faceResult: FaceDetectionResult,
    canvas: HTMLCanvasElement
  ): void {
    if (!faceResult.detected) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();

    // Draw bounding box
    ctx.strokeStyle = faceResult.quality === 'excellent' ? '#00ff00' : 
                      faceResult.quality === 'good' ? '#ffff00' :
                      faceResult.quality === 'fair' ? '#ff9900' : '#ff0000';
    ctx.lineWidth = 3;
    ctx.strokeRect(
      faceResult.boundingBox.x,
      faceResult.boundingBox.y,
      faceResult.boundingBox.width,
      faceResult.boundingBox.height
    );

    // Draw center crosshair
    const centerX = faceResult.boundingBox.x + faceResult.boundingBox.width / 2;
    const centerY = faceResult.boundingBox.y + faceResult.boundingBox.height / 2;
    
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX - 10, centerY);
    ctx.lineTo(centerX + 10, centerY);
    ctx.moveTo(centerX, centerY - 10);
    ctx.lineTo(centerX, centerY + 10);
    ctx.stroke();

    // Draw landmarks
    ctx.fillStyle = '#00ff00';
    faceResult.landmarks.forEach(landmark => {
      ctx.beginPath();
      ctx.arc(landmark.x, landmark.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw face angle indicator
    const angleLineLength = 50;
    const angleRad = faceResult.faceMetrics.faceAngle * (Math.PI / 180);
    const angleEndX = centerX + Math.cos(angleRad) * angleLineLength;
    const angleEndY = centerY + Math.sin(angleRad) * angleLineLength;
    
    ctx.strokeStyle = '#ff00ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(angleEndX, angleEndY);
    ctx.stroke();

    // Draw info text
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.font = '14px monospace';
    
    const infoLines = [
      `Confidence: ${(faceResult.confidence * 100).toFixed(1)}%`,
      `Quality: ${faceResult.quality}`,
      `Angle: ${faceResult.faceMetrics.faceAngle.toFixed(1)}°`,
      `Face Area: ${faceResult.faceMetrics.faceArea.toFixed(0)}px²`,
      `Lighting: ${(faceResult.faceMetrics.lighting * 100).toFixed(0)}%`
    ];

    let textY = faceResult.boundingBox.y - 80;
    infoLines.forEach(line => {
      ctx.strokeText(line, faceResult.boundingBox.x, textY);
      ctx.fillText(line, faceResult.boundingBox.x, textY);
      textY += 16;
    });

    ctx.restore();
  }

  /**
   * Draw 3D coordinate system axes
   */
  draw3DAxes(
    scene: THREE.Scene,
    position: THREE.Vector3,
    size: number = 0.5
  ): void {
    // Remove old axes
    const oldAxes = scene.getObjectByName('debug_axes');
    if (oldAxes) scene.remove(oldAxes);

    const axesGroup = new THREE.Group();
    axesGroup.name = 'debug_axes';

    // X axis (red)
    const xGeometry = new THREE.BufferGeometry().setFromPoints([
      position,
      new THREE.Vector3(position.x + size, position.y, position.z)
    ]);
    const xLine = new THREE.Line(
      xGeometry,
      new THREE.LineBasicMaterial({ color: 0xff0000 })
    );
    axesGroup.add(xLine);

    // Y axis (green)
    const yGeometry = new THREE.BufferGeometry().setFromPoints([
      position,
      new THREE.Vector3(position.x, position.y + size, position.z)
    ]);
    const yLine = new THREE.Line(
      yGeometry,
      new THREE.LineBasicMaterial({ color: 0x00ff00 })
    );
    axesGroup.add(yLine);

    // Z axis (blue)
    const zGeometry = new THREE.BufferGeometry().setFromPoints([
      position,
      new THREE.Vector3(position.x, position.y, position.z + size)
    ]);
    const zLine = new THREE.Line(
      zGeometry,
      new THREE.LineBasicMaterial({ color: 0x0000ff })
    );
    axesGroup.add(zLine);

    scene.add(axesGroup);
  }

  /**
   * Log detailed positioning info
   */
  logPositioningInfo(
    faceResult: FaceDetectionResult,
    hairPosition: THREE.Vector3,
    hairScale: number,
    hairRotation: THREE.Euler
  ): void {
    console.group('🔍 3D Hair Positioning Debug');
    
    console.log('📦 Face Detection:');
    console.table({
      'Bounding Box X': faceResult.boundingBox.x,
      'Bounding Box Y': faceResult.boundingBox.y,
      'Width': faceResult.boundingBox.width,
      'Height': faceResult.boundingBox.height,
      'Confidence': `${(faceResult.confidence * 100).toFixed(1)}%`,
      'Quality': faceResult.quality
    });

    console.log('🎯 3D Positioning:');
    console.table({
      'World X': hairPosition.x.toFixed(4),
      'World Y': hairPosition.y.toFixed(4),
      'World Z': hairPosition.z.toFixed(4),
      'Scale': hairScale.toFixed(4),
      'Rotation X': `${(hairRotation.x * 180 / Math.PI).toFixed(2)}°`,
      'Rotation Y': `${(hairRotation.y * 180 / Math.PI).toFixed(2)}°`,
      'Rotation Z': `${(hairRotation.z * 180 / Math.PI).toFixed(2)}°`
    });

    console.log('📊 Face Metrics:');
    console.table({
      'Face Area': `${faceResult.faceMetrics.faceArea.toFixed(0)} px²`,
      'Eye Distance': `${faceResult.faceMetrics.eyeDistance.toFixed(2)} px`,
      'Face Angle': `${faceResult.faceMetrics.faceAngle.toFixed(2)}°`,
      'Lighting': `${(faceResult.faceMetrics.lighting * 100).toFixed(0)}%`
    });

    console.groupEnd();
  }

  /**
   * Draw viewport grid for alignment reference
   */
  drawViewportGrid(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;

    // Vertical lines
    for (let x = 0; x < canvas.width; x += canvas.width / 10) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y < canvas.height; y += canvas.height / 10) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Center lines
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Clear all debug overlays
   */
  clearDebug(): void {
    if (this.debugCanvas && this.debugContext) {
      this.debugContext.clearRect(0, 0, this.debugCanvas.width, this.debugCanvas.height);
    }
  }
}

export const debugVisualizer = new DebugVisualizer();
