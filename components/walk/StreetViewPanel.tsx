"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useApiIsLoaded } from "@vis.gl/react-google-maps";
import { devLog } from "@/lib/dev-log";
import {
  getRouteProgress,
  moveForward,
} from "@/lib/geo";
import { StreetViewPrefetchCache } from "@/lib/street-view-prefetch";
import {
  applyStreetViewLookup,
  resolveStreetViewPanorama,
  streetViewStatusLabel,
  type StreetViewLookupResult,
} from "@/lib/street-view";
import type { LatLng, StreetViewState } from "@/lib/types";
import type { StreetViewDebugState } from "@/lib/walk-debug";
import {
  getRouteIndices,
  shouldAdvancePanorama,
} from "@/lib/walk-movement";

const TURN_DEGREES = 15;
const FORWARD_METERS = 10;

type StreetViewPanelProps = {
  view: StreetViewState;
  setView: React.Dispatch<React.SetStateAction<StreetViewState>>;
  routePoints?: LatLng[];
  pathDistanceMeters?: number;
  isWalking?: boolean;
  onStreetViewDebug?: (debug: StreetViewDebugState) => void;
};

function getAppliedPanoId(
  panorama: google.maps.StreetViewPanorama
): string | null {
  try {
    return panorama.getPano() || null;
  } catch {
    return null;
  }
}

function getAppliedPanoLatLng(
  panorama: google.maps.StreetViewPanorama
): LatLng | null {
  try {
    const position = panorama.getPosition();
    if (!position) return null;
    return { lat: position.lat(), lng: position.lng() };
  } catch {
    return null;
  }
}

