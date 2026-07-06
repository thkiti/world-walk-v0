import type { LatLng, MovementSource } from "@/lib/types";

export type StreetViewDebugState = {
  panoramaPanoId: string | null;
  panoramaLatLng: LatLng | null;
  lastPanoramaLookupStatus: string;
  lastAppliedPosition: LatLng | null;
};

export type WalkDebugState = {
  movementSource: MovementSource;
  elapsedSeconds: number;
  totalDistanceMeters: number;
  breadcrumbCount: number;
  lastStepDeltaMeters: number;
  streetView: StreetViewDebugState;
};

export const EMPTY_STREET_VIEW_DEBUG: StreetViewDebugState = {
  panoramaPanoId: null,
  panoramaLatLng: null,
  lastPanoramaLookupStatus: "IDLE",
  lastAppliedPosition: null,
};
