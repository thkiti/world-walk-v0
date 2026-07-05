"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  getPathLengthMeters,
  getRouteProgress,
  INITIAL_PITCH,
  viewFromRouteProgress,
} from "@/lib/geo";
import { logPhoneSteps } from "@/lib/step-counter";
import type { MovementSource, StreetViewState, WalkDestination } from "@/lib/types";

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

  const [view, setView] = useState<StreetViewState>(() =>
    viewFromRouteProgress(destination.points, 0)
  );
  const [speedKmh, setSpeedKmh] = useState(DEFAULT_SPEED_KMH);
  const [isWalking, setIsWalking] = useState(false);
  const [pathDistanceMeters, setPathDistanceMeters] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const lastProcessedStepsRef = useRef(0);

  const totalPathMeters = useMemo(
    () => getPathLengthMeters(destination.points),
    [destination.points]
  );

  const advancePathDistance = (meters: number) => {
    setPathDistanceMeters((current) => {
      const next = Math.min(current + meters, totalPathMeters);
      const progress = getRouteProgress(destination.points, next);

      setView({
        position: progress.position,
        heading: progress.heading,
        pitch: INITIAL_PITCH,
      });

      if (next >= totalPathMeters) {
        setIsWalking(false);
      }

      return next;
    });
  };

  useEffect(() => {
    setView(viewFromRouteProgress(destination.points, 0));
    setPathDistanceMeters(0);
    setElapsedSeconds(0);
    setIsWalking(false);
    lastProcessedStepsRef.current = 0;
  }, [destination.id, destination.points]);

  useEffect(() => {
    if (!isWalking || movementSource !== "manual") return;

    const metersPerSecond = (speedKmh * 1000) / 3600;

    const interval = window.setInterval(() => {
      advancePathDistance(metersPerSecond);
      setElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isWalking, speedKmh, movementSource, destination.points, totalPathMeters]);

  useEffect(() => {
    if (!isWalking || movementSource !== "phone-steps") return;

    const interval = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isWalking, movementSource]);

  useEffect(() => {
    if (!isWalking || movementSource !== "phone-steps") return;

    const deltaSteps = steps - lastProcessedStepsRef.current;
    if (deltaSteps <= 0) return;

    lastProcessedStepsRef.current = steps;
    const distanceMeters = deltaSteps * strideLengthMeters;
    logPhoneSteps(steps, deltaSteps, distanceMeters);
    advancePathDistance(distanceMeters);
  }, [steps, isWalking, movementSource, strideLengthMeters, destination.points, totalPathMeters]);

  const reset = () => {
    setIsWalking(false);
    setElapsedSeconds(0);
    setPathDistanceMeters(0);
    lastProcessedStepsRef.current = 0;
    setView(viewFromRouteProgress(destination.points, 0));
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
    resetStepProgress: () => {
      lastProcessedStepsRef.current = 0;
    },
  };
}
