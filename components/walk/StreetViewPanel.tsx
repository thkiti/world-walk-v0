"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useApiIsLoaded } from "@vis.gl/react-google-maps";
import { devLog } from "@/lib/dev-log";
import {
  applyPanoramaIfChanged,
  resolveStreetViewPanorama,
  streetViewStatusLabel,
} from "@/lib/street-view";
import type { LatLng, StreetViewState } from "@/lib/types";
import type { StreetViewDebugState } from "@/lib/walk-debug";
import { PANORAMA_ADVANCE_THRESHOLD_METERS } from "@/lib/walk-movement";
import { haversineDistance } from "@/lib/geo";

const POV_SYNC_DEBOUNCE_MS = 150;
const POSITION_LOOKUP_DEBOUNCE_MS = 400;

type StreetViewPanelProps = {
  view: StreetViewState;
  setView: React.Dispatch<React.SetStateAction<StreetViewState>>;
  onStreetViewDebug?: (debug: StreetViewDebugState) => void;
  onUserNavigate?: (position: LatLng) => void;
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
  onStreetViewDebug,
  onUserNavigate,
}: StreetViewPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const panoramaRef = useRef<google.maps.StreetViewPanorama | null>(null);
  const serviceRef = useRef<google.maps.StreetViewService | null>(null);
  const lookupGenerationRef = useRef(0);
  const lastAppliedPanoRef = useRef<string | null>(null);
  const lastAppliedPositionRef = useRef<LatLng | null>(null);
  const isProgrammaticRef = useRef(false);
  const povSyncTimerRef = useRef<number | null>(null);
  const lookupTimerRef = useRef<number | null>(null);
  const pendingPositionRef = useRef<LatLng | null>(null);
  const [panoramaReady, setPanoramaReady] = useState(false);
  const apiIsLoaded = useApiIsLoaded();

  const reportDebug = useCallback(
    (
      lookupStatus: string,
      panorama: google.maps.StreetViewPanorama | null = panoramaRef.current
    ) => {
      onStreetViewDebug?.({
        panoramaPanoId: panorama ? getAppliedPanoId(panorama) : null,
        panoramaLatLng: panorama ? getAppliedPanoLatLng(panorama) : null,
        lastPanoramaLookupStatus: lookupStatus,
        lastAppliedPosition: lastAppliedPositionRef.current,
      });
    },
    [onStreetViewDebug]
  );

  const applyPanoramaAtPosition = useCallback(
    async (targetPosition: LatLng, pov: { heading: number; pitch: number }) => {
      const panorama = panoramaRef.current;
      const service = serviceRef.current;
      if (!panorama || !service) return;

      const lastPosition = lastAppliedPositionRef.current;
      const lastPano = lastAppliedPanoRef.current;

      if (
        lastPosition &&
        haversineDistance(lastPosition, targetPosition) <
          PANORAMA_ADVANCE_THRESHOLD_METERS &&
        lastPano
      ) {
        isProgrammaticRef.current = true;
        panorama.setPov(pov);
        isProgrammaticRef.current = false;
        reportDebug("POV_ONLY");
        return;
      }

      const generation = ++lookupGenerationRef.current;
      const previousPanoramaId =
        lastAppliedPanoRef.current ?? getAppliedPanoId(panorama);

      devLog("[StreetView] resolving panorama", { targetPosition });

      const result = await resolveStreetViewPanorama(service, targetPosition);
      if (generation !== lookupGenerationRef.current) return;

      isProgrammaticRef.current = true;
      const applied = applyPanoramaIfChanged(
        panorama,
        result,
        pov,
        previousPanoramaId
      );

      if (applied || result.status === google.maps.StreetViewStatus.OK) {
        lastAppliedPanoRef.current =
          result.pano ?? getAppliedPanoId(panorama);
        lastAppliedPositionRef.current = result.position;
      }

      panorama.setPov(pov);
      isProgrammaticRef.current = false;
      reportDebug(
        applied ? "POSITION_CHANGED" : streetViewStatusLabel(result.status)
      );
    },
    [reportDebug]
  );

  const schedulePositionLookup = useCallback(
    (targetPosition: LatLng, pov: { heading: number; pitch: number }) => {
      pendingPositionRef.current = targetPosition;

      if (lookupTimerRef.current !== null) {
        window.clearTimeout(lookupTimerRef.current);
      }

      lookupTimerRef.current = window.setTimeout(() => {
        lookupTimerRef.current = null;
        const position = pendingPositionRef.current;
        if (!position) return;
        void applyPanoramaAtPosition(position, pov);
      }, POSITION_LOOKUP_DEBOUNCE_MS);
    },
    [applyPanoramaAtPosition]
  );

  useEffect(() => {
    if (!apiIsLoaded || !containerRef.current) return;

    const panorama = new google.maps.StreetViewPanorama(containerRef.current, {
      visible: true,
      enableCloseButton: false,
      clickToGo: true,
      linksControl: true,
      panControl: true,
      addressControl: false,
    });
    panoramaRef.current = panorama;
    serviceRef.current = new google.maps.StreetViewService();

    const positionListener = panorama.addListener("position_changed", () => {
      if (isProgrammaticRef.current) return;

      const position = getAppliedPanoLatLng(panorama);
      if (!position) return;

      const pov = panorama.getPov();
      const heading = pov?.heading ?? view.heading;

      lastAppliedPositionRef.current = position;
      lastAppliedPanoRef.current = getAppliedPanoId(panorama);

      setView((current) => ({
        ...current,
        position,
        heading,
        pitch: pov?.pitch ?? current.pitch,
      }));

      onUserNavigate?.(position);
      reportDebug("USER_NAV");
    });

    const povListener = panorama.addListener("pov_changed", () => {
      if (isProgrammaticRef.current) return;

      if (povSyncTimerRef.current !== null) {
        window.clearTimeout(povSyncTimerRef.current);
      }

      povSyncTimerRef.current = window.setTimeout(() => {
        povSyncTimerRef.current = null;
        const pov = panorama.getPov();
        if (!pov) return;

        setView((current) => ({
          ...current,
          heading: pov.heading ?? current.heading,
          pitch: pov.pitch ?? current.pitch,
        }));
      }, POV_SYNC_DEBOUNCE_MS);
    });

    setPanoramaReady(true);

    return () => {
      lookupGenerationRef.current += 1;
      google.maps.event.removeListener(positionListener);
      google.maps.event.removeListener(povListener);
      if (povSyncTimerRef.current !== null) {
        window.clearTimeout(povSyncTimerRef.current);
      }
      if (lookupTimerRef.current !== null) {
        window.clearTimeout(lookupTimerRef.current);
      }
      panorama.setVisible(false);
      panoramaRef.current = null;
      serviceRef.current = null;
      lastAppliedPanoRef.current = null;
      lastAppliedPositionRef.current = null;
      setPanoramaReady(false);
    };
  }, [apiIsLoaded, onUserNavigate, reportDebug, setView]);

  useEffect(() => {
    if (!panoramaReady) return;

    const pov = { heading: view.heading, pitch: view.pitch };
    schedulePositionLookup(view.position, pov);
  }, [
    view.position.lat,
    view.position.lng,
    view.heading,
    view.pitch,
    panoramaReady,
    schedulePositionLookup,
  ]);

  useEffect(() => {
    const panorama = panoramaRef.current;
    if (!panoramaReady || !panorama) return;

    isProgrammaticRef.current = true;
    panorama.setPov({ heading: view.heading, pitch: view.pitch });
    isProgrammaticRef.current = false;
  }, [view.heading, view.pitch, panoramaReady]);

  return <div ref={containerRef} className="h-full w-full" />;
}
