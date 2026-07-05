"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useApiIsLoaded } from "@vis.gl/react-google-maps";
import { devLog } from "@/lib/dev-log";
import { getRoutePointIndexForDistance, moveForward } from "@/lib/geo";
import { StreetViewPrefetchCache } from "@/lib/street-view-prefetch";
import {
  applyStreetViewLookup,
  resolveStreetViewPanorama,
  streetViewStatusLabel,
} from "@/lib/street-view";
import type { LatLng, StreetViewState } from "@/lib/types";

const TURN_DEGREES = 15;
const FORWARD_METERS = 10;

type StreetViewPanelProps = {
  view: StreetViewState;
  setView: React.Dispatch<React.SetStateAction<StreetViewState>>;
  routePoints?: LatLng[];
  pathDistanceMeters?: number;
  isWalking?: boolean;
};

export function StreetViewPanel({
  view,
  setView,
  routePoints,
  pathDistanceMeters = 0,
  isWalking = false,
}: StreetViewPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const panoramaRef = useRef<google.maps.StreetViewPanorama | null>(null);
  const serviceRef = useRef<google.maps.StreetViewService | null>(null);
  const prefetchCacheRef = useRef(new StreetViewPrefetchCache());
  const lookupGenerationRef = useRef(0);
  const lastAppliedIndexRef = useRef<number | null>(null);
  const [panoramaReady, setPanoramaReady] = useState(false);
  const apiIsLoaded = useApiIsLoaded();

  const routePointIndex = useMemo(() => {
    if (!isWalking || !routePoints?.length) return null;
    return getRoutePointIndexForDistance(routePoints, pathDistanceMeters);
  }, [isWalking, routePoints, pathDistanceMeters]);

  useEffect(() => {
    if (!apiIsLoaded || !containerRef.current) return;

    const panorama = new google.maps.StreetViewPanorama(containerRef.current, {
      visible: true,
      enableCloseButton: false,
    });
    panoramaRef.current = panorama;
    serviceRef.current = new google.maps.StreetViewService();

    devLog("[StreetView] panorama created successfully", {
      hasContainer: Boolean(containerRef.current),
    });

    setPanoramaReady(true);

    return () => {
      lookupGenerationRef.current += 1;
      panorama.setVisible(false);
      panoramaRef.current = null;
      serviceRef.current = null;
      prefetchCacheRef.current.clear();
      lastAppliedIndexRef.current = null;
      setPanoramaReady(false);
    };
  }, [apiIsLoaded]);

  useEffect(() => {
    const service = serviceRef.current;
    if (!panoramaReady || !service || !isWalking || !routePoints?.length) {
      return;
    }
    if (routePointIndex === null) return;

    prefetchCacheRef.current.prefetchAhead(
      service,
      routePoints,
      routePointIndex
    );
  }, [panoramaReady, isWalking, routePoints, routePointIndex]);

  useEffect(() => {
    const panorama = panoramaRef.current;
    const service = serviceRef.current;
    if (!panoramaReady || !panorama || !service) return;

    const pov = { heading: view.heading, pitch: view.pitch };

    if (isWalking && routePoints?.length && routePointIndex !== null) {
      const currentIndex = routePointIndex;

      if (lastAppliedIndexRef.current === currentIndex) {
        panorama.setPov(pov);
        return;
      }

      const generation = ++lookupGenerationRef.current;
      const cached = prefetchCacheRef.current.get(currentIndex);

      devLog("[StreetView] route point", {
        currentIndex,
        prefetchedIndex: Math.min(currentIndex + 1, routePoints.length - 1),
        panoramaStatus: cached
          ? streetViewStatusLabel(cached.status)
          : "PENDING",
      });

      const applyResult = (
        result: Awaited<ReturnType<typeof resolveStreetViewPanorama>>
      ) => {
        if (generation !== lookupGenerationRef.current) return;
        if (!panoramaRef.current) return;

        if (result.status === google.maps.StreetViewStatus.OK) {
          applyStreetViewLookup(panoramaRef.current, result, pov);
          lastAppliedIndexRef.current = currentIndex;
          return;
        }

        panorama.setPov(pov);
      };

      if (cached) {
        applyResult(cached);
        return;
      }

      void prefetchCacheRef.current
        .prefetch(service, currentIndex, routePoints[currentIndex])
        .then((result) => {
          devLog("[StreetView] cache miss resolved", {
            currentIndex,
            panoramaStatus: streetViewStatusLabel(result.status),
          });

          if (result.status === google.maps.StreetViewStatus.OK) {
            applyResult(result);
            return;
          }

          void resolveStreetViewPanorama(service, view.position).then(
            applyResult
          );
        });

      return;
    }

    const generation = ++lookupGenerationRef.current;
    lastAppliedIndexRef.current = null;

    devLog("[StreetView] resolving panorama for position", {
      requestedPosition: view.position,
    });

    void resolveStreetViewPanorama(service, view.position).then((result) => {
      if (generation !== lookupGenerationRef.current) return;
      if (!panoramaRef.current) return;

      applyStreetViewLookup(panoramaRef.current, result, pov);
    });
  }, [view, panoramaReady, isWalking, routePoints, routePointIndex]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />

      <div className="absolute right-3 bottom-3 left-3 flex flex-col gap-2 md:right-4 md:bottom-4 md:left-4 md:gap-3">
        <div className="hidden rounded-lg bg-white/80 px-3 py-2 font-mono text-xs text-zinc-700 shadow-md backdrop-blur-sm sm:block">
          <p>lat: {view.position.lat.toFixed(6)}</p>
          <p>lng: {view.position.lng.toFixed(6)}</p>
          <p>heading: {view.heading.toFixed(1)}°</p>
        </div>

        <div className="flex justify-center gap-2">
          <button
            type="button"
            className="min-h-12 flex-1 rounded-xl bg-white/85 px-3 py-2 text-sm font-medium text-zinc-900 shadow-md backdrop-blur-sm active:scale-[0.98] md:flex-none md:px-4"
            onClick={() =>
              setView((current) => ({
                ...current,
                heading: current.heading - TURN_DEGREES,
              }))
            }
          >
            Turn Left
          </button>
          <button
            type="button"
            className="min-h-12 flex-1 rounded-xl bg-white/85 px-3 py-2 text-sm font-medium text-zinc-900 shadow-md backdrop-blur-sm active:scale-[0.98] md:flex-none md:px-4"
            onClick={() =>
              setView((current) => ({
                ...current,
                position: moveForward(
                  current.position,
                  current.heading,
                  FORWARD_METERS
                ),
              }))
            }
          >
            Forward
          </button>
          <button
            type="button"
            className="min-h-12 flex-1 rounded-xl bg-white/85 px-3 py-2 text-sm font-medium text-zinc-900 shadow-md backdrop-blur-sm active:scale-[0.98] md:flex-none md:px-4"
            onClick={() =>
              setView((current) => ({
                ...current,
                heading: current.heading + TURN_DEGREES,
              }))
            }
          >
            Turn Right
          </button>
        </div>
      </div>
    </div>
  );
}
