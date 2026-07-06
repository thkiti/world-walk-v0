"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useApiIsLoaded } from "@vis.gl/react-google-maps";
import { devLog } from "@/lib/dev-log";
import { haversineDistance } from "@/lib/geo";
import { analyzeForwardLink } from "@/lib/street-view-links";
import {
  applyPanoramaIfChanged,
  resolveStreetViewPanorama,
  streetViewStatusLabel,
} from "@/lib/street-view";
import type { LatLng, StreetViewState } from "@/lib/types";
import type { StreetViewDebugState } from "@/lib/walk-debug";
import { PANORAMA_ADVANCE_THRESHOLD_METERS } from "@/lib/walk-movement";

const POV_SYNC_DEBOUNCE_MS = 150;
const POSITION_LOOKUP_DEBOUNCE_MS = 400;

type StreetViewPanelProps = {
  view: StreetViewState;
  setView: React.Dispatch<React.SetStateAction<StreetViewState>>;
  isWalking?: boolean;
  awaitingDecision?: boolean;
  totalDistanceMeters?: number;
  onStreetViewDebug?: (debug: StreetViewDebugState) => void;
  onUserNavigate?: (position: LatLng, heading: number) => void;
  onDecisionPoint?: () => void;
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
  isWalking = false,
  awaitingDecision = false,
  totalDistanceMeters = 0,
  onStreetViewDebug,
  onUserNavigate,
  onDecisionPoint,
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
  const hasLoadedInitialPanoRef = useRef(false);
  const lastTotalDistanceRef = useRef(0);
  const pendingLinkDistanceRef = useRef(0);
  const onUserNavigateRef = useRef(onUserNavigate);
  const onDecisionPointRef = useRef(onDecisionPoint);
  const setViewRef = useRef(setView);
  const isWalkingRef = useRef(isWalking);
  const awaitingDecisionRef = useRef(awaitingDecision);
  const [panoramaReady, setPanoramaReady] = useState(false);
  const apiIsLoaded = useApiIsLoaded();

  onUserNavigateRef.current = onUserNavigate;
  onDecisionPointRef.current = onDecisionPoint;
  setViewRef.current = setView;
  isWalkingRef.current = isWalking;
  awaitingDecisionRef.current = awaitingDecision;

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

  const checkDecisionPoint = useCallback(
    (panorama: google.maps.StreetViewPanorama, heading: number) => {
      const analysis = analyzeForwardLink(panorama.getLinks(), heading);
      if (analysis.isDecisionPoint) {
        onDecisionPointRef.current?.();
        reportDebug("DECISION_POINT");
        return true;
      }
      return false;
    },
    [reportDebug]
  );

  const applyPanoramaAtPosition = useCallback(
    async (
      targetPosition: LatLng,
      pov: { heading: number; pitch: number },
      options?: { skipThreshold?: boolean }
    ) => {
      const panorama = panoramaRef.current;
      const service = serviceRef.current;
      if (!panorama || !service) return;

      const lastPosition = lastAppliedPositionRef.current;
      const lastPano = lastAppliedPanoRef.current;

      if (
        !options?.skipThreshold &&
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

      if (
        isWalkingRef.current &&
        !awaitingDecisionRef.current &&
        result.status === google.maps.StreetViewStatus.OK
      ) {
        checkDecisionPoint(panorama, pov.heading);
      }
    },
    [reportDebug, checkDecisionPoint]
  );

  const tryAdvanceAlongLink = useCallback(async () => {
    const panorama = panoramaRef.current;
    const service = serviceRef.current;
    if (!panorama || !service) return;

    const pov = panorama.getPov();
    const heading = pov?.heading ?? view.heading;
    const analysis = analyzeForwardLink(panorama.getLinks(), heading);

    if (analysis.isDecisionPoint) {
      onDecisionPointRef.current?.();
      reportDebug("DECISION_POINT");
      return;
    }

    if (analysis.forwardLink) {
      isProgrammaticRef.current = true;
      panorama.setPano(analysis.forwardLink.pano);
      panorama.setPov({ heading, pitch: pov?.pitch ?? view.pitch });
      isProgrammaticRef.current = false;

      lastAppliedPanoRef.current = analysis.forwardLink.pano;
      const position = getAppliedPanoLatLng(panorama);
      if (position) {
        lastAppliedPositionRef.current = position;
        setViewRef.current((current) => ({
          ...current,
          position,
          heading,
        }));
      }

      reportDebug("LINK_ADVANCE");
      return;
    }

    await applyPanoramaAtPosition(view.position, {
      heading,
      pitch: pov?.pitch ?? view.pitch,
    });
  }, [view.position, view.heading, view.pitch, applyPanoramaAtPosition, reportDebug]);

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

      setViewRef.current((current) => ({
        ...current,
        position,
        heading,
        pitch: pov?.pitch ?? current.pitch,
      }));

      onUserNavigateRef.current?.(position, heading);
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

        setViewRef.current((current) => ({
          ...current,
          heading: pov.heading ?? current.heading,
          pitch: pov.pitch ?? current.pitch,
        }));
      }, POV_SYNC_DEBOUNCE_MS);
    });

    setPanoramaReady(true);

    return () => {
      lookupGenerationRef.current += 1;
      hasLoadedInitialPanoRef.current = false;
      lastTotalDistanceRef.current = 0;
      pendingLinkDistanceRef.current = 0;
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
  }, [apiIsLoaded, reportDebug, view.heading]);

  useEffect(() => {
    if (!panoramaReady) return;

    const pov = { heading: view.heading, pitch: view.pitch };

    if (!hasLoadedInitialPanoRef.current) {
      hasLoadedInitialPanoRef.current = true;
      void applyPanoramaAtPosition(view.position, pov, { skipThreshold: true });
      return;
    }

    if (isWalking && !awaitingDecision) return;

    schedulePositionLookup(view.position, pov);
  }, [
    view.position.lat,
    view.position.lng,
    view.heading,
    view.pitch,
    panoramaReady,
    isWalking,
    awaitingDecision,
    schedulePositionLookup,
    applyPanoramaAtPosition,
  ]);

  useEffect(() => {
    if (!panoramaReady || !isWalking || awaitingDecision) return;

    const delta = totalDistanceMeters - lastTotalDistanceRef.current;
    lastTotalDistanceRef.current = totalDistanceMeters;
    if (delta <= 0) return;

    pendingLinkDistanceRef.current += delta;
    if (pendingLinkDistanceRef.current < PANORAMA_ADVANCE_THRESHOLD_METERS) {
      return;
    }

    pendingLinkDistanceRef.current = 0;
    void tryAdvanceAlongLink();
  }, [
    totalDistanceMeters,
    isWalking,
    awaitingDecision,
    panoramaReady,
    tryAdvanceAlongLink,
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
