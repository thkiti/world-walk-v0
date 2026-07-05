"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  APIProvider,
  Map,
  Marker,
  Polyline,
  useApiIsLoaded,
} from "@vis.gl/react-google-maps";

const EIFFEL_TOWER = { lat: 48.85837, lng: 2.294481 };
const INITIAL_HEADING = 34;
const INITIAL_PITCH = 0;
const TURN_DEGREES = 15;
const FORWARD_METERS = 10;
const DEFAULT_SPEED_KMH = 2.5;
const EARTH_RADIUS_METERS = 6378137;

type LatLng = google.maps.LatLngLiteral;

type Route = {
  id: string;
  name: string;
  points: LatLng[];
};

const ROUTES: Record<string, Route> = {
  "champs-elysees": {
    id: "champs-elysees",
    name: "Champs-Élysées → Arc de Triomphe",
    points: [
      { lat: 48.86563, lng: 2.32124 },
      { lat: 48.86655, lng: 2.31688 },
      { lat: 48.86749, lng: 2.31249 },
      { lat: 48.86845, lng: 2.30811 },
      { lat: 48.86942, lng: 2.30372 },
      { lat: 48.87034, lng: 2.29935 },
      { lat: 48.87124, lng: 2.29504 },
      { lat: 48.87219, lng: 2.29069 },
      { lat: 48.87308, lng: 2.28636 },
      { lat: 48.87379, lng: 2.28247 },
      { lat: 48.87378, lng: 2.27972 },
    ],
  },
};

type StreetViewState = {
  position: LatLng;
  heading: number;
  pitch: number;
};

type RouteProgress = {
  position: LatLng;
  heading: number;
  atEnd: boolean;
};

function haversineDistance(a: LatLng, b: LatLng): number {
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const dLat = lat2 - lat1;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

function getRouteLengthMeters(points: LatLng[]): number {
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += haversineDistance(points[i], points[i + 1]);
  }
  return total;
}

function bearing(from: LatLng, to: LatLng): number {
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function getRouteProgress(points: LatLng[], distanceMeters: number): RouteProgress {
  if (points.length < 2) {
    throw new Error("Route needs at least 2 points");
  }

  if (distanceMeters <= 0) {
    return {
      position: points[0],
      heading: bearing(points[0], points[1]),
      atEnd: false,
    };
  }

  const totalLength = getRouteLengthMeters(points);
  if (distanceMeters >= totalLength) {
    const last = points[points.length - 1];
    const prev = points[points.length - 2];
    return {
      position: last,
      heading: bearing(prev, last),
      atEnd: true,
    };
  }

  let traveled = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const segmentLength = haversineDistance(points[i], points[i + 1]);
    if (traveled + segmentLength >= distanceMeters) {
      const t = (distanceMeters - traveled) / segmentLength;
      const position = {
        lat: points[i].lat + (points[i + 1].lat - points[i].lat) * t,
        lng: points[i].lng + (points[i + 1].lng - points[i].lng) * t,
      };
      return {
        position,
        heading: bearing(position, points[i + 1]),
        atEnd: false,
      };
    }
    traveled += segmentLength;
  }

  const last = points[points.length - 1];
  const prev = points[points.length - 2];
  return {
    position: last,
    heading: bearing(prev, last),
    atEnd: true,
  };
}

