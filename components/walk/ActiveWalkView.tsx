"use client";

import { useEffect } from "react";
import { Map } from "@vis.gl/react-google-maps";
import { DestinationMapOverlay } from "@/components/map/DestinationMapOverlay";
import { StreetViewPanel } from "@/components/walk/StreetViewPanel";
import { WalkingHud } from "@/components/walk/WalkingHud";
import { useWalkSession } from "@/hooks/useWalkSession";
import { useWakeLock } from "@/hooks/useWakeLock";
import type { WalkDestination } from "@/lib/types";
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
  const session = useWalkSession(destination);
  const wakeLockStatus = useWakeLock(session.isWalking);

  const { setIsWalking } = session;

  useEffect(() => {
    if (autoStart) {
      setIsWalking(true);
    }
  }, [autoStart, destination.id, setIsWalking]);

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
          onPause={() => session.setIsWalking(false)}
          onResume={() => session.setIsWalking(true)}
          onReset={session.reset}
          onExit={onExit}
          distanceWalkedKm={session.distanceWalkedKm}
          totalDistanceKm={session.totalDistanceKm}
          elapsedSeconds={session.elapsedSeconds}
          heading={session.view.heading}
        />
      </div>

      <div className="relative min-h-0 flex-1">
        <StreetViewPanel
          view={session.view}
          setView={session.setView}
          routePoints={destination.points}
          pathDistanceMeters={session.pathDistanceMeters}
          isWalking={session.isWalking}
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
