"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Map } from "@vis.gl/react-google-maps";
import { ExplorationMapOverlay } from "@/components/map/ExplorationMapOverlay";
import { MapOverlayPanel } from "@/components/walk/MapOverlayPanel";
import { StreetViewPanel } from "@/components/walk/StreetViewPanel";
import { WalkingDebugPanel } from "@/components/walk/WalkingDebugPanel";
import { WalkingHud } from "@/components/walk/WalkingHud";
import { usePhoneStepCounter } from "@/hooks/usePhoneStepCounter";
import { useRemoteMovementSensor } from "@/hooks/useRemoteMovementSensor";
import { useWalkSession } from "@/hooks/useWalkSession";
import { useWakeLock } from "@/hooks/useWakeLock";
import { isRemoteStepSource } from "@/lib/movement-source";
import type { LatLng, MovementSource, WalkDestination } from "@/lib/types";
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
    useState<MovementSource>("phone-steps");
  const [mapPanelOpen, setMapPanelOpen] = useState(false);
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

  const { setStreetViewDebug, setIsWalking, applyMovementDelta, setView } =
    session;
  const isWalkingRef = useRef(session.isWalking);

  useEffect(() => {
    isWalkingRef.current = session.isWalking;
  }, [session.isWalking]);

  const handleRemoteConnectionLost = useCallback(() => {
    setIsWalking(false);
  }, [setIsWalking]);

  const handleRemoteMovementDelta = useCallback(
    (deltaMeters: number) => {
      if (!isWalkingRef.current) return;
      applyMovementDelta(deltaMeters);
    },
    [applyMovementDelta]
  );

  const remoteSensor = useRemoteMovementSensor({
    enabled: isRemoteStepSource(movementSource),
    onMovementDelta: handleRemoteMovementDelta,
    onConnectionLost: handleRemoteConnectionLost,
  });

  const disconnectRemoteSensor = remoteSensor.disconnect;
  const resetRemoteSensorStats = remoteSensor.resetStats;

  const wakeLockStatus = useWakeLock(session.isWalking);

  const handleStreetViewDebug = useCallback(
    (debug: StreetViewDebugState) => {
      setStreetViewDebug(debug);
    },
    [setStreetViewDebug]
  );

  const recordUserPosition = session.recordUserPosition;

  const handleUserNavigate = useCallback(
    (position: LatLng) => {
      recordUserPosition(position);
    },
    [recordUserPosition]
  );

  const walkDebug = useMemo<WalkDebugState>(
    () => ({
      movementSource,
      elapsedSeconds: session.elapsedSeconds,
      totalDistanceMeters: session.totalDistanceMeters,
      breadcrumbCount: session.breadcrumbs.length,
      lastStepDeltaMeters: session.lastStepDeltaMeters,
      streetView: session.streetViewDebug,
    }),
    [
      movementSource,
      session.elapsedSeconds,
      session.totalDistanceMeters,
      session.breadcrumbs.length,
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

      if (!isRemoteStepSource(source)) {
        disconnectRemoteSensor();
      }
    },
    [startPhoneSteps, stopPhoneSteps, disconnectRemoteSensor]
  );

  const handleReset = useCallback(() => {
    session.reset();
    resetPhoneSteps();
    resetRemoteSensorStats();
    session.resetStepProgress();
  }, [session, resetPhoneSteps, resetRemoteSensorStats]);

  const handleResume = useCallback(() => {
    if (movementSource === "phone-steps") {
      void startPhoneSteps();
    }
    setIsWalking(true);
  }, [movementSource, startPhoneSteps, setIsWalking]);

  const mapPanel = (
    <MapOverlayPanel
      open={mapPanelOpen}
      onClose={() => setMapPanelOpen(false)}
      destinationTitle={destination.title}
      place={destination.place}
      city={destination.city}
      country={destination.country}
      position={session.view.position}
      heading={session.view.heading}
      breadcrumbs={session.breadcrumbs}
      elapsedSeconds={session.elapsedSeconds}
      distanceWalkedKm={session.distanceWalkedKm}
    />
  );

  return (
    <div className="relative flex h-dvh w-full flex-col md:landscape:flex-row">
      <div className="relative hidden min-h-0 md:landscape:block md:landscape:w-1/3">
        <Map
          defaultCenter={destination.startPosition}
          defaultZoom={17}
          gestureHandling="greedy"
          disableDefaultUI
          style={{ width: "100%", height: "100%" }}
        >
          <ExplorationMapOverlay
            position={session.view.position}
            heading={session.view.heading}
            breadcrumbs={session.breadcrumbs}
          />
        </Map>
      </div>

      <div className="relative min-h-0 flex-1 md:landscape:w-2/3">
        <StreetViewPanel
          view={session.view}
          setView={session.setView}
          onStreetViewDebug={handleStreetViewDebug}
          onUserNavigate={handleUserNavigate}
        />

        <WalkingHud
          destinationTitle={destination.title}
          isWalking={session.isWalking}
          wakeLockStatus={wakeLockStatus}
          movementSource={movementSource}
          onMovementSourceChange={handleMovementSourceChange}
          phoneStepsSupported={isSupported}
          phoneStepsUnavailable={isUnavailable}
          steps={steps}
          strideLengthMeters={strideLengthMeters}
          setStrideLengthMeters={setStrideLengthMeters}
          remoteSensor={remoteSensor}
          onPause={() => setIsWalking(false)}
          onResume={handleResume}
          onReset={handleReset}
          onExit={onExit}
          distanceWalkedKm={session.distanceWalkedKm}
          elapsedSeconds={session.elapsedSeconds}
          heading={session.view.heading}
        />

        <WalkingDebugPanel debug={walkDebug} />

        <button
          type="button"
          onClick={() => setMapPanelOpen(true)}
          className={`absolute top-3 left-3 z-20 flex min-h-11 min-w-11 items-center justify-center rounded-full md:landscape:hidden ${GLASS_PANEL}`}
          aria-label="Open map"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5 text-zinc-800"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2V6z" />
            <path d="M9 4v14M15 6v14" />
          </svg>
        </button>
      </div>

      {mapPanel}

      <div
        className={`pointer-events-none absolute top-3 right-3 hidden px-3 py-2 md:landscape:block ${GLASS_PANEL}`}
      >
        <p className="text-xs font-semibold tracking-[0.2em] text-zinc-800 uppercase">
          World Walk
        </p>
        <p className="text-sm font-medium text-zinc-900">{destination.title}</p>
        <p className="text-xs text-zinc-600">
          {destination.city}, {destination.country}
        </p>
      </div>
    </div>
  );
}
