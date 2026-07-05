"use client";

import { formatElapsed } from "@/lib/geo";
import { GLASS_PANEL } from "@/lib/ui";
import type { WakeLockDisplayStatus } from "@/lib/wake-lock";

type WalkingHudProps = {
  destinationTitle: string;
  speedKmh: number;
  setSpeedKmh: (speed: number) => void;
  isWalking: boolean;
  wakeLockStatus: WakeLockDisplayStatus;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onExit: () => void;
  distanceWalkedKm: number;
  totalDistanceKm: number;
  elapsedSeconds: number;
  heading: number;
};

function WakeLockIndicator({
  status,
}: {
  status: WakeLockDisplayStatus;
}) {
  if (status === "active") {
    return (
      <p className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-800">
        <span aria-hidden="true">☀</span>
        Screen awake
      </p>
    );
  }

  if (status === "unavailable") {
    return (
      <p className="mt-2 flex items-center gap-1.5 text-[11px] text-zinc-600">
        <span aria-hidden="true">○</span>
        Wake lock unavailable
      </p>
    );
  }

  return null;
}

export function WalkingHud({
  destinationTitle,
  speedKmh,
  setSpeedKmh,
  isWalking,
  wakeLockStatus,
  onPause,
  onResume,
  onReset,
  onExit,
  distanceWalkedKm,
  totalDistanceKm,
  elapsedSeconds,
  heading,
}: WalkingHudProps) {
  const progressPercent =
    totalDistanceKm > 0
      ? Math.min(100, (distanceWalkedKm / totalDistanceKm) * 100)
      : 0;

  if (isWalking) {
    return (
      <div
        className={`absolute right-3 bottom-3 left-3 z-10 p-3 md:right-4 md:bottom-4 md:left-auto md:w-80 ${GLASS_PANEL}`}
      >
        <p className="truncate text-sm font-semibold text-zinc-900">
          {destinationTitle}
        </p>

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

        <p className="mt-1 text-xs text-zinc-700">
          {formatElapsed(elapsedSeconds)} · {speedKmh.toFixed(1)} km/h ·{" "}
          {heading.toFixed(0)}°
        </p>

        <WakeLockIndicator status={wakeLockStatus} />

        <button
          type="button"
          className="mt-3 min-h-14 w-full rounded-xl bg-zinc-900/90 text-base font-semibold text-white shadow-sm backdrop-blur-sm hover:bg-zinc-900 active:scale-[0.98]"
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
      className={`absolute right-3 bottom-3 left-3 z-10 p-3 md:right-4 md:bottom-4 md:left-auto md:w-80 ${GLASS_PANEL}`}
    >
      <p className="truncate text-sm font-semibold text-zinc-900">
        {destinationTitle}
      </p>

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

      <p className="mt-1 text-xs text-zinc-700">
        {formatElapsed(elapsedSeconds)} · {heading.toFixed(0)}°
      </p>

      <label className="mt-3 block text-xs text-zinc-800">
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

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className="min-h-12 flex-1 rounded-xl bg-zinc-900/90 text-sm font-medium text-white hover:bg-zinc-900 active:scale-[0.98]"
          onClick={onResume}
        >
          Resume
        </button>
        <button
          type="button"
          className="min-h-12 rounded-xl px-3 text-sm font-medium text-zinc-700 hover:text-zinc-900"
          onClick={onReset}
        >
          Reset
        </button>
      </div>

      <button
        type="button"
        className="mt-2 w-full rounded-lg py-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900"
        onClick={onExit}
      >
        Leave walk
      </button>
    </div>
  );
}
