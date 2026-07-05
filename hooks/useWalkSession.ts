"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  getPathLengthMeters,
  viewFromRouteProgress,
} from "@/lib/geo";
import { logPhoneSteps } from "@/lib/step-counter";
import type { MovementSource, WalkDestination } from "@/lib/types";
import { EMPTY_STREET_VIEW_DEBUG, type StreetViewDebugState } from "@/lib/walk-debug";
import { advanceAlongPath, getRouteIndices } from "@/lib/walk-movement";

const DEFAULT_SPEED_KMH = 2.5;

type UseWalkSessionOptions = {
  movementSource: MovementSource;
  strideLengthMeters: number;
  steps: number;
};

export function useWalkSession(
  destination: WalkDestination,
  options: UseWalkSessionOptions = {
    movementSource: "manual",
    strideLengthMeters: 0.75,
    steps: 0,
  }
) {
  const { movementSource, strideLengthMeters, steps } = options;
  const points = destination.points;

  const [view, setView] = useState(() => viewFromRouteProgress(points, 0));
  const [speedKmh, setSpeedKmh] = useState(DEFAULT_SPEED_KMH);
  const [isWalking, setIsWalking] = useState(false);
  const [pathDistanceMeters, setPathDistanceMeters] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [lastStepDeltaMeters, setLastStepDeltaMeters] = useState(0);
  const [streetViewDebug, setStreetViewDebug] =
    useState<StreetViewDebugState>(EMPTY_STREET_VIEW_DEBUG);

  const lastProcessedStepsRef = useRef(0);

  const totalPathMeters = useMemo(
    () => getPathLengthMeters(points),
    [points]
  );

  const routeIndices = useMemo(
    () => getRouteIndices(points, pathDistanceMeters),
    [points, pathDistanceMeters]
  );

  const applyMovementDelta = (deltaMeters: number) => {
    if (deltaMeters <= 0) return;

    setLastStepDeltaMeters(deltaMeters);

    setPathDistanceMeters((currentDistance) => {
      const result = advanceAlongPath(
        points,
        currentDistance,
        totalPathMeters,
        deltaMeters
      );
      setView(result.view);

      if (result.reachedEnd) {
        setIsWalking(false);
      }

      return result.pathDistanceMeters;
    });
  };

  useEffect(() => {
    setView(viewFromRouteProgress(points, 0));
    setPathDistanceMeters(0);
    setElapsedSeconds(0);
    setIsWalking(false);
    setLastStepDeltaMeters(0);
    lastProcessedStepsRef.current = 0;
    setStreetViewDebug(EMPTY_STREET_VIEW_DEBUG);
  }, [destination.id, points]);

  useEffect(() => {
    if (!isWalking) return;

    const interval = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1);

      if (movementSource === "manual") {
        const metersPerSecond = (speedKmh * 1000) / 3600;
        applyMovementDelta(metersPerSecond);
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isWalking, movementSource, speedKmh, points, totalPathMeters]);

  useEffect(() => {
    if (!isWalking || movementSource !== "phone-steps") return;

    const deltaSteps = steps - lastProcessedStepsRef.current;
    if (deltaSteps <= 0) return;

    lastProcessedStepsRef.current = steps;
    const distanceMeters = deltaSteps * strideLengthMeters;
    setLastStepDeltaMeters(distanceMeters);
    logPhoneSteps(steps, deltaSteps, distanceMeters);
    applyMovementDelta(distanceMeters);
  }, [steps, isWalking, movementSource, strideLengthMeters, points, totalPathMeters]);

  const reset = () => {
    setIsWalking(false);
    setElapsedSeconds(0);
    setPathDistanceMeters(0);
    setLastStepDeltaMeters(0);
    lastProcessedStepsRef.current = 0;
    setView(viewFromRouteProgress(points, 0));
    setStreetViewDebug(EMPTY_STREET_VIEW_DEBUG);
  };

  const distanceWalkedKm = pathDistanceMeters / 1000;
  const totalDistanceKm = totalPathMeters / 1000;

  return {
    view,
    setView,
    speedKmh,
    setSpeedKmh,
    isWalking,
    setIsWalking,
    reset,
    pathDistanceMeters,
    distanceWalkedKm,
    totalDistanceKm,
    elapsedSeconds,
    movementSource,
    routeIndices,
    lastStepDeltaMeters,
    streetViewDebug,
    setStreetViewDebug,
    applyMovementDelta,
    resetStepProgress: () => {
      lastProcessedStepsRef.current = 0;
      setLastStepDeltaMeters(0);
    },
  };
}
