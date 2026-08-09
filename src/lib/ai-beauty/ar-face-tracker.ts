/**
 * AR Face Tracker
 * 
 * Uses MediaPipe Face Mesh to track facial landmarks in real-time for AR overlay.
 * Provides continuous face detection and landmark updates for smooth AR experiences.
 * 
 * @see Design Document: Phase 6 - AR Virtual Makeover
 * @see Requirements: 3.1, 3.2, 3.3
 */

import { FaceMesh } from '@mediapipe/face_mesh';
import type { Results, NormalizedLandmarkList } from '@mediapipe/face_mesh';

/**
 * Face tracking data
 */
export interface FaceTrackingData {
  /** Normalized 3D landmarks (468 points, values 0-1) */
  landmarks: NormalizedLandmarkList;
  
  /** Face position in screen coordinates */
  position: { x: number; y: number };
  
  /** Face rotation angles (degrees) */
  rotation: { pitch: number; yaw: number; roll: number };
  
  /** Face scale factor */
  scale: number;
  
  /** Timestamp of tracking update */
  timestamp: number;
}

/**
 * AR Face Tracker
 * 
 * Manages MediaPipe Face Mesh model for real-time face tracking.
 * Provides landmark detection and face transformation data for AR overlays.
 */
export class ARFaceTracker {
  private faceMesh: FaceMesh | null = null;
  private isModelLoaded = false;
  private lastUpdateTime = 0;
  private onTrackingUpdate?: (data: FaceTrackingData) => void;
  
  /**
   * Load MediaPipe Face Mesh model
   * 
   * @param onProgress - Optional progress callback (0-100)
   * @returns Promise that resolves when model is loaded
   */
  async loadModel(onProgress?: (progress: number) => void): Promise<void> {
    try {
      onProgress?.(0);
      
      this.faceMesh = new FaceMesh({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
        },
      });
      
      onProgress?.(30);
      
      // Configure Face Mesh
      this.faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      
      onProgress?.(60);
      
      // Set up results callback
      this.faceMesh.onResults((results: Results) => {
        this.handleResults(results);
      });
      
      onProgress?.(100);
      this.isModelLoaded = true;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to load MediaPipe Face Mesh model: ${errorMessage}`);
    }
  }
  
  /**
   * Check if model is loaded and ready
   */
  isReady(): boolean {
    return this.isModelLoaded && this.faceMesh !== null;
  }
  
  /**
   * Start tracking face in video stream
   * 
   * @param videoElement - Video element with camera stream
   * @param onUpdate - Callback for tracking updates
   */
  async startTracking(
    videoElement: HTMLVideoElement,
    onUpdate: (data: FaceTrackingData) => void
  ): Promise<void> {
    if (!this.isReady()) {
      throw new Error('Model not loaded. Call loadModel() first.');
    }
    
    this.onTrackingUpdate = onUpdate;
    
    // Start continuous tracking
    const trackFrame = async () => {
      if (!this.faceMesh || !videoElement) return;
      
      try {
        await this.faceMesh.send({ image: videoElement });
        
        // Continue tracking if still active
        if (this.onTrackingUpdate) {
          requestAnimationFrame(trackFrame);
        }
      } catch (error) {
        console.error('Face tracking error:', error);
      }
    };
    
    // Start tracking loop
    requestAnimationFrame(trackFrame);
  }
  
  /**
   * Stop tracking
   */
  stopTracking(): void {
    this.onTrackingUpdate = undefined;
  }
  
  /**
   * Handle MediaPipe Face Mesh results
   * 
   * @param results - MediaPipe detection results
   */
  private handleResults(results: Results): void {
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
      return; // No face detected
    }
    
    const now = performance.now();
    const landmarks = results.multiFaceLandmarks[0];
    
    // Calculate face position (center of face)
    const noseTip = landmarks[1]; // Nose tip landmark
    const position = {
      x: noseTip.x,
      y: noseTip.y,
    };
    
    // Calculate face rotation (simplified estimation)
    const rotation = this.calculateFaceRotation(landmarks);
    
    // Calculate face scale (distance between eyes)
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    const eyeDistance = Math.sqrt(
      Math.pow(rightEye.x - leftEye.x, 2) + 
      Math.pow(rightEye.y - leftEye.y, 2)
    );
    const scale = eyeDistance / 0.15; // Normalize to typical eye distance
    
    // Check latency (should be < 50ms per Requirement 3.3)
    const latency = now - this.lastUpdateTime;
    if (latency > 50 && this.lastUpdateTime > 0) {
      console.warn(`Face tracking latency: ${latency.toFixed(1)}ms (target: <50ms)`);
    }
    this.lastUpdateTime = now;
    
    // Send tracking update
    if (this.onTrackingUpdate) {
      this.onTrackingUpdate({
        landmarks,
        position,
        rotation,
        scale,
        timestamp: now,
      });
    }
  }
  
  /**
   * Calculate face rotation angles from landmarks
   * 
   * @param landmarks - Face mesh landmarks
   * @returns Rotation angles in degrees
   */
  private calculateFaceRotation(landmarks: NormalizedLandmarkList): {
    pitch: number;
    yaw: number;
    roll: number;
  } {
    // Simplified rotation estimation using key landmarks
    const noseTip = landmarks[1];
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    const chin = landmarks[152];
    const forehead = landmarks[10];
    
    // Yaw (left-right rotation)
    const faceWidth = Math.abs(rightEye.x - leftEye.x);
    const noseBias = (noseTip.x - (leftEye.x + rightEye.x) / 2) / faceWidth;
    const yaw = noseBias * 45; // Scale to approximately -45 to +45 degrees
    
    // Pitch (up-down rotation)
    const faceHeight = Math.abs(forehead.y - chin.y);
    const nosePitch = (noseTip.y - (forehead.y + chin.y) / 2) / faceHeight;
    const pitch = nosePitch * 30; // Scale to approximately -30 to +30 degrees
    
    // Roll (tilt rotation)
    const eyeSlope = (rightEye.y - leftEye.y) / (rightEye.x - leftEye.x);
    const roll = Math.atan(eyeSlope) * (180 / Math.PI);
    
    return { pitch, yaw, roll };
  }
  
  /**
   * Dispose of the tracker and free resources
   */
  dispose(): void {
    this.stopTracking();
    
    if (this.faceMesh) {
      this.faceMesh.close();
      this.faceMesh = null;
    }
    
    this.isModelLoaded = false;
  }
}
