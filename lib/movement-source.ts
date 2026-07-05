import type { MovementSource } from "@/lib/types";

export const MOVEMENT_SOURCE_LABELS: Record<MovementSource, string> = {
  manual: "Manual Speed",
  "phone-steps": "Phone Steps (this device)",
  "remote-phone-sensor": "Remote Phone Sensor",
};

export function getMovementSourceLabel(source: MovementSource): string {
  return MOVEMENT_SOURCE_LABELS[source];
}

export function isLocalStepSource(source: MovementSource): boolean {
  return source === "phone-steps";
}

export function isRemoteStepSource(source: MovementSource): boolean {
  return source === "remote-phone-sensor";
}

export function isStepBasedSource(source: MovementSource): boolean {
  return isLocalStepSource(source) || isRemoteStepSource(source);
}
