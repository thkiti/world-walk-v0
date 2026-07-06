"use client";

import type { WalkDebugState } from "@/lib/walk-debug";

type WalkingDebugPanelProps = {
  debug: WalkDebugState;
};

export function WalkingDebugPanel({ debug }: WalkingDebugPanelProps) {
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  const { streetView } = debug;

  return (
    <div className="pointer-events-none absolute top-36 right-3 z-20 max-w-[18rem] rounded-lg border border-amber-300/60 bg-black/75 p-2 font-mono text-[10px] leading-relaxed text-amber-100 md:top-40 md:right-4">
      <p className="mb-1 font-semibold text-amber-300">Dev Debug</p>
      <p>source: {debug.movementSource}</p>
      <p>walking: {String(debug.isWalking)}</p>
      <p>session applied: {debug.sessionDeltasApplied}</p>
      <p>walked: {debug.totalDistanceMeters.toFixed(1)} m</p>
      <p>last Δ: {debug.lastStepDeltaMeters.toFixed(2)} m</p>
      <p>awaitingDecision: {String(debug.awaitingDecision)}</p>
      <p>heading: {debug.viewHeading.toFixed(0)}°</p>
      <p>
        virtual: {debug.viewPosition.lat.toFixed(5)},{" "}
        {debug.viewPosition.lng.toFixed(5)}
      </p>
      <p>remote rx/applied: {debug.remoteDeltasReceived}/{debug.remoteDeltasApplied}</p>
      <p>SV attempts: {streetView.advanceAttempts ?? 0}</p>
      <p>accumulated: {(streetView.pendingAdvanceMeters ?? 0).toFixed(1)} m</p>
      <p>SV action: {streetView.lastAdvanceAction ?? "—"}</p>
    </div>
  );
}
