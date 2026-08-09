/**
 * 1D Kalman filter for landmark smoothing
 */
export class KalmanFilter1D {
  private x: number;
  private p: number;
  private readonly q: number;
  private readonly r: number;

  constructor(initial = 0, processNoise = 0.01, measurementNoise = 0.1) {
    this.x = initial;
    this.p = 1;
    this.q = processNoise;
    this.r = measurementNoise;
  }

  update(measurement: number): number {
    this.p += this.q;
    const k = this.p / (this.p + this.r);
    this.x += k * (measurement - this.x);
    this.p *= 1 - k;
    return this.x;
  }

  reset(value = 0): void {
    this.x = value;
    this.p = 1;
  }
}

export class KalmanFilter3D {
  private fx: KalmanFilter1D;
  private fy: KalmanFilter1D;
  private fz: KalmanFilter1D;

  constructor(processNoise = 0.008, measurementNoise = 0.06) {
    this.fx = new KalmanFilter1D(0, processNoise, measurementNoise);
    this.fy = new KalmanFilter1D(0, processNoise, measurementNoise);
    this.fz = new KalmanFilter1D(0, processNoise, measurementNoise);
  }

  update(x: number, y: number, z: number): { x: number; y: number; z: number } {
    return {
      x: this.fx.update(x),
      y: this.fy.update(y),
      z: this.fz.update(z),
    };
  }

  reset(): void {
    this.fx.reset();
    this.fy.reset();
    this.fz.reset();
  }
}
