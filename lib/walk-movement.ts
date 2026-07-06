import { haversineDistance, INITIAL_PITCH, moveForward } from "@/lib/geo";
import type { LatLng, StreetViewState } from "@/lib/types";

export const PANORAMA_ADVANCE_THRESHOLD_METERS = 5;
export const BREADCRUMB_MIN_DISTANCE_METERS = 3;

export type ForwardAdvanceResult = {
  view: StreetViewState;
  breadcrumbs: LatLng[];
  totalDistanceMeters: number;
};

export function advanceForward(
  view: StreetViewState,
  breadcrumbs: LatLng[],
  totalDistanceMeters: number,
  deltaMeters: number
): ForwardAdvanceResult {
  const newPosition = moveForward(view.position, view.heading, deltaMeters);
  const newView: StreetViewState = {
    position: newPosition,
    heading: view.heading,
    pitch: view.pitch,
  };

  const newTotal = totalDistanceMeters + deltaMeters;
  const lastBreadcrumb = breadcrumbs[breadcrumbs.length - 1];
  const shouldAppend =
    !lastBreadcrumb ||
    haversineDistance(lastBreadcrumb, newPosition) >=
      BREADCRUMB_MIN_DISTANCE_METERS;

  return {
    view: newView,
    breadcrumbs: shouldAppend
      ? [...breadcrumbs, newPosition]
      : breadcrumbs,
    totalDistanceMeters: newTotal,
  };
}

export function shouldAdvancePanorama(
  currentPosition: LatLng,
  lastAppliedPosition: LatLng | null,
  lastAppliedPanoId: string | null,
  newPanoId: string | null
): boolean {
  if (!lastAppliedPosition) return true;
  if (newPanoId && newPanoId !== lastAppliedPanoId) return true;
  return (
    haversineDistance(currentPosition, lastAppliedPosition) >=
    PANORAMA_ADVANCE_THRESHOLD_METERS
  );
}
