/**
 * MediaPipe Face Landmarker Engine
 * 468 landmarks via @mediapipe/tasks-vision (Turbopack-compatible ESM)
 */

import { KalmanFilter3D } from './kalman-filter';

/** MediaPipe landmark indices (Face Mesh topology) */
export const FACE_LANDMARKS = {
  forehead: 10,
  chin: 152,
  noseTip: 1,
  leftEyeOuter: 33,
  rightEyeOuter: 263,
  leftTemple: 234,
  rightTemple: 454,
  leftEar: 127,
  rightEar: 356,
  crown: 10,
  leftEyebrow: 70,
  rightEyebrow: 300,
  leftCheek: 50,
  rightCheek: 280,
} as const;

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface FaceAnchorPoints {
  foreheadCenter: Point3D;
  leftTemple: Point3D;
  rightTemple: Point3D;
  crown: Point3D;
  leftEar: Point3D;
  rightEar: Point3D;
}

export interface HeadPose {
  yaw: number;
  pitch: number;
  roll: number;
}

export interface FaceMeshResult {
  detected: boolean;
  confidence: number;
  landmarks: Point3D[];
  pixelLandmarks: Point3D[];
  anchors: FaceAnchorPoints;
  headPose: HeadPose;
  faceWidth: number;
  faceHeight: number;
  faceShape: 'oval' | 'round' | 'square' | 'heart' | 'long';
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  timestamp: number;
}

type FaceLandmarkerInstance = {
  detectForVideo: (
    video: HTMLVideoElement,
    timestamp: number
  ) => { faceLandmarks: Array<Array<{ x: number; y: number; z?: number }>> };
  close: () => void;
};

const WASM_CDN =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.17/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

const EMPTY_RESULT: FaceMeshResult = {
  detected: false,
  confidence: 0,
  landmarks: [],
  pixelLandmarks: [],
  anchors: {
    foreheadCenter: { x: 0, y: 0, z: 0 },
    leftTemple: { x: 0, y: 0, z: 0 },
    rightTemple: { x: 0, y: 0, z: 0 },
    crown: { x: 0, y: 0, z: 0 },
    leftEar: { x: 0, y: 0, z: 0 },
    rightEar: { x: 0, y: 0, z: 0 },
  },
  headPose: { yaw: 0, pitch: 0, roll: 0 },
  faceWidth: 0,
  faceHeight: 0,
  faceShape: 'oval',
  quality: 'poor',
  timestamp: 0,
};

export class MediaPipeFaceEngine {
  private landmarker: FaceLandmarkerInstance | null = null;
  private initialized = false;
  private latestResult: FaceMeshResult = { ...EMPTY_RESULT };
  private anchorFilters = {
    forehead: new KalmanFilter3D(),
    leftTemple: new KalmanFilter3D(),
    rightTemple: new KalmanFilter3D(),
    crown: new KalmanFilter3D(),
    leftEar: new KalmanFilter3D(),
    rightEar: new KalmanFilter3D(),
  };
  private poseFilter = {
    yaw: new KalmanFilter3D(0.02, 0.15),
    pitch: new KalmanFilter3D(0.02, 0.15),
    roll: new KalmanFilter3D(0.02, 0.15),
  };
  private frameWidth = 0;
  private frameHeight = 0;
  private consecutiveDetections = 0;
  private lastVideoTimestamp = -1;

