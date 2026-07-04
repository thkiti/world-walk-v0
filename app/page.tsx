"use client";

import { useEffect, useRef, useState } from "react";
import { APIProvider, Map, useApiIsLoaded } from "@vis.gl/react-google-maps";

const EIFFEL_TOWER = { lat: 48.85837, lng: 2.294481 };
const INITIAL_HEADING = 34;
const INITIAL_PITCH = 0;
const TURN_DEGREES = 15;
const FORWARD_METERS = 10;
const DEFAULT_SPEED_KMH = 2.5;

type StreetViewState = {
  position: google.maps.LatLngLiteral;
  heading: number;
  pitch: number;
};

function moveForward(
  position: google.maps.LatLngLiteral,
  heading: number,
  distanceMeters: number
): google.maps.LatLngLiteral {
  const earthRadius = 6378137;
  const headingRad = (heading * Math.PI) / 180;
  const latRad = (position.lat * Math.PI) / 180;
  const lngRad = (position.lng * Math.PI) / 180;
  const angularDistance = distanceMeters / earthRadius;

  const newLatRad = Math.asin(
    Math.sin(latRad) * Math.cos(angularDistance) +
      Math.cos(latRad) * Math.sin(angularDistance) * Math.cos(headingRad)
  );
  const newLngRad =
    lngRad +
    Math.atan2(
      Math.sin(headingRad) * Math.sin(angularDistance) * Math.cos(latRad),
      Math.cos(angularDistance) - Math.sin(latRad) * Math.sin(newLatRad)
    );

  return {
    lat: (newLatRad * 180) / Math.PI,
    lng: (newLngRad * 180) / Math.PI,
  };
}

