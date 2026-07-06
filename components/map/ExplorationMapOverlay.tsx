"use client";

import { useEffect } from "react";
import { Marker, Polyline, useApiIsLoaded, useMap } from "@vis.gl/react-google-maps";
import type { LatLng } from "@/lib/types";

type ExplorationMapOverlayProps = {
  position: LatLng;
  heading: number;
  breadcrumbs: LatLng[];
};

function headingArrowIcon(heading: number): google.maps.Symbol {
  return {
    path: "M 0,-2 L 1.5,2 L 0,1 L -1.5,2 Z",
    fillColor: "#2563eb",
    fillOpacity: 1,
    strokeColor: "#ffffff",
    strokeWeight: 1.5,
    scale: 5,
    rotation: heading,
    anchor: new google.maps.Point(0, 0),
  };
}

function MapFollower({ position }: { position: LatLng }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    map.panTo(position);
  }, [map, position.lat, position.lng]);

  return null;
}

export function ExplorationMapOverlay({
  position,
  heading,
  breadcrumbs,
}: ExplorationMapOverlayProps) {
  const apiIsLoaded = useApiIsLoaded();
  if (!apiIsLoaded) return null;

  const trail =
    breadcrumbs.length > 1 ? breadcrumbs : [position];

  return (
    <>
      <MapFollower position={position} />
      {trail.length > 1 && (
        <Polyline
          path={trail}
          strokeColor="#3b82f6"
          strokeOpacity={0.75}
          strokeWeight={4}
        />
      )}
      <Marker
        position={position}
        title="You are here"
        icon={headingArrowIcon(heading)}
        zIndex={2}
      />
    </>
  );
}
