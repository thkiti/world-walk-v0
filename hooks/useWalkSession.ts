"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { logPhoneSteps } from "@/lib/step-counter";
import { haversineDistance, viewFromPlace } from "@/lib/geo";
import type { LatLng, MovementSource, WalkDestination } from "@/lib/types";
import { EMPTY_STREET_VIEW_DEBUG, type StreetViewDebugState } from "@/lib/walk-debug";
import { advanceForward, BREADCRUMB_MIN_DISTANCE_METERS } from "@/lib/walk-movement";

type UseWalkSessionOptions = {
  movementSource: MovementSource;
  strideLengthMeters: number;
  steps: number;
};

export function useWalkSession(
  destination: WalkDestination,
  options: UseWalkSessionOptions = {
    movementSource: "phone-steps",
    strideLengthMeters: 0.75,
    steps: 0,
  }
) {
  const { movementSource, strideLengthMeters, steps } = options;

  const [view, setView] = useState(() => viewFromPlace(destination));
  const [isWalking, setIsWalking] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [lastStepDeltaMeters, setLastStepDeltaMeters] = useState(0);
  const [totalDistanceMeters, setTotalDistanceMeters] = useState(0);
  const [breadcrumbs, setBreadcrumbs] = useState<LatLng[]>(() => [
    destination.startPosition,
  ]);
  const [streetViewDebug, setStreetViewDebug] =
    useState<StreetViewDebugState>(EMPTY_STREET_VIEW_DEBUG);

  const lastProcessedStepsRef = useRef(0);
  const breadcrumbsRef = useRef(breadcrumbs);
  const totalDistanceRef = useRef(totalDistanceMeters);

  breadcrumbsRef.current = breadcrumbs;
  totalDistanceRef.current = totalDistanceMeters;

  const applyMovementDelta = (deltaMeters: number) => {
    if (deltaMeters <= 0) return;

    setLastStepDeltaMeters(deltaMeters);

    setView((currentView) => {
      const result = advanceForward(
        currentView,
        breadcrumbsRef.current,
        totalDistanceRef.current,
        deltaMeters
      );
      breadcrumbsRef.current = result.breadcrumbs;
      totalDistanceRef.current = result.totalDistanceMeters;
      setBreadcrumbs(result.breadcrumbs);
      setTotalDistanceMeters(result.totalDistanceMeters);
      return result.view;
    });
  };

  useEffect(() => {
    setView(viewFromPlace(destination));
    setBreadcrumbs([destination.startPosition]);
    setTotalDistanceMeters(0);
    setElapsedSeconds(0);
    setIsWalking(false);
    setLastStepDeltaMeters(0);
    lastProcessedStepsRef.current = 0;
    setStreetViewDebug(EMPTY_STREET_VIEW_DEBUG);
  }, [
    destination.id,
    destination.startPosition.lat,
    destination.startPosition.lng,
    destination.initialHeading,
  ]);

  useEffect(() => {
    if (!isWalking) return;

    const interval = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isWalking]);

  useEffect(() => {
    if (!isWalking || movementSource !== "phone-steps") return;

    const deltaSteps = steps - lastProcessedStepsRef.current;
    if (deltaSteps <= 0) return;

    lastProcessedStepsRef.current = steps;
    const distanceMeters = deltaSteps * strideLengthMeters;
    setLastStepDeltaMeters(distanceMeters);
    logPhoneSteps(steps, deltaSteps, distanceMeters);
    applyMovementDelta(distanceMeters);
  }, [steps, isWalking, movementSource, strideLengthMeters]);

  const recordUserPosition = useCallback((position: LatLng) => {
    setBreadcrumbs((current) => {
      const last = current[current.length - 1];
      if (
        last &&
        haversineDistance(last, position) < BREADCRUMB_MIN_DISTANCE_METERS
      ) {
        return current;
      }
      const next = [...current, position];
      breadcrumbsRef.current = next;
      return next;
    });
  }, []);

  const reset = () => {
    setIsWalking(false);
    setElapsedSeconds(0);
    setTotalDistanceMeters(0);
    setLastStepDeltaMeters(0);
    lastProcessedStepsRef.current = 0;
    setView(viewFromPlace(destination));
    setBreadcrumbs([destination.startPosition]);
    breadcrumbsRef.current = [destination.startPosition];
    totalDistanceRef.current = 0;
    setStreetViewDebug(EMPTY_STREET_VIEW_DEBUG);
  };

  const distanceWalkedKm = totalDistanceMeters / 1000;

  return {
    view,
    setView,
    isWalking,
    setIsWalking,
    reset,
    totalDistanceMeters,
    distanceWalkedKm,
    breadcrumbs,
    elapsedSeconds,
    movementSource,
    lastStepDeltaMeters,
    streetViewDebug,
    setStreetViewDebug,
    applyMovementDelta,
    recordUserPosition,
    resetStepProgress: () => {
      lastProcessedStepsRef.current = 0;
      setLastStepDeltaMeters(0);
    },
  };
}
