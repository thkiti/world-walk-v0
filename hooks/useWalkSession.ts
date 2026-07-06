"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { logPhoneSteps } from "@/lib/step-counter";
import { devLog } from "@/lib/dev-log";
import { haversineDistance, viewFromPlace } from "@/lib/geo";
import type { LatLng, MovementSource, WalkDestination } from "@/lib/types";
import { EMPTY_STREET_VIEW_DEBUG, type StreetViewDebugState } from "@/lib/walk-debug";
import { advanceForward, BREADCRUMB_MIN_DISTANCE_METERS } from "@/lib/walk-movement";

type UseWalkSessionOptions = {
  movementSource: MovementSource;
  strideLengthMeters: number;
  steps: number;
  autoStart?: boolean;
};

export function useWalkSession(
  destination: WalkDestination,
  options: UseWalkSessionOptions = {
    movementSource: "phone-steps",
    strideLengthMeters: 0.75,
    steps: 0,
    autoStart: true,
  }
) {
  const { movementSource, strideLengthMeters, steps, autoStart = true } = options;

  const [view, setView] = useState(() => viewFromPlace(destination));
  const [isWalking, setIsWalking] = useState(autoStart);
  const [awaitingDecision, setAwaitingDecision] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [lastStepDeltaMeters, setLastStepDeltaMeters] = useState(0);
  const [totalDistanceMeters, setTotalDistanceMeters] = useState(0);
  const [sessionDeltasApplied, setSessionDeltasApplied] = useState(0);
  const [breadcrumbs, setBreadcrumbs] = useState<LatLng[]>(() => [
    destination.startPosition,
  ]);
  const [streetViewDebug, setStreetViewDebug] =
    useState<StreetViewDebugState>(EMPTY_STREET_VIEW_DEBUG);

  const lastProcessedStepsRef = useRef(0);
  const breadcrumbsRef = useRef(breadcrumbs);
  const totalDistanceRef = useRef(totalDistanceMeters);
  const awaitingDecisionRef = useRef(awaitingDecision);
  const isWalkingRef = useRef(isWalking);
  const viewRef = useRef(view);

  breadcrumbsRef.current = breadcrumbs;
  totalDistanceRef.current = totalDistanceMeters;
  awaitingDecisionRef.current = awaitingDecision;
  isWalkingRef.current = isWalking;
  viewRef.current = view;

  const applyMovementDelta = useCallback((deltaMeters: number): boolean => {
    if (deltaMeters <= 0) return false;

    if (awaitingDecisionRef.current) {
      devLog("[Movement] delta blocked — awaitingDecision", { deltaMeters });
      return false;
    }

    if (!isWalkingRef.current) {
      devLog("[Movement] delta blocked — not walking", { deltaMeters });
      return false;
    }

    const currentView = viewRef.current;
    const oldPosition = currentView.position;
    const result = advanceForward(
      currentView,
      breadcrumbsRef.current,
      totalDistanceRef.current,
      deltaMeters
    );

    breadcrumbsRef.current = result.breadcrumbs;
    totalDistanceRef.current = result.totalDistanceMeters;
    viewRef.current = result.view;

    setView(result.view);
    setBreadcrumbs(result.breadcrumbs);
    setTotalDistanceMeters(result.totalDistanceMeters);
    setLastStepDeltaMeters(deltaMeters);
    setSessionDeltasApplied((count) => count + 1);

    devLog("[Movement] delta applied", {
      deltaMeters,
      heading: currentView.heading,
      oldPosition,
      newPosition: result.view.position,
      totalDistanceMeters: result.totalDistanceMeters,
    });

    return true;
  }, []);

  useEffect(() => {
    const initial = viewFromPlace(destination);
    viewRef.current = initial;
    setView(initial);
    setBreadcrumbs([destination.startPosition]);
    breadcrumbsRef.current = [destination.startPosition];
    setTotalDistanceMeters(0);
    totalDistanceRef.current = 0;
    setElapsedSeconds(0);
    setIsWalking(autoStart);
    setAwaitingDecision(false);
    setLastStepDeltaMeters(0);
    setSessionDeltasApplied(0);
    lastProcessedStepsRef.current = 0;
    setStreetViewDebug(EMPTY_STREET_VIEW_DEBUG);
  }, [
    destination.id,
    destination.startPosition.lat,
    destination.startPosition.lng,
    destination.initialHeading,
    autoStart,
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
    logPhoneSteps(steps, deltaSteps, distanceMeters);
    applyMovementDelta(distanceMeters);
  }, [steps, isWalking, movementSource, strideLengthMeters, applyMovementDelta]);

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

  const resolveUserNavigation = useCallback(
    (position: LatLng, heading: number) => {
      setAwaitingDecision(false);
      recordUserPosition(position);
      const next = { ...viewRef.current, position, heading };
      viewRef.current = next;
      setView(next);
    },
    [recordUserPosition]
  );

  const pauseForDecision = useCallback(() => {
    devLog("[Movement] pauseForDecision");
    setAwaitingDecision(true);
  }, []);

  const reset = () => {
    setIsWalking(false);
    setAwaitingDecision(false);
    setElapsedSeconds(0);
    setTotalDistanceMeters(0);
    totalDistanceRef.current = 0;
    setLastStepDeltaMeters(0);
    setSessionDeltasApplied(0);
    lastProcessedStepsRef.current = 0;
    const initial = viewFromPlace(destination);
    viewRef.current = initial;
    setView(initial);
    setBreadcrumbs([destination.startPosition]);
    breadcrumbsRef.current = [destination.startPosition];
    setStreetViewDebug(EMPTY_STREET_VIEW_DEBUG);
  };

  const distanceWalkedKm = totalDistanceMeters / 1000;

  return {
    view,
    setView,
    isWalking,
    setIsWalking,
    awaitingDecision,
    reset,
    totalDistanceMeters,
    distanceWalkedKm,
    breadcrumbs,
    elapsedSeconds,
    movementSource,
    lastStepDeltaMeters,
    sessionDeltasApplied,
    streetViewDebug,
    setStreetViewDebug,
    applyMovementDelta,
    recordUserPosition,
    resolveUserNavigation,
    pauseForDecision,
    resetStepProgress: () => {
      lastProcessedStepsRef.current = 0;
      setLastStepDeltaMeters(0);
    },
  };
}
