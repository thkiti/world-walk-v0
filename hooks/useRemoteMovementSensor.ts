"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RemoteSensorClient } from "@/lib/remote-sensor-client";
import type { RemoteSensorConnectionStatus } from "@/lib/remote-sensor-client";
import { devLog } from "@/lib/dev-log";
import {
  getDefaultRelayBaseUrl,
  normalizeSessionCode,
} from "@/lib/remote-sensor-url";

type UseRemoteMovementSensorOptions = {
  enabled: boolean;
  onMovementDelta: (deltaMeters: number) => boolean | void;
  onConnectionLost?: () => void;
};

export function useRemoteMovementSensor({
  enabled,
  onMovementDelta,
  onConnectionLost,
}: UseRemoteMovementSensorOptions) {
  const clientRef = useRef<RemoteSensorClient | null>(null);
  const onMovementDeltaRef = useRef(onMovementDelta);
  const onConnectionLostRef = useRef(onConnectionLost);

  const [sessionCode, setSessionCode] = useState("");
  const [relayBaseUrl, setRelayBaseUrl] = useState(() =>
    getDefaultRelayBaseUrl()
  );
  const [connectionStatus, setConnectionStatus] =
    useState<RemoteSensorConnectionStatus>("idle");
  const [receivedSteps, setReceivedSteps] = useState(0);
  const [receivedDistanceMeters, setReceivedDistanceMeters] = useState(0);
  const [lastReceivedAt, setLastReceivedAt] = useState<number | null>(null);
  const [lastDeltaMeters, setLastDeltaMeters] = useState(0);
  const [deltasReceived, setDeltasReceived] = useState(0);
  const [deltasApplied, setDeltasApplied] = useState(0);
  const [lastApplyBlockedReason, setLastApplyBlockedReason] = useState<
    string | null
  >(null);
  const [sensorPeerConnected, setSensorPeerConnected] = useState(false);

  useEffect(() => {
    onMovementDeltaRef.current = onMovementDelta;
  }, [onMovementDelta]);

  useEffect(() => {
    onConnectionLostRef.current = onConnectionLost;
  }, [onConnectionLost]);

  const disconnect = useCallback(() => {
    clientRef.current?.disconnect();
    clientRef.current = null;
    setConnectionStatus("idle");
    setSensorPeerConnected(false);
  }, []);

  const connect = useCallback(() => {
    const code = normalizeSessionCode(sessionCode);
    if (!code) return;

    disconnect();

    const client = new RemoteSensorClient({
      role: "display",
      sessionCode: code,
      relayBaseUrl: relayBaseUrl.trim() || getDefaultRelayBaseUrl(),
      onStatusChange: setConnectionStatus,
      onMessage: (message) => {
        if (message.type === "peer-status") {
          setSensorPeerConnected(message.sensorConnected);
        }
      },
      onMovementDelta: (message) => {
        devLog("[RemoteSensor] delta received", {
          deltaMeters: message.deltaMeters,
          totalSteps: message.totalSteps,
        });

        setLastDeltaMeters(message.deltaMeters);
        setDeltasReceived((count) => count + 1);
        setReceivedSteps(message.totalSteps);
        setReceivedDistanceMeters((current) => current + message.deltaMeters);
        setLastReceivedAt(message.timestamp);

        if (message.deltaMeters > 0) {
          const applied = onMovementDeltaRef.current(message.deltaMeters);
          if (applied === false) {
            setLastApplyBlockedReason("session rejected delta");
          } else {
            setLastApplyBlockedReason(null);
            setDeltasApplied((count) => count + 1);
          }
        }
      },
      onClose: () => {
        if (enabled) {
          onConnectionLostRef.current?.();
        }
      },
    });

    clientRef.current = client;
    client.connect();
  }, [sessionCode, relayBaseUrl, disconnect, enabled]);

  useEffect(() => {
    if (!enabled) {
      disconnect();
    }
  }, [enabled, disconnect]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  const resetStats = useCallback(() => {
    setReceivedSteps(0);
    setReceivedDistanceMeters(0);
    setLastReceivedAt(null);
    setLastDeltaMeters(0);
    setDeltasReceived(0);
    setDeltasApplied(0);
    setLastApplyBlockedReason(null);
  }, []);

  return {
    sessionCode,
    setSessionCode,
    relayBaseUrl,
    setRelayBaseUrl,
    connectionStatus,
    sensorPeerConnected,
    receivedSteps,
    receivedDistanceMeters,
    lastReceivedAt,
    lastDeltaMeters,
    deltasReceived,
    deltasApplied,
    lastApplyBlockedReason,
    connect,
    disconnect,
    resetStats,
    isConnected: connectionStatus === "connected",
  };
}