  async initialize(): Promise<boolean> {
    if (this.initialized) return true;
    if (typeof window === 'undefined') return false;

    try {
      const { FaceLandmarker, FilesetResolver } = await import(
        '@mediapipe/tasks-vision'
      );

      const wasmFileset = await FilesetResolver.forVisionTasks(WASM_CDN);

      this.landmarker = await FaceLandmarker.createFromOptions(wasmFileset, {
        baseOptions: {
          modelAssetPath: MODEL_URL,
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numFaces: 1,
        minFaceDetectionConfidence: 0.5,
        minFacePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      this.initialized = true;
      console.log('✅ MediaPipe Face Landmarker initialized (468 landmarks)');
      return true;
    } catch (error) {
      console.error('❌ MediaPipe init failed:', error);
      return false;
    }
  }

  isReady(): boolean {
    return this.initialized;
  }

  getLatestResult(): FaceMeshResult {
    return this.latestResult;
  }

  async detectFrame(video: HTMLVideoElement): Promise<FaceMeshResult> {
    return this.detectFrameSync(video);
  }

  detectFrameSync(video: HTMLVideoElement): FaceMeshResult {
    if (!this.landmarker || !this.initialized) return { ...EMPTY_RESULT };
    if (video.videoWidth === 0 || video.videoHeight === 0) return { ...EMPTY_RESULT };

    this.frameWidth = video.videoWidth;
    this.frameHeight = video.videoHeight;

    try {
      // MediaPipe requires strictly monotonically increasing timestamps (ms)
      this.lastVideoTimestamp = Math.max(this.lastVideoTimestamp + 1, performance.now());

      const results = this.landmarker.detectForVideo(video, this.lastVideoTimestamp);
      const result = this.processLandmarks(results.faceLandmarks);

      this.latestResult = result;
      if (result.detected) {
        this.consecutiveDetections = Math.min(this.consecutiveDetections + 1, 30);
      } else {
        this.consecutiveDetections = 0;
      }

      return result;
    } catch (error) {
      console.error('Face detection frame error:', error);
      return { ...EMPTY_RESULT };
    }
  }

  getAccuracyPercent(result: FaceMeshResult): number {
    if (!result.detected) return 0;
    
    // Calculate stability bonus from consecutive detections
    const stabilityBonus = Math.min(this.consecutiveDetections * 3, 25);
    
    // Base confidence from landmarks quality
    const baseConfidence = result.confidence * 70;
    
    // Total with stability
    const totalConfidence = Math.min(99, Math.round(baseConfidence + stabilityBonus));
    
    console.log(`Face tracking: base=${baseConfidence.toFixed(0)}% + stability=${stabilityBonus}% = ${totalConfidence}%`);
    
    return totalConfidence;
  }

  private processLandmarks(
    faceLandmarks: Array<Array<{ x: number; y: number; z?: number }>>
  ): FaceMeshResult {
    if (!faceLandmarks?.length || !faceLandmarks[0]?.length) {
      return { ...EMPTY_RESULT, timestamp: performance.now() };
    }

    const raw = faceLandmarks[0];
    const w = this.frameWidth || 640;
    const h = this.frameHeight || 480;

    const landmarks: Point3D[] = raw.map((lm) => ({
      x: lm.x,
      y: lm.y,
      z: lm.z ?? 0,
    }));

    const pixelLandmarks = landmarks.map((lm) => ({
      x: lm.x * w,
      y: lm.y * h,
      z: lm.z,
    }));

    const getLm = (idx: number) => landmarks[idx];
    const forehead = getLm(FACE_LANDMARKS.forehead);
    const leftTemple = getLm(FACE_LANDMARKS.leftTemple);
    const rightTemple = getLm(FACE_LANDMARKS.rightTemple);
    const leftEar = getLm(FACE_LANDMARKS.leftEar);
    const rightEar = getLm(FACE_LANDMARKS.rightEar);
    const chin = getLm(FACE_LANDMARKS.chin);

    const crown = {
      x: forehead.x,
      y: Math.max(0, forehead.y - (chin.y - forehead.y) * 0.35),
      z: forehead.z,
    };

    const anchors: FaceAnchorPoints = {
      foreheadCenter: this.anchorFilters.forehead.update(forehead.x, forehead.y, forehead.z),
      leftTemple: this.anchorFilters.leftTemple.update(leftTemple.x, leftTemple.y, leftTemple.z),
      rightTemple: this.anchorFilters.rightTemple.update(rightTemple.x, rightTemple.y, rightTemple.z),
      crown: this.anchorFilters.crown.update(crown.x, crown.y, crown.z),
      leftEar: this.anchorFilters.leftEar.update(leftEar.x, leftEar.y, leftEar.z),
      rightEar: this.anchorFilters.rightEar.update(rightEar.x, rightEar.y, rightEar.z),
    };

    const headPose = this.calculateHeadPose(landmarks);
    const faceWidth = Math.abs(rightTemple.x - leftTemple.x) * w;
    const faceHeight = Math.abs(chin.y - forehead.y) * h;
    const faceShape = this.detectFaceShape(landmarks);
    const confidence = this.estimateConfidence(landmarks, faceWidth, w);

    return {
      detected: confidence > 0.35 && landmarks.length >= 468,
      confidence,
      landmarks,
      pixelLandmarks,
      anchors,
      headPose,
      faceWidth,
      faceHeight,
      faceShape,
      quality:
        confidence > 0.85 ? 'excellent' :
        confidence > 0.7 ? 'good' :
        confidence > 0.55 ? 'fair' : 'poor',
      timestamp: performance.now(),
    };
  }

  private calculateHeadPose(landmarks: Point3D[]): HeadPose {
    const nose = landmarks[FACE_LANDMARKS.noseTip];
    const leftEye = landmarks[FACE_LANDMARKS.leftEyeOuter];
    const rightEye = landmarks[FACE_LANDMARKS.rightEyeOuter];
    const forehead = landmarks[FACE_LANDMARKS.forehead];
    const chin = landmarks[FACE_LANDMARKS.chin];

    const faceWidth = Math.abs(rightEye.x - leftEye.x) || 0.001;
    const noseBias = (nose.x - (leftEye.x + rightEye.x) / 2) / faceWidth;
    const yaw = this.poseFilter.yaw.update(noseBias * 50, 0, 0).x;

    const faceHeight = Math.abs(forehead.y - chin.y) || 0.001;
    const nosePitch = (nose.y - (forehead.y + chin.y) / 2) / faceHeight;
    const pitch = this.poseFilter.pitch.update(nosePitch * 40, 0, 0).x;

    const eyeSlope = (rightEye.y - leftEye.y) / (rightEye.x - leftEye.x || 0.001);
    const roll = this.poseFilter.roll.update(Math.atan(eyeSlope) * (180 / Math.PI), 0, 0).x;

    return { yaw, pitch, roll };
  }

  private detectFaceShape(landmarks: Point3D[]): FaceMeshResult['faceShape'] {
    const leftCheek = landmarks[FACE_LANDMARKS.leftCheek];
    const rightCheek = landmarks[FACE_LANDMARKS.rightCheek];
    const forehead = landmarks[FACE_LANDMARKS.forehead];
    const chin = landmarks[FACE_LANDMARKS.chin];

    const width = Math.abs(rightCheek.x - leftCheek.x);
    const height = Math.abs(chin.y - forehead.y);
    const ratio = height / (width || 0.001);

    if (ratio > 1.45) return 'long';
    if (ratio < 1.1) return 'round';
    if (ratio > 1.25) return 'oval';
    if (width > height * 0.95) return 'square';
    return 'heart';
  }

  private estimateConfidence(landmarks: Point3D[], faceWidth: number, frameWidth: number): number {
    // Size score: face should be reasonably sized in frame
    const sizeScore = Math.min(1, faceWidth / (frameWidth * 0.2));
    
    // Visibility score: landmarks should be within frame
    const visibleLandmarks = landmarks.filter(
      (l) => l.x > 0.05 && l.x < 0.95 && l.y > 0.05 && l.y < 0.95
    ).length;
    const visibilityScore = visibleLandmarks / landmarks.length;
    
    // Depth consistency: z values should be reasonable
    const zValues = landmarks.map(l => l.z).filter(z => Math.abs(z) < 1);
    const depthScore = zValues.length / landmarks.length;
    
    // Combined confidence
    const confidence = (sizeScore * 0.35 + visibilityScore * 0.45 + depthScore * 0.2);
    
    return Math.min(0.99, Math.max(0.1, confidence));
  }

  toMirroredPixel(point: Point3D, width: number, height: number): Point3D {
    return {
      x: (1 - point.x) * width,
      y: point.y * height,
      z: point.z,
    };
  }

  dispose(): void {
    this.landmarker?.close();
    this.landmarker = null;
    this.initialized = false;
    Object.values(this.anchorFilters).forEach((f) => f.reset());
    this.consecutiveDetections = 0;
    this.lastVideoTimestamp = -1;
  }
}

export const mediaPipeFaceEngine = new MediaPipeFaceEngine();
