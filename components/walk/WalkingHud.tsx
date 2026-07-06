"use client";

import { formatElapsed } from "@/lib/geo";
import { MOVEMENT_SOURCE_LABELS } from "@/lib/movement-source";
import { estimatePaceKmh, stepsToDistanceMeters } from "@/lib/step-counter";
import { GLASS_PANEL } from "@/lib/ui";
import type { MovementSource } from "@/lib/types";
import type { WakeLockDisplayStatus } from "@/lib/wake-lock";
import {
  RemoteSensorActiveStatus,
  RemoteSensorControls,
} from "@/components/walk/RemoteSensorControls";
import type { useRemoteMovementSensor } from "@/hooks/useRemoteMovementSensor";

type RemoteSensorState = ReturnType<typeof useRemoteMovementSensor>;

type WalkingHudProps = {
  destinationTitle: string;
  isWalking: boolean;
  wakeLockStatus: WakeLockDisplayStatus;
  movementSource: MovementSource;
  onMovementSourceChange: (source: MovementSource) => void;
  phoneStepsSupported: boolean;
  phoneStepsUnavailable: boolean;
  steps: number;
  strideLengthMeters: number;
  setStrideLengthMeters: (stride: number) => void;
  remoteSensor: RemoteSensorState;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onExit: () => void;
  distanceWalkedKm: number;
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
  isWalking,
  wakeLockStatus,
  movementSource,
  onMovementSourceChange,
  phoneStepsSupported,
  phoneStepsUnavailable,
  steps,
  strideLengthMeters,
  setStrideLengthMeters,
  remoteSensor,
  onPause,
  onResume,
  onReset,
  onExit,
  distanceWalkedKm,
  elapsedSeconds,
  heading,
}: WalkingHudProps) {
  const stepDistanceMeters = stepsToDistanceMeters(steps, strideLengthMeters);
  const estimatedPaceKmh = estimatePaceKmh(stepDistanceMeters, elapsedSeconds);
  const remotePaceKmh = estimatePaceKmh(
    remoteSensor.receivedDistanceMeters,
    elapsedSeconds
  );

  if (isWalking) {
    return (
      <div
        className={`absolute right-3 bottom-3 left-3 z-10 p-3 md:right-4 md:bottom-4 md:left-auto md:w-72 ${GLASS_PANEL}`}
      >
        <p className="truncate text-sm font-semibold text-zinc-900">
          {destinationTitle}
        </p>

        <p className="mt-1 text-xs text-zinc-700">
          {formatElapsed(elapsedSeconds)} · {heading.toFixed(0)}° facing
        </p>

        <p className="mt-0.5 text-xs text-zinc-600">
          {distanceWalkedKm.toFixed(2)} km walked
        </p>

        {movementSource === "phone-steps" && (
          <p className="mt-1 text-[11px] text-zinc-600">
            {steps} steps · {estimatedPaceKmh.toFixed(1)} km/h pace
          </p>
        )}

        {movementSource === "remote-phone-sensor" && (
          <RemoteSensorActiveStatus
            connectionStatus={remoteSensor.connectionStatus}
            sensorPeerConnected={remoteSensor.sensorPeerConnected}
            receivedSteps={remoteSensor.receivedSteps}
            receivedDistanceMeters={remoteSensor.receivedDistanceMeters}
          />
        )}

        <WakeLockIndicator status={wakeLockStatus} />

        <button
          type="button"
          className="mt-3 min-h-12 w-full rounded-xl bg-zinc-900/90 text-sm font-semibold text-white shadow-sm backdrop-blur-sm hover:bg-zinc-900 active:scale-[0.98]"
          onClick={onPause}
        >
          Pause
        </button>
        <button
          type="button"
          className="mt-2 w-full rounded-lg py-1.5 text-xs font-medium text-zinc-700 hover:text-zinc-900"
          onClick={onReset}
        >
          Reset position
        </button>
      </div>
    );
  }

  return (
    <div
      className={`absolute right-3 bottom-3 left-3 z-10 p-3 md:right-4 md:bottom-4 md:left-auto md:w-72 ${GLASS_PANEL}`}
    >
      <p className="truncate text-sm font-semibold text-zinc-900">
        {destinationTitle}
      </p>

      <p className="mt-1 text-xs text-zinc-700">
        {formatElapsed(elapsedSeconds)} · {heading.toFixed(0)}° ·{" "}
        {distanceWalkedKm.toFixed(2)} km walked
      </p>

      <label className="mt-3 block text-xs text-zinc-800">
        Movement
        <select
          value={movementSource}
          onChange={(event) =>
            onMovementSourceChange(event.target.value as MovementSource)
          }
          className="mt-1 w-full rounded-lg border border-white/60 bg-white/50 px-2 py-1.5 text-sm backdrop-blur-sm"
        >
          {(Object.keys(MOVEMENT_SOURCE_LABELS) as MovementSource[]).map(
            (source) => (
              <option key={source} value={source}>
                {MOVEMENT_SOURCE_LABELS[source]}
              </option>
            )
          )}
        </select>
      </label>

      {movementSource === "phone-steps" && (
        <div className="mt-2 space-y-2 text-xs text-zinc-800">
          {!phoneStepsSupported || phoneStepsUnavailable ? (
            <p className="text-zinc-600">
              Phone steps unavailable on this device. Try remote phone sensor.
            </p>
          ) : (
            <>
              <label className="block">
                Stride: {strideLengthMeters.toFixed(2)} m
                <input
                  type="range"
                  min={0.5}
                  max={1.2}
                  step={0.05}
                  value={strideLengthMeters}
                  onChange={(event) =>
                    setStrideLengthMeters(Number(event.target.value))
                  }
                  className="mt-1 w-full"
                />
              </label>
              <p>Steps: {steps}</p>
              <p>Pace: {estimatedPaceKmh.toFixed(1)} km/h</p>
            </>
          )}
        </div>
      )}

      {movementSource === "remote-phone-sensor" && (
        <RemoteSensorControls
          sessionCode={remoteSensor.sessionCode}
          onSessionCodeChange={remoteSensor.setSessionCode}
          relayBaseUrl={remoteSensor.relayBaseUrl}
          onRelayBaseUrlChange={remoteSensor.setRelayBaseUrl}
          connectionStatus={remoteSensor.connectionStatus}
          sensorPeerConnected={remoteSensor.sensorPeerConnected}
          receivedSteps={remoteSensor.receivedSteps}
          receivedDistanceMeters={remoteSensor.receivedDistanceMeters}
          lastReceivedAt={remoteSensor.lastReceivedAt}
          onConnect={remoteSensor.connect}
          onDisconnect={remoteSensor.disconnect}
          isConnected={remoteSensor.isConnected}
        />
      )}

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
        Choose another place
      </button>
    </div>
  );
}
