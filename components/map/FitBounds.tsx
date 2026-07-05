"use client";

import { useEffect } from "react";
import { useMap, useApiIsLoaded } from "@vis.gl/react-google-maps";
import type { LatLng } from "@/lib/types";

type FitBoundsProps = {
  points: LatLng[];
  padding?: number;
};

export function FitBounds({ points, padding = 48 }: FitBoundsProps) {
  const map = useMap();
  const apiIsLoaded = useApiIsLoaded();

  useEffect(() => {
    if (!map || !apiIsLoaded || points.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    for (const point of points) {
      bounds.extend(point);
    }
    map.fitBounds(bounds, padding);
  }, [map, apiIsLoaded, points, padding]);

  return null;
}
