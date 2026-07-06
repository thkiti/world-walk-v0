"use client";

import { formatElapsed } from "@/lib/geo";
import { MOVEMENT_SOURCE_LABELS } from "@/lib/movement-source";
import { estimatePaceKmh, stepsToDistanceMeters } from "@/lib/step-counter";
import { GLASS_HUD } from "@/lib/ui";
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
  awaitingDecision?: boolean;
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
      <p className="mt-1.5 flex items-center gap-1.5 text-[10px] text-emerald-800/90">
        <span aria-hidden="true">☀</span>
        Screen awake
      </p>
    );
  }

  if (status === "unavailable") {
    return (
      <p className="mt-1.5 flex items-center gap-1.5 text-[10px] text-zinc-600">
        <span aria-hidden="true">○</span>
        Wake lock unavailable
      </p>
    );
  }

  return null;
}

const HUD_POSITION =
  "absolute bottom-3 left-3 z-10 w-[min(100%,16rem)] p-2.5 md:landscape:w-56";

export function WalkingHud({
  destinationTitle,
  isWalking,
  awaitingDecision = false,
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

  if (isWalking) {
    return (
      <div className={`${HUD_POSITION} ${GLASS_HUD}`}>
        <p className="truncate text-xs font-semibold text-zinc-900">
          {destinationTitle}
        </p>

        {awaitingDecision ? (
          <p className="mt-1 text-[11px] font-medium text-amber-900/90">
            Choose a direction in Street View
          </p>
        ) : (
          <p className="mt-0.5 text-[10px] text-zinc-700">
            {formatElapsed(elapsedSeconds)} · {heading.toFixed(0)}° ·{" "}
            {distanceWalkedKm.toFixed(2)} km
          </p>
        )}

        {movementSource === "phone-steps" && !awaitingDecision && (
          <p className="mt-0.5 text-[10px] text-zinc-600">
            {steps} steps · {estimatedPaceKmh.toFixed(1)} km/h
          </p>
        )}

        {movementSource === "remote-phone-sensor" && !awaitingDecision && (
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
          className="mt-2 min-h-9 w-full rounded-lg bg-zinc-900/75 text-xs font-semibold text-white hover:bg-zinc-900/90 active:scale-[0.98]"
          onClick={onPause}
        >
          Pause
        </button>
        <button
          type="button"
          className="mt-1 w-full rounded-lg py-1 text-[10px] font-medium text-zinc-700 hover:text-zinc-900"
          onClick={onReset}
        >
          Reset position
        </button>
      </div>
    );
  }

  return (
    <div className={`${HUD_POSITION} ${GLASS_HUD}`}>
      <p className="truncate text-xs font-semibold text-zinc-900">
        {destinationTitle}
      </p>

      <p className="mt-0.5 text-[10px] text-zinc-700">
        {formatElapsed(elapsedSeconds)} · {heading.toFixed(0)}° ·{" "}
        {distanceWalkedKm.toFixed(2)} km
      </p>

      <label className="mt-2 block text-[10px] text-zinc-800">
        Movement
        <select
          value={movementSource}
          onChange={(event) =>
            onMovementSourceChange(event.target.value as MovementSource)
          }
          className="mt-0.5 w-full rounded-lg border border-white/40 bg-white/30 px-2 py-1 text-xs backdrop-blur-sm"
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
        <div className="mt-1.5 space-y-1.5 text-[10px] text-zinc-800">
          {!phoneStepsSupported || phoneStepsUnavailable ? (
            <p className="text-zinc-600">
              Phone steps unavailable. Try remote phone sensor.
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
                  className="mt-0.5 w-full"
                />
              </label>
              <p>Steps: {steps}</p>
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

      <div className="mt-2 flex gap-1.5">
        <button
          type="button"
          className="min-h-9 flex-1 rounded-lg bg-zinc-900/75 text-xs font-medium text-white hover:bg-zinc-900/90 active:scale-[0.98]"
          onClick={onResume}
        >
          Resume
        </button>
        <button
          type="button"
          className="min-h-9 rounded-lg px-2 text-[10px] font-medium text-zinc-700 hover:text-zinc-900"
          onClick={onReset}
        >
          Reset
        </button>
      </div>

      <button
        type="button"
        className="mt-1 w-full rounded-lg py-1 text-[10px] font-medium text-zinc-600 hover:text-zinc-900"
        onClick={onExit}
      >
        Choose another place
      </button>
    </div>
  );
}
