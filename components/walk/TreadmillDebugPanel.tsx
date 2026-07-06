"use client";

import type { WalkDebugState } from "@/lib/walk-debug";

type TreadmillDebugPanelProps = {
  debug: WalkDebugState;
};

function pipelineStage(
  ok: boolean,
  label: string,
  detail: string
): { ok: boolean; label: string; detail: string } {
  return { ok, label, detail };
}

export function TreadmillDebugPanel({ debug }: TreadmillDebugPanelProps) {
  const { streetView } = debug;
  const isRemote = debug.movementSource === "remote-phone-sensor";

  const stages = [
    pipelineStage(
      !isRemote || debug.remoteDeltasReceived > 0,
      "A Phone sending",
      isRemote
        ? `${debug.remoteDeltasReceived} deltas · last ${debug.remoteLastDeltaMeters.toFixed(2)} m`
        : "local steps mode"
    ),
    pipelineStage(
      !isRemote || debug.remoteConnected,
      "B Tablet receiving",
      isRemote
        ? `${debug.remoteConnectionStatus}${debug.remoteSensorOnline ? " · phone online" : " · no phone"}`
        : "n/a"
    ),
    pipelineStage(
      debug.sessionDeltasApplied > 0,
      "C Session advancing",
      `${debug.sessionDeltasApplied} applied · ${debug.totalDistanceMeters.toFixed(1)} m total`
    ),
    pipelineStage(
      (streetView.pendingAdvanceMeters ?? 0) > 0 ||
        (streetView.advanceAttempts ?? 0) > 0 ||
        streetView.lastAdvanceAction === "ACCUMULATING",
      "D SV consuming",
      `${(streetView.pendingAdvanceMeters ?? 0).toFixed(1)} m accumulated`
    ),
    pipelineStage(
      streetView.lastAdvanceAction === "LINK_ADVANCE" ||
        streetView.lastAdvanceAction === "FORCE_ADVANCE" ||
        streetView.lastAdvanceAction === "POSITION_CHANGED",
      "E SV advance called",
      streetView.lastAdvanceAction ?? "—"
    ),
  ];

  return (
    <div className="pointer-events-none absolute top-3 right-3 z-30 max-w-[15rem] rounded-lg border border-sky-400/50 bg-black/80 p-2 font-mono text-[9px] leading-relaxed text-sky-100 shadow-lg md:landscape:max-w-[17rem] md:landscape:text-[10px]">
      <p className="mb-1 font-semibold text-sky-300">Treadmill Pipeline</p>

      {debug.relayConnectionIssue && (
        <p className="mb-1.5 rounded border border-rose-400/50 bg-rose-950/60 px-1.5 py-1 text-rose-200">
          Relay: {debug.relayConnectionIssue}
        </p>
      )}

      {debug.relayBaseUrl && (
        <p className="mb-1 truncate text-zinc-400">url: {debug.relayBaseUrl}</p>
      )}

      {stages.map((stage) => (
        <p key={stage.label} className={stage.ok ? "text-emerald-300" : "text-rose-300"}>
          {stage.ok ? "✓" : "✗"} {stage.label}: {stage.detail}
        </p>
      ))}

      <hr className="my-1.5 border-white/20" />

      <p>walking: {String(debug.isWalking)}</p>
      <p>awaitingDecision: {String(debug.awaitingDecision)}</p>
      <p>last session Δ: {debug.lastStepDeltaMeters.toFixed(2)} m</p>
      {isRemote && (
        <>
          <p>remote steps: {debug.remoteTotalSteps}</p>
          <p>
            remote applied: {debug.remoteDeltasApplied}/{debug.remoteDeltasReceived}
          </p>
          {debug.remoteApplyBlockedReason && (
            <p className="text-amber-300">blocked: {debug.remoteApplyBlockedReason}</p>
          )}
        </>
      )}
      <p>SV attempts: {streetView.advanceAttempts ?? 0}</p>
      <p>SV links: {streetView.linkCount ?? "—"}</p>
      <p>SV action: {streetView.lastAdvanceAction ?? "—"}</p>
      <p>pano: {streetView.panoramaPanoId?.slice(0, 12) ?? "—"}</p>
    </div>
  );
}