export function StreetViewPanel({
  view,
  setView,
  routePoints,
  pathDistanceMeters = 0,
  isWalking = false,
  onStreetViewDebug,
}: StreetViewPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const panoramaRef = useRef<google.maps.StreetViewPanorama | null>(null);
  const serviceRef = useRef<google.maps.StreetViewService | null>(null);
  const prefetchCacheRef = useRef(new StreetViewPrefetchCache());
  const lookupGenerationRef = useRef(0);
  const lastAppliedPanoRef = useRef<string | null>(null);
  const lastAppliedDistanceRef = useRef(0);
  const lastAppliedIndexRef = useRef<number | null>(null);
  const [panoramaReady, setPanoramaReady] = useState(false);
  const apiIsLoaded = useApiIsLoaded();

  const routeIndices = useMemo(() => {
    if (!routePoints?.length) {
      return { currentIndex: 0, nextIndex: 0 };
    }
    return getRouteIndices(routePoints, pathDistanceMeters);
  }, [routePoints, pathDistanceMeters]);

  const reportDebug = (
    lookupStatus: string,
    panorama: google.maps.StreetViewPanorama | null = panoramaRef.current
  ) => {
    onStreetViewDebug?.({
      panoramaPanoId: panorama ? getAppliedPanoId(panorama) : null,
      panoramaLatLng: panorama ? getAppliedPanoLatLng(panorama) : null,
      lastPanoramaLookupStatus: lookupStatus,
      lastAppliedRouteIndex: lastAppliedIndexRef.current,
      lastAppliedDistanceMeters: lastAppliedDistanceRef.current,
    });
  };

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
      lastAppliedPanoRef.current = null;
      lastAppliedDistanceRef.current = 0;
      lastAppliedIndexRef.current = null;
      setPanoramaReady(false);
    };
  }, [apiIsLoaded]);

  useEffect(() => {
    const service = serviceRef.current;
    if (!panoramaReady || !service || !routePoints?.length) return;

    prefetchCacheRef.current.prefetchAhead(
      service,
      routePoints,
      routeIndices.currentIndex
    );
  }, [panoramaReady, routePoints, routeIndices.currentIndex]);

  useEffect(() => {
    const panorama = panoramaRef.current;
    if (!panoramaReady || !panorama) return;

    panorama.setPov({ heading: view.heading, pitch: view.pitch });
  }, [view.heading, view.pitch, panoramaReady]);

  useEffect(() => {
    const panorama = panoramaRef.current;
    const service = serviceRef.current;
    if (!panoramaReady || !panorama || !service || !routePoints?.length) {
      return;
    }

    const pov = { heading: view.heading, pitch: view.pitch };
    const { currentIndex, nextIndex } = routeIndices;
    const targetPosition = getRouteProgress(
      routePoints,
      pathDistanceMeters
    ).position;

    const tryApply = (result: StreetViewLookupResult, generation: number) => {
      if (generation !== lookupGenerationRef.current) return;

      reportDebug(streetViewStatusLabel(result.status));

      if (result.status !== google.maps.StreetViewStatus.OK) {
        devLog("[StreetView] stuck", {
          reason: "lookup failed",
          pathDistanceMeters,
          distanceSinceLastApply:
            pathDistanceMeters - lastAppliedDistanceRef.current,
          currentIndex,
          nextIndex,
          status: streetViewStatusLabel(result.status),
        });
        panorama.setPov(pov);
        return;
      }

      const previousPano = lastAppliedPanoRef.current;
      applyStreetViewLookup(panorama, result, pov);
      const appliedPano = result.pano ?? getAppliedPanoId(panorama);

      if (appliedPano === previousPano && previousPano !== null) {
        devLog("[StreetView] stuck", {
          reason: "same pano id after advance",
          pathDistanceMeters,
          distanceSinceLastApply:
            pathDistanceMeters - lastAppliedDistanceRef.current,
          currentIndex,
          pano: appliedPano,
        });
      }

      lastAppliedPanoRef.current = appliedPano;
      lastAppliedDistanceRef.current = pathDistanceMeters;
      lastAppliedIndexRef.current = currentIndex;
      reportDebug("OK");
    };

    if (
      !shouldAdvancePanorama(
        pathDistanceMeters,
        lastAppliedDistanceRef.current,
        currentIndex,
        lastAppliedIndexRef.current
      )
    ) {
      reportDebug("HOLD");
      return;
    }

    const generation = ++lookupGenerationRef.current;
    const cached = prefetchCacheRef.current.get(currentIndex);

    devLog("[StreetView] route point", {
      currentIndex,
      prefetchedIndex: nextIndex,
      panoramaStatus: cached
        ? streetViewStatusLabel(cached.status)
        : "PENDING",
      pathDistanceMeters,
    });

    const resolveAndApply = async () => {
      if (cached?.status === google.maps.StreetViewStatus.OK) {
        tryApply(cached, generation);
        return;
      }

      const pointResult = await prefetchCacheRef.current.prefetch(
        service,
        currentIndex,
        routePoints[currentIndex]
      );

      if (pointResult.status === google.maps.StreetViewStatus.OK) {
        tryApply(pointResult, generation);
        return;
      }

      const positionResult = await resolveStreetViewPanorama(
        service,
        targetPosition
      );
      tryApply(positionResult, generation);
    };

    void resolveAndApply();
  }, [pathDistanceMeters, routePoints, routeIndices, panoramaReady, onStreetViewDebug]);

  useEffect(() => {
    const panorama = panoramaRef.current;
    const service = serviceRef.current;
    if (!panoramaReady || !panorama || !service) return;
    if (isWalking && routePoints?.length) return;

    const pov = { heading: view.heading, pitch: view.pitch };
    const generation = ++lookupGenerationRef.current;

    devLog("[StreetView] resolving panorama for position", {
      requestedPosition: view.position,
    });

    void resolveStreetViewPanorama(service, view.position).then((result) => {
      if (generation !== lookupGenerationRef.current) return;
      applyStreetViewLookup(panorama, result, pov);
      reportDebug(streetViewStatusLabel(result.status), panorama);
    });
  }, [
    view.position.lat,
    view.position.lng,
    isWalking,
    routePoints,
    panoramaReady,
    view.heading,
    view.pitch,
    onStreetViewDebug,
  ]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />

      <div className="absolute right-3 bottom-3 left-3 flex flex-col gap-2 md:right-4 md:bottom-4 md:left-4 md:gap-3">
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
