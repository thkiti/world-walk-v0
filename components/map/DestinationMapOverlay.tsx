"use client";

import { Marker, Polyline, useApiIsLoaded } from "@vis.gl/react-google-maps";
import type { LatLng } from "@/lib/types";

type DestinationMapOverlayProps = {
  points: LatLng[];
  currentPosition?: LatLng;
  showCurrentPosition?: boolean;
};

export function DestinationMapOverlay({
  points,
  currentPosition,
  showCurrentPosition = false,
}: DestinationMapOverlayProps) {
  const apiIsLoaded = useApiIsLoaded();
  if (!apiIsLoaded || points.length === 0) return null;

  const start = points[0];
  const end = points[points.length - 1];

  const dotIcon = (color: string, scale: number) => ({
    path: google.maps.SymbolPath.CIRCLE,
    scale,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: "#ffffff",
    strokeWeight: 2,
  });

  return (
    <>
      <Polyline
        path={points}
        strokeColor="#22c55e"
        strokeOpacity={0.9}
        strokeWeight={5}
      />
      <Marker
        position={start}
        title="Start"
        icon={dotIcon("#22c55e", 9)}
        zIndex={1}
      />
      <Marker
        position={end}
        title="End"
        icon={dotIcon("#ef4444", 9)}
        zIndex={1}
      />
      {showCurrentPosition && currentPosition && (
        <Marker
          position={currentPosition}
          title="You are here"
          icon={dotIcon("#2563eb", 11)}
          zIndex={2}
        />
      )}
    </>
  );
}
