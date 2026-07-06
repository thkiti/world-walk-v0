"use client";

import type { RemoteSensorConnectionStatus } from "@/lib/remote-sensor-client";
import { getDefaultRelayBaseUrl, getRelayConnectionIssue } from "@/lib/remote-sensor-url";

type RemoteSensorControlsProps = {
  sessionCode: string;
  onSessionCodeChange: (value: string) => void;
  relayBaseUrl: string;
  onRelayBaseUrlChange: (value: string) => void;
  connectionStatus: RemoteSensorConnectionStatus;
  sensorPeerConnected: boolean;
  receivedSteps: number;
  receivedDistanceMeters: number;
  lastReceivedAt: number | null;
  lastApplyBlockedReason?: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
  isConnected: boolean;
};

function connectionLabel(
  status: RemoteSensorConnectionStatus,
  sensorPeerConnected: boolean
): string {
  switch (status) {
    case "connecting":
      return "Connecting…";
    case "connected":
      return sensorPeerConnected
        ? "Connected — sensor online"
        : "Connected — waiting for phone sensor";
    case "disconnected":
      return "Disconnected — retrying…";
    case "error":
      return "Connection error";
    default:
      return "Not connected";
  }
}

function formatLastReceived(timestamp: number | null): string {
  if (!timestamp) return "—";
  return new Date(timestamp).toLocaleTimeString();
}

export function RemoteSensorControls({
  sessionCode,
  onSessionCodeChange,
  relayBaseUrl,
  onRelayBaseUrlChange,
  connectionStatus,
  sensorPeerConnected,
  receivedSteps,
  receivedDistanceMeters,
  lastReceivedAt,
  lastApplyBlockedReason,
  onConnect,
  onDisconnect,
  isConnected,
}: RemoteSensorControlsProps) {
  const defaultRelay = getDefaultRelayBaseUrl() || "ws://192.168.x.x:3001";
  const relayIssue = getRelayConnectionIssue(relayBaseUrl.trim() || defaultRelay);

  return (
    <div className="mt-2 space-y-2 text-xs text-zinc-800">
      <p className="text-zinc-600">
        Phone runs <span className="font-medium">/sensor</span>. On your PC run{" "}
        <span className="font-mono">npm run relay</span>. Both devices use the
        same <span className="font-mono">ws://&lt;pc-ip&gt;:3001</span> URL.
      </p>

      {relayIssue && (
        <p className="rounded-lg border border-amber-400/60 bg-amber-50/80 px-2 py-1.5 text-amber-950">
          {relayIssue}
        </p>
      )}

      {lastApplyBlockedReason && connectionStatus === "error" && (
        <p className="rounded-lg border border-rose-400/60 bg-rose-50/80 px-2 py-1.5 text-rose-950">
          {lastApplyBlockedReason}
        </p>
      )}

      <label className="block">
        Session code
        <input
          type="text"
          value={sessionCode}
          onChange={(event) => onSessionCodeChange(event.target.value)}
          placeholder="ABC123"
          className="mt-1 w-full rounded-lg border border-white/60 bg-white/50 px-2 py-1.5 font-mono text-sm uppercase backdrop-blur-sm"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
        />
      </label>

      <label className="block">
        Relay WebSocket URL
        <input
          type="text"
          value={relayBaseUrl}
          onChange={(event) => onRelayBaseUrlChange(event.target.value)}
          placeholder={defaultRelay}
          className="mt-1 w-full rounded-lg border border-white/60 bg-white/50 px-2 py-1.5 font-mono text-[11px] backdrop-blur-sm"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
        />
      </label>

      <p
        className={
          connectionStatus === "connected" && sensorPeerConnected
            ? "text-emerald-800"
            : "text-zinc-600"
        }
      >
        {connectionLabel(connectionStatus, sensorPeerConnected)}
      </p>

      <p>Received steps: {receivedSteps}</p>
      <p>
        Received distance: {(receivedDistanceMeters / 1000).toFixed(2)} km
      </p>
      <p>Last received: {formatLastReceived(lastReceivedAt)}</p>

      <div className="flex gap-2 pt-1">
        {!isConnected ? (
          <button
            type="button"
            className="min-h-10 flex-1 rounded-lg bg-zinc-900/90 text-sm font-medium text-white hover:bg-zinc-900 active:scale-[0.98]"
            onClick={onConnect}
            disabled={!sessionCode.trim()}
          >
            Connect Sensor
          </button>
        ) : (
          <button
            type="button"
            className="min-h-10 flex-1 rounded-lg border border-zinc-400/60 bg-white/50 text-sm font-medium text-zinc-800 hover:bg-white/70 active:scale-[0.98]"
            onClick={onDisconnect}
          >
            Disconnect
          </button>
        )}
      </div>
    </div>
  );
}

export function RemoteSensorActiveStatus({
  connectionStatus,
  sensorPeerConnected,
  receivedSteps,
  receivedDistanceMeters,
}: {
  connectionStatus: RemoteSensorConnectionStatus;
  sensorPeerConnected: boolean;
  receivedSteps: number;
  receivedDistanceMeters: number;
}) {
  return (
    <p className="mt-1 text-[11px] text-zinc-600">
      {connectionLabel(connectionStatus, sensorPeerConnected)} · {receivedSteps}{" "}
      steps · {(receivedDistanceMeters / 1000).toFixed(2)} km remote
    </p>
  );
}
