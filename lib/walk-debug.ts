import type { LatLng, MovementSource } from "@/lib/types";

export type StreetViewDebugState = {
  panoramaPanoId: string | null;
  panoramaLatLng: LatLng | null;
  lastPanoramaLookupStatus: string;
  lastAppliedRouteIndex: number | null;
  lastAppliedDistanceMeters: number;
};

export type WalkDebugState = {
  movementSource: MovementSource;
  elapsedSeconds: number;
  pathDistanceMeters: number;
  currentRouteIndex: number;
  nextRouteIndex: number;
  lastStepDeltaMeters: number;
  streetView: StreetViewDebugState;
};

export const EMPTY_STREET_VIEW_DEBUG: StreetViewDebugState = {
  panoramaPanoId: null,
  panoramaLatLng: null,
  lastPanoramaLookupStatus: "IDLE",
  lastAppliedRouteIndex: null,
  lastAppliedDistanceMeters: 0,
};
