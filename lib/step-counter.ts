import { devLog } from "@/lib/dev-log";

export const DEFAULT_STRIDE_LENGTH_METERS = 0.75;

type SensorReading = {
  x?: number | null;
  y?: number | null;
  z?: number | null;
};

type MotionSensor = {
  start: () => void;
  stop: () => void;
  addEventListener: (
    type: "reading" | "error",
    listener: (event: Event) => void
  ) => void;
  removeEventListener: (
    type: "reading" | "error",
    listener: (event: Event) => void
  ) => void;
} & SensorReading;

type SensorConstructor = new (options?: { frequency?: number }) => MotionSensor;

function getMotionSensorClass(): SensorConstructor | null {
  if (typeof window === "undefined") return null;

  const linear = (window as Window & { LinearAccelerationSensor?: SensorConstructor })
    .LinearAccelerationSensor;
  if (linear) return linear;

  const accelerometer = (window as Window & { Accelerometer?: SensorConstructor })
    .Accelerometer;
  if (accelerometer) return accelerometer;

  return null;
}

export function isPhoneStepCounterSupported(): boolean {
  return getMotionSensorClass() !== null;
}

async function requestAccelerometerPermission(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.permissions?.query) {
    return true;
  }

  try {
    const result = await navigator.permissions.query({
      name: "accelerometer" as PermissionName,
    });
    return result.state !== "denied";
  } catch {
    return true;
  }
}

export class PhoneStepCounter {
  private sensor: MotionSensor | null = null;
  private steps = 0;
  private lastStepTime = 0;
  private lastMagnitude = 0;
  private readingHandler: (() => void) | null = null;

  get stepCount(): number {
    return this.steps;
  }

  resetSteps(): void {
    this.steps = 0;
    this.lastStepTime = 0;
    this.lastMagnitude = 0;
  }

  async start(onStep: (steps: number) => void): Promise<boolean> {
    if (this.sensor) {
      return true;
    }

    const SensorClass = getMotionSensorClass();
    if (!SensorClass) {
      return false;
    }

    const permitted = await requestAccelerometerPermission();
    if (!permitted) {
      return false;
    }

    try {
      const sensor = new SensorClass({ frequency: 60 });
      this.readingHandler = () => {
        const x = sensor.x ?? 0;
        const y = sensor.y ?? 0;
        const z = sensor.z ?? 0;
        const magnitude = Math.sqrt(x * x + y * y + z * z);
        const now = Date.now();

        if (this.detectStep(magnitude, now)) {
          this.steps += 1;
          onStep(this.steps);
        }
      };

      sensor.addEventListener("reading", this.readingHandler);
      sensor.start();
      this.sensor = sensor;
      return true;
    } catch {
      this.sensor = null;
      return false;
    }
  }

  stop(): void {
    if (!this.sensor) return;

    if (this.readingHandler) {
      this.sensor.removeEventListener("reading", this.readingHandler);
      this.readingHandler = null;
    }

    try {
      this.sensor.stop();
    } catch {
      // Ignore sensor stop errors.
    }

    this.sensor = null;
  }

  private detectStep(magnitude: number, now: number): boolean {
    const minIntervalMs = 350;
    const threshold = 1.4;
    const rise = magnitude - this.lastMagnitude;
    this.lastMagnitude = magnitude;

    if (
      magnitude > threshold &&
      rise > 0.45 &&
      now - this.lastStepTime > minIntervalMs
    ) {
      this.lastStepTime = now;
      return true;
    }

    return false;
  }
}

export function stepsToDistanceMeters(
  steps: number,
  strideLengthMeters: number
): number {
  return steps * strideLengthMeters;
}

export function estimatePaceKmh(
  distanceMeters: number,
  elapsedSeconds: number
): number {
  if (elapsedSeconds <= 0 || distanceMeters <= 0) return 0;
  return distanceMeters / 1000 / (elapsedSeconds / 3600);
}

export function logPhoneSteps(
  steps: number,
  deltaSteps: number,
  distanceMeters: number
): void {
  devLog("[PhoneSteps]", { steps, deltaSteps, distanceMeters });
}
