"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Map } from "@vis.gl/react-google-maps";
import { DestinationMapOverlay } from "@/components/map/DestinationMapOverlay";
import { StreetViewPanel } from "@/components/walk/StreetViewPanel";
import { WalkingDebugPanel } from "@/components/walk/WalkingDebugPanel";
import { WalkingHud } from "@/components/walk/WalkingHud";
import { usePhoneStepCounter } from "@/hooks/usePhoneStepCounter";
import { useWalkSession } from "@/hooks/useWalkSession";
import { useWakeLock } from "@/hooks/useWakeLock";
import type { MovementSource, WalkDestination } from "@/lib/types";
import type { StreetViewDebugState, WalkDebugState } from "@/lib/walk-debug";
import { GLASS_PANEL } from "@/lib/ui";

type ActiveWalkViewProps = {
  destination: WalkDestination;
  autoStart?: boolean;
  onExit: () => void;
};

export function ActiveWalkView({
  destination,
  autoStart = true,
  onExit,
}: ActiveWalkViewProps) {
  const [movementSource, setMovementSource] =
    useState<MovementSource>("manual");
  const phoneSteps = usePhoneStepCounter();
  const {
    steps,
    isSupported,
    isUnavailable,
    strideLengthMeters,
    setStrideLengthMeters,
    start: startPhoneSteps,
    stop: stopPhoneSteps,
    reset: resetPhoneSteps,
  } = phoneSteps;

  const session = useWalkSession(destination, {
    movementSource,
    strideLengthMeters,
    steps,
  });

  const { setStreetViewDebug, setIsWalking } = session;

  const wakeLockStatus = useWakeLock(session.isWalking);

  const handleStreetViewDebug = useCallback(
    (debug: StreetViewDebugState) => {
      setStreetViewDebug(debug);
    },
    [setStreetViewDebug]
  );

  const walkDebug = useMemo<WalkDebugState>(
    () => ({
      movementSource,
      elapsedSeconds: session.elapsedSeconds,
      pathDistanceMeters: session.pathDistanceMeters,
      currentRouteIndex: session.routeIndices.currentIndex,
      nextRouteIndex: session.routeIndices.nextIndex,
      lastStepDeltaMeters: session.lastStepDeltaMeters,
      streetView: session.streetViewDebug,
    }),
    [
      movementSource,
      session.elapsedSeconds,
      session.pathDistanceMeters,
      session.routeIndices,
      session.lastStepDeltaMeters,
      session.streetViewDebug,
    ]
  );

  useEffect(() => {
    if (autoStart) {
      setIsWalking(true);
    }
  }, [autoStart, destination.id, setIsWalking]);

  useEffect(() => {
    if (session.isWalking && movementSource === "phone-steps") {
      void startPhoneSteps();
      return;
    }

    stopPhoneSteps();
  }, [session.isWalking, movementSource, startPhoneSteps, stopPhoneSteps]);

  const handleMovementSourceChange = useCallback(
    (source: MovementSource) => {
      setMovementSource(source);

      if (source === "phone-steps") {
        void startPhoneSteps();
        return;
      }

      stopPhoneSteps();
    },
    [startPhoneSteps, stopPhoneSteps]
  );

  const handleReset = useCallback(() => {
    session.reset();
    resetPhoneSteps();
    session.resetStepProgress();
  }, [session, resetPhoneSteps]);

  const handleResume = useCallback(() => {
    if (movementSource === "phone-steps") {
      void startPhoneSteps();
    }
    setIsWalking(true);
  }, [movementSource, startPhoneSteps, setIsWalking]);

  return (
    <div className="relative flex h-dvh w-full flex-col md:flex-row">
      <div className="relative min-h-0 flex-1">
        <Map
          defaultCenter={destination.points[0]}
          defaultZoom={17}
          gestureHandling="greedy"
          style={{ width: "100%", height: "100%" }}
        >
          <DestinationMapOverlay
            points={destination.points}
            currentPosition={session.view.position}
            showCurrentPosition
          />
        </Map>

        <WalkingHud
          destinationTitle={destination.title}
          speedKmh={session.speedKmh}
          setSpeedKmh={session.setSpeedKmh}
          isWalking={session.isWalking}
          wakeLockStatus={wakeLockStatus}
          movementSource={movementSource}
          onMovementSourceChange={handleMovementSourceChange}
          phoneStepsSupported={isSupported}
          phoneStepsUnavailable={isUnavailable}
          steps={steps}
          strideLengthMeters={strideLengthMeters}
          setStrideLengthMeters={setStrideLengthMeters}
          onPause={() => setIsWalking(false)}
          onResume={handleResume}
          onReset={handleReset}
          onExit={onExit}
          distanceWalkedKm={session.distanceWalkedKm}
          totalDistanceKm={session.totalDistanceKm}
          elapsedSeconds={session.elapsedSeconds}
          heading={session.view.heading}
        />

        <WalkingDebugPanel debug={walkDebug} />
      </div>

      <div className="relative min-h-0 flex-1">
        <StreetViewPanel
          view={session.view}
          setView={session.setView}
          routePoints={destination.points}
          pathDistanceMeters={session.pathDistanceMeters}
          isWalking={session.isWalking}
          onStreetViewDebug={handleStreetViewDebug}
        />
      </div>

      <div
        className={`pointer-events-none absolute top-3 left-3 px-3 py-2 md:top-4 md:left-4 ${GLASS_PANEL}`}
      >
        <p className="text-xs font-semibold tracking-[0.2em] text-zinc-800 uppercase">
          World Walk
        </p>
        <p className="text-sm font-medium text-zinc-900">{destination.title}</p>
      </div>
    </div>
  );
}