function moveForward(
  position: LatLng,
  heading: number,
  distanceMeters: number
): LatLng {
  const headingRad = (heading * Math.PI) / 180;
  const latRad = (position.lat * Math.PI) / 180;
  const lngRad = (position.lng * Math.PI) / 180;
  const angularDistance = distanceMeters / EARTH_RADIUS_METERS;

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

function viewFromRouteProgress(points: LatLng[], distanceMeters: number): StreetViewState {
  const progress = getRouteProgress(points, distanceMeters);
  return {
    position: progress.position,
    heading: progress.heading,
    pitch: INITIAL_PITCH,
  };
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
      position: view.position,
      pov: { heading: view.heading, pitch: view.pitch },
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

const GLASS_PANEL =
  "rounded-xl border border-white/50 bg-white/30 shadow-lg backdrop-blur-md";

type RouteMapOverlayProps = {
  route: Route;
  currentPosition: LatLng;
};

function RouteMapOverlay({ route, currentPosition }: RouteMapOverlayProps) {
  const apiIsLoaded = useApiIsLoaded();
  if (!apiIsLoaded) return null;

  const start = route.points[0];
  const end = route.points[route.points.length - 1];

  const dotIcon = (color: string, scale: number) => ({
    path: google.maps.SymbolPath.CIRCLE,
    scale,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: "#ffffff",
    strokeWeight: 2,
  });

  return (
    <>
      <Polyline
        path={route.points}
        strokeColor="#2563eb"
        strokeOpacity={0.9}
        strokeWeight={5}
      />
      <Marker
        position={start}
        title="Start"
        icon={dotIcon("#22c55e", 9)}
        zIndex={1}
      />
      <Marker
        position={end}
        title="End"
        icon={dotIcon("#ef4444", 9)}
        zIndex={1}
      />
      <Marker
        position={currentPosition}
        title="You are here"
        icon={dotIcon("#2563eb", 11)}
        zIndex={2}
      />
    </>
  );
}

type WalkingModePanelProps = {
  selectedRouteId: string | null;
  onRouteChange: (routeId: string | null) => void;
  speedKmh: number;
  setSpeedKmh: React.Dispatch<React.SetStateAction<number>>;
  isWalking: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  routeName: string | null;
  distanceWalkedKm: number;
  totalDistanceKm: number | null;
  elapsedSeconds: number;
};

function WalkingModePanel({
  selectedRouteId,
  onRouteChange,
  speedKmh,
  setSpeedKmh,
  isWalking,
  onStart,
  onPause,
  onReset,
  routeName,
  distanceWalkedKm,
  totalDistanceKm,
  elapsedSeconds,
}: WalkingModePanelProps) {
  const progressPercent =
    totalDistanceKm && totalDistanceKm > 0
      ? Math.min(100, (distanceWalkedKm / totalDistanceKm) * 100)
      : 0;

  if (isWalking) {
    return (
      <div
        className={`absolute bottom-4 left-3 w-[min(100%-1.5rem,20rem)] p-3 ${GLASS_PANEL}`}
      >
        <p className="truncate text-sm font-semibold text-zinc-900">
          {routeName ?? "Free walk"}
        </p>

        {totalDistanceKm !== null && (
          <div className="mt-2">
            <div className="h-1.5 overflow-hidden rounded-full bg-black/10">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs font-medium text-zinc-800">
              {distanceWalkedKm.toFixed(2)} / {totalDistanceKm.toFixed(2)} km
            </p>
          </div>
        )}

        {totalDistanceKm === null && (
          <p className="mt-2 text-xs font-medium text-zinc-800">
            {distanceWalkedKm.toFixed(2)} km walked
          </p>
        )}

        <p className="mt-1 text-xs text-zinc-700">
          {formatElapsed(elapsedSeconds)} · {speedKmh.toFixed(1)} km/h
        </p>

        <button
          type="button"
          className="mt-3 w-full rounded-lg bg-zinc-900/90 py-3 text-base font-semibold text-white shadow-sm backdrop-blur-sm hover:bg-zinc-900"
          onClick={onPause}
        >
          Pause
        </button>
        <button
          type="button"
          className="mt-2 w-full rounded-lg py-1.5 text-xs font-medium text-zinc-700 hover:text-zinc-900"
          onClick={onReset}
        >
          Reset
        </button>
      </div>
    );
  }

  return (
    <div
      className={`absolute bottom-4 left-3 w-[min(100%-1.5rem,20rem)] p-3 ${GLASS_PANEL}`}
    >
      <h2 className="text-xs font-semibold tracking-wide text-zinc-800 uppercase">
        Walking Mode
      </h2>

      <label className="mt-2 block text-xs text-zinc-800">
        Route
        <select
          value={selectedRouteId ?? ""}
          onChange={(event) =>
            onRouteChange(event.target.value ? event.target.value : null)
          }
          className="mt-1 w-full rounded-lg border border-white/60 bg-white/50 px-2 py-1.5 text-sm backdrop-blur-sm"
        >
          <option value="">Free walk</option>
          {Object.values(ROUTES).map((route) => (
            <option key={route.id} value={route.id}>
              {route.name}
            </option>
          ))}
        </select>
      </label>

      <label className="mt-2 block text-xs text-zinc-800">
        Speed: {speedKmh.toFixed(1)} km/h
        <input
          type="range"
          min={0.5}
          max={10}
          step={0.1}
          value={speedKmh}
          onChange={(event) => setSpeedKmh(Number(event.target.value))}
          className="mt-1 w-full"
        />
      </label>

      {routeName && totalDistanceKm !== null && (
        <p className="mt-2 text-xs text-zinc-700">
          {routeName} · {totalDistanceKm.toFixed(2)} km
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className="flex-1 rounded-lg bg-zinc-900/90 py-2 text-sm font-medium text-white hover:bg-zinc-900"
          onClick={onStart}
        >
          Start
        </button>
        <button
          type="button"
          className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:text-zinc-900"
          onClick={onReset}
        >
          Reset
        </button>
      </div>
    </div>
  );
}

function WorldWalk() {
  const defaultRoute = ROUTES["champs-elysees"];
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(
    defaultRoute.id
  );
  const [view, setView] = useState<StreetViewState>(() =>
    viewFromRouteProgress(defaultRoute.points, 0)
  );
  const [speedKmh, setSpeedKmh] = useState(DEFAULT_SPEED_KMH);
  const [isWalking, setIsWalking] = useState(false);
  const [routeDistanceMeters, setRouteDistanceMeters] = useState(0);
  const [freeDistanceKm, setFreeDistanceKm] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const selectedRoute = selectedRouteId ? ROUTES[selectedRouteId] : null;
  const totalRouteMeters = useMemo(
    () => (selectedRoute ? getRouteLengthMeters(selectedRoute.points) : null),
    [selectedRoute]
  );

  useEffect(() => {
    if (!isWalking) return;

    const metersPerSecond = (speedKmh * 1000) / 3600;

    const interval = window.setInterval(() => {
      if (selectedRoute && totalRouteMeters !== null) {
        setRouteDistanceMeters((current) => {
          const next = Math.min(current + metersPerSecond, totalRouteMeters);
          const progress = getRouteProgress(selectedRoute.points, next);

          setView({
            position: progress.position,
            heading: progress.heading,
            pitch: INITIAL_PITCH,
          });

          if (next >= totalRouteMeters) {
            setIsWalking(false);
          }

          return next;
        });
      } else {
        setView((current) => ({
          ...current,
          position: moveForward(
            current.position,
            current.heading,
            metersPerSecond
          ),
        }));
        setFreeDistanceKm((current) => current + metersPerSecond / 1000);
      }

      setElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isWalking, speedKmh, selectedRoute, totalRouteMeters]);

  const handleRouteChange = (routeId: string | null) => {
    setIsWalking(false);
    setElapsedSeconds(0);
    setRouteDistanceMeters(0);
    setFreeDistanceKm(0);
    setSelectedRouteId(routeId);

    if (routeId && ROUTES[routeId]) {
      setView(viewFromRouteProgress(ROUTES[routeId].points, 0));
      return;
    }

    setView({
      position: EIFFEL_TOWER,
      heading: INITIAL_HEADING,
      pitch: INITIAL_PITCH,
    });
  };

  const handleReset = () => {
    setIsWalking(false);
    setElapsedSeconds(0);
    setRouteDistanceMeters(0);
    setFreeDistanceKm(0);

    if (selectedRoute) {
      setView(viewFromRouteProgress(selectedRoute.points, 0));
      return;
    }

    setView({
      position: EIFFEL_TOWER,
      heading: INITIAL_HEADING,
      pitch: INITIAL_PITCH,
    });
  };

  const distanceWalkedKm = selectedRoute
    ? routeDistanceMeters / 1000
    : freeDistanceKm;
  const totalDistanceKm = totalRouteMeters !== null ? totalRouteMeters / 1000 : null;
  const mapCenter = selectedRoute?.points[0] ?? EIFFEL_TOWER;

  return (
    <div className="relative flex h-dvh w-full flex-col md:flex-row">
      <div className="relative min-h-0 flex-1">
        <Map
          defaultCenter={mapCenter}
          defaultZoom={17}
          gestureHandling="greedy"
          style={{ width: "100%", height: "100%" }}
        >
          {selectedRoute && (
            <RouteMapOverlay
              route={selectedRoute}
              currentPosition={view.position}
            />
          )}
        </Map>

        <WalkingModePanel
          selectedRouteId={selectedRouteId}
          onRouteChange={handleRouteChange}
          speedKmh={speedKmh}
          setSpeedKmh={setSpeedKmh}
          isWalking={isWalking}
          onStart={() => setIsWalking(true)}
          onPause={() => setIsWalking(false)}
          onReset={handleReset}
          routeName={selectedRoute?.name ?? null}
          distanceWalkedKm={distanceWalkedKm}
          totalDistanceKm={totalDistanceKm}
          elapsedSeconds={elapsedSeconds}
        />
      </div>

      <div className="relative min-h-0 flex-1">
        <StreetViewPanel view={view} setView={setView} />
      </div>

      <div
        className={`pointer-events-none absolute top-4 left-4 px-3 py-2 ${GLASS_PANEL}`}
      >
        <h1 className="text-sm font-semibold text-zinc-900">World Walk</h1>
        <p className="text-xs text-zinc-700">
          {selectedRoute?.name ?? "Eiffel Tower • Street View"}
        </p>
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
