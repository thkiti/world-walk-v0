import {
  getRoutePointIndexForDistance,
  getRouteProgress,
  INITIAL_PITCH,
} from "@/lib/geo";
import type { LatLng, StreetViewState } from "@/lib/types";

export const PANORAMA_ADVANCE_THRESHOLD_METERS = 5;

export type PathAdvanceResult = {
  pathDistanceMeters: number;
  view: StreetViewState;
  reachedEnd: boolean;
};

export function advanceAlongPath(
  points: LatLng[],
  currentDistanceMeters: number,
  totalPathMeters: number,
  deltaMeters: number
): PathAdvanceResult {
  const next = Math.min(currentDistanceMeters + deltaMeters, totalPathMeters);
  const progress = getRouteProgress(points, next);

  return {
    pathDistanceMeters: next,
    view: {
      position: progress.position,
      heading: progress.heading,
      pitch: INITIAL_PITCH,
    },
    reachedEnd: next >= totalPathMeters,
  };
}

export function getRouteIndices(
  points: LatLng[],
  pathDistanceMeters: number
): { currentIndex: number; nextIndex: number } {
  const currentIndex = getRoutePointIndexForDistance(points, pathDistanceMeters);
  const nextIndex = Math.min(currentIndex + 1, Math.max(points.length - 1, 0));
  return { currentIndex, nextIndex };
}

export function shouldAdvancePanorama(
  pathDistanceMeters: number,
  lastAppliedDistanceMeters: number,
  currentRouteIndex: number,
  lastAppliedRouteIndex: number | null
): boolean {
  if (lastAppliedRouteIndex === null) return true;
  if (currentRouteIndex !== lastAppliedRouteIndex) return true;
  return (
    pathDistanceMeters - lastAppliedDistanceMeters >=
    PANORAMA_ADVANCE_THRESHOLD_METERS
  );
}
