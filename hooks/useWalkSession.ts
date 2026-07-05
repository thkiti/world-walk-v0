"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getPathLengthMeters,
  getRouteProgress,
  INITIAL_PITCH,
  viewFromRouteProgress,
} from "@/lib/geo";
import type { StreetViewState, WalkDestination } from "@/lib/types";

const DEFAULT_SPEED_KMH = 2.5;

export function useWalkSession(destination: WalkDestination) {
  const [view, setView] = useState<StreetViewState>(() =>
    viewFromRouteProgress(destination.points, 0)
  );
  const [speedKmh, setSpeedKmh] = useState(DEFAULT_SPEED_KMH);
  const [isWalking, setIsWalking] = useState(false);
  const [pathDistanceMeters, setPathDistanceMeters] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const totalPathMeters = useMemo(
    () => getPathLengthMeters(destination.points),
    [destination.points]
  );

  useEffect(() => {
    setView(viewFromRouteProgress(destination.points, 0));
    setPathDistanceMeters(0);
    setElapsedSeconds(0);
    setIsWalking(false);
  }, [destination.id, destination.points]);

  useEffect(() => {
    if (!isWalking) return;

    const metersPerSecond = (speedKmh * 1000) / 3600;

    const interval = window.setInterval(() => {
      setPathDistanceMeters((current) => {
        const next = Math.min(current + metersPerSecond, totalPathMeters);
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

      setElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isWalking, speedKmh, destination.points, totalPathMeters]);

  const reset = () => {
    setIsWalking(false);
    setElapsedSeconds(0);
    setPathDistanceMeters(0);
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
  };
}
