"use client";

import type { WalkDebugState } from "@/lib/walk-debug";

type WalkingDebugPanelProps = {
  debug: WalkDebugState;
};

export function WalkingDebugPanel({ debug }: WalkingDebugPanelProps) {
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  const { streetView } = debug;

  return (
    <div className="pointer-events-none absolute top-14 right-3 z-20 max-w-[16rem] rounded-lg border border-amber-300/60 bg-black/75 p-2 font-mono text-[10px] leading-relaxed text-amber-100 md:top-16 md:right-4">
      <p className="mb-1 font-semibold text-amber-300">Walking Debug</p>
      <p>source: {debug.movementSource}</p>
      <p>elapsed: {debug.elapsedSeconds}s</p>
      <p>walked: {debug.totalDistanceMeters.toFixed(1)} m</p>
      <p>breadcrumbs: {debug.breadcrumbCount}</p>
      <p>pano: {streetView.panoramaPanoId ?? "—"}</p>
      <p>
        pano lat/lng:{" "}
        {streetView.panoramaLatLng
          ? `${streetView.panoramaLatLng.lat.toFixed(5)}, ${streetView.panoramaLatLng.lng.toFixed(5)}`
          : "—"}
      </p>
      <p>lookup: {streetView.lastPanoramaLookupStatus}</p>
      <p>last step Δ: {debug.lastStepDeltaMeters.toFixed(2)} m</p>
    </div>
  );
}