function formatElapsed(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

type StreetViewPanelProps = {
  view: StreetViewState;
  setView: React.Dispatch<React.SetStateAction<StreetViewState>>;
};

function StreetViewPanel({ view, setView }: StreetViewPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const panoramaRef = useRef<google.maps.StreetViewPanorama | null>(null);
  const apiIsLoaded = useApiIsLoaded();

  useEffect(() => {
    if (!apiIsLoaded || !containerRef.current) return;

    const panorama = new google.maps.StreetViewPanorama(containerRef.current, {
      position: EIFFEL_TOWER,
      pov: { heading: INITIAL_HEADING, pitch: INITIAL_PITCH },
    });
    panoramaRef.current = panorama;

    return () => {
      panorama.setVisible(false);
      panoramaRef.current = null;
    };
  }, [apiIsLoaded]);

  useEffect(() => {
    const panorama = panoramaRef.current;
    if (!panorama) return;

    panorama.setPosition(view.position);
    panorama.setPov({ heading: view.heading, pitch: view.pitch });
  }, [view]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />

      <div className="absolute right-4 bottom-4 left-4 flex flex-col gap-3">
        <div className="rounded-lg bg-white/90 px-3 py-2 font-mono text-xs text-zinc-700 shadow-md backdrop-blur-sm">
          <p>lat: {view.position.lat.toFixed(6)}</p>
          <p>lng: {view.position.lng.toFixed(6)}</p>
          <p>heading: {view.heading.toFixed(1)}°</p>
        </div>

        <div className="flex justify-center gap-2">
          <button
            type="button"
            className="rounded-lg bg-white/90 px-4 py-2 text-sm font-medium text-zinc-900 shadow-md backdrop-blur-sm hover:bg-white"
            onClick={() =>
              setView((current) => ({
                ...current,
                heading: current.heading - TURN_DEGREES,
              }))
            }
          >
            Turn Left
          </button>
          <button
            type="button"
            className="rounded-lg bg-white/90 px-4 py-2 text-sm font-medium text-zinc-900 shadow-md backdrop-blur-sm hover:bg-white"
            onClick={() =>
              setView((current) => ({
                ...current,
                position: moveForward(
                  current.position,
                  current.heading,
                  FORWARD_METERS
                ),
              }))
            }
          >
            Forward
          </button>
          <button
            type="button"
            className="rounded-lg bg-white/90 px-4 py-2 text-sm font-medium text-zinc-900 shadow-md backdrop-blur-sm hover:bg-white"
            onClick={() =>
              setView((current) => ({
                ...current,
                heading: current.heading + TURN_DEGREES,
              }))
            }
          >
            Turn Right
          </button>
        </div>
      </div>
    </div>
  );
}

type WalkingModePanelProps = {
  speedKmh: number;
  setSpeedKmh: React.Dispatch<React.SetStateAction<number>>;
  isWalking: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  distanceKm: number;
  elapsedSeconds: number;
  heading: number;
};

function WalkingModePanel({
  speedKmh,
  setSpeedKmh,
  isWalking,
  onStart,
  onPause,
  onReset,
  distanceKm,
  elapsedSeconds,
  heading,
}: WalkingModePanelProps) {
  return (
    <div className="absolute right-4 bottom-4 left-4 rounded-lg bg-white/90 p-4 shadow-md backdrop-blur-sm">
      <h2 className="mb-3 text-sm font-semibold text-zinc-900">Walking Mode</h2>

      <label className="mb-3 block text-sm text-zinc-700">
        Speed: {speedKmh.toFixed(1)} km/h
        <input
          type="range"
          min={0.5}
          max={10}
          step={0.1}
          value={speedKmh}
          onChange={(event) => setSpeedKmh(Number(event.target.value))}
          className="mt-2 w-full"
        />
      </label>

      <div className="mb-3 grid grid-cols-2 gap-2 font-mono text-xs text-zinc-700">
        <p>Speed: {speedKmh.toFixed(1)} km/h</p>
        <p>Distance: {distanceKm.toFixed(3)} km</p>
        <p>Elapsed: {formatElapsed(elapsedSeconds)}</p>
        <p>Heading: {heading.toFixed(1)}°</p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={isWalking}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          onClick={onStart}
        >
          Start
        </button>
        <button
          type="button"
          disabled={!isWalking}
          className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-900 ring-1 ring-zinc-300 disabled:opacity-40"
          onClick={onPause}
        >
          Pause
        </button>
        <button
          type="button"
          className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-900 ring-1 ring-zinc-300"
          onClick={onReset}
        >
          Reset
        </button>
      </div>
    </div>
  );
}

function WorldWalk() {
  const [view, setView] = useState<StreetViewState>({
    position: EIFFEL_TOWER,
    heading: INITIAL_HEADING,
    pitch: INITIAL_PITCH,
  });
  const [speedKmh, setSpeedKmh] = useState(DEFAULT_SPEED_KMH);
  const [isWalking, setIsWalking] = useState(false);
  const [distanceKm, setDistanceKm] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!isWalking) return;

    const metersPerSecond = (speedKmh * 1000) / 3600;

    const interval = window.setInterval(() => {
      setView((current) => ({
        ...current,
        position: moveForward(
          current.position,
          current.heading,
          metersPerSecond
        ),
      }));
      setDistanceKm((current) => current + metersPerSecond / 1000);
      setElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isWalking, speedKmh]);

  const handleReset = () => {
    setIsWalking(false);
    setDistanceKm(0);
    setElapsedSeconds(0);
  };

  return (
    <div className="relative flex h-dvh w-full flex-col md:flex-row">
      <div className="relative min-h-0 flex-1">
        <Map
          defaultCenter={EIFFEL_TOWER}
          defaultZoom={17}
          gestureHandling="greedy"
          style={{ width: "100%", height: "100%" }}
        />

        <WalkingModePanel
          speedKmh={speedKmh}
          setSpeedKmh={setSpeedKmh}
          isWalking={isWalking}
          onStart={() => setIsWalking(true)}
          onPause={() => setIsWalking(false)}
          onReset={handleReset}
          distanceKm={distanceKm}
          elapsedSeconds={elapsedSeconds}
          heading={view.heading}
        />
      </div>

      <div className="relative min-h-0 flex-1">
        <StreetViewPanel view={view} setView={setView} />
      </div>

      <div className="pointer-events-none absolute top-4 left-4 rounded-lg bg-white/90 px-4 py-3 shadow-md backdrop-blur-sm">
        <h1 className="text-lg font-semibold text-zinc-900">World Walk</h1>
        <p className="text-sm text-zinc-600">Eiffel Tower • Street View</p>
      </div>
    </div>
  );
}

export default function Home() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <div className="flex h-dvh items-center justify-center p-6 text-center">
        <p>Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env.local</p>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey}>
      <WorldWalk />
    </APIProvider>
  );
}
