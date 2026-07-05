"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RemoteSensorClient } from "@/lib/remote-sensor-client";
import type { RemoteSensorConnectionStatus } from "@/lib/remote-sensor-client";
import {
  getDefaultRelayBaseUrl,
  normalizeSessionCode,
} from "@/lib/remote-sensor-url";

type UseRemoteMovementSensorOptions = {
  enabled: boolean;
  onMovementDelta: (deltaMeters: number) => void;
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
        if (message.deltaMeters > 0) {
          onMovementDeltaRef.current(message.deltaMeters);
        }
        setReceivedSteps(message.totalSteps);
        setReceivedDistanceMeters((current) => current + message.deltaMeters);
        setLastReceivedAt(message.timestamp);
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
    connect,
    disconnect,
    resetStats,
    isConnected: connectionStatus === "connected",
  };
}
