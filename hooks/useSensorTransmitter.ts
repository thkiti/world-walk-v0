"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RemoteSensorClient } from "@/lib/remote-sensor-client";
import type { RemoteSensorConnectionStatus } from "@/lib/remote-sensor-client";
import {
  DEFAULT_STRIDE_LENGTH_METERS,
  isPhoneStepCounterSupported,
  PhoneStepCounter,
} from "@/lib/step-counter";
import {
  generateSessionCode,
  getDefaultRelayBaseUrl,
  buildRelayWebSocketUrl,
  normalizeSessionCode,
} from "@/lib/remote-sensor-url";

type UseSensorTransmitterOptions = {
  initialSessionCode?: string;
  initialRelayBaseUrl?: string;
};

export function useSensorTransmitter(options: UseSensorTransmitterOptions = {}) {
  const counterRef = useRef<PhoneStepCounter | null>(null);
  const clientRef = useRef<RemoteSensorClient | null>(null);
  const lastSentStepsRef = useRef(0);

  const [sessionCode, setSessionCode] = useState(
    () => normalizeSessionCode(options.initialSessionCode || "") || generateSessionCode()
  );
  const [relayBaseUrl, setRelayBaseUrl] = useState(
    () => options.initialRelayBaseUrl || getDefaultRelayBaseUrl()
  );
  const [steps, setSteps] = useState(0);
  const [distanceSentMeters, setDistanceSentMeters] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isSupported] = useState(() => isPhoneStepCounterSupported());
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [connectionStatus, setConnectionStatus] =
    useState<RemoteSensorConnectionStatus>("idle");
  const [displayPeerConnected, setDisplayPeerConnected] = useState(false);
  const [strideLengthMeters] = useState(DEFAULT_STRIDE_LENGTH_METERS);

  useEffect(() => {
    counterRef.current = new PhoneStepCounter();
    return () => {
      counterRef.current?.stop();
      counterRef.current = null;
    };
  }, []);

  const disconnectClient = useCallback(() => {
    clientRef.current?.disconnect();
    clientRef.current = null;
    setConnectionStatus("idle");
    setDisplayPeerConnected(false);
  }, []);

  const sendStepDelta = useCallback(
    (nextSteps: number) => {
      setSteps(nextSteps);

      const stepsDelta = nextSteps - lastSentStepsRef.current;
      if (stepsDelta <= 0 || !clientRef.current) return;

      lastSentStepsRef.current = nextSteps;
      const deltaMeters = stepsDelta * strideLengthMeters;
      clientRef.current.sendMovementDelta(deltaMeters, stepsDelta, nextSteps);
      setDistanceSentMeters((current) => current + deltaMeters);
    },
    [strideLengthMeters]
  );

  const start = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !counterRef.current) {
      setIsUnavailable(true);
      setIsActive(false);
      return false;
    }

    disconnectClient();

    const client = new RemoteSensorClient({
      role: "sensor",
      sessionCode,
      relayBaseUrl: relayBaseUrl.trim() || getDefaultRelayBaseUrl(),
      onStatusChange: setConnectionStatus,
      onMessage: (message) => {
        if (message.type === "peer-status") {
          setDisplayPeerConnected(message.displayCount > 0);
        }
      },
    });

    clientRef.current = client;
    client.connect();

    const started = await counterRef.current.start(sendStepDelta);
    setIsActive(started);
    setIsUnavailable(!started);

    if (!started) {
      disconnectClient();
    }

    return started;
  }, [
    isSupported,
    sessionCode,
    relayBaseUrl,
    disconnectClient,
    sendStepDelta,
  ]);

  const stop = useCallback(() => {
    counterRef.current?.stop();
    disconnectClient();
    setIsActive(false);
  }, [disconnectClient]);

  const reset = useCallback(() => {
    counterRef.current?.resetSteps();
    lastSentStepsRef.current = 0;
    setSteps(0);
    setDistanceSentMeters(0);
  }, []);

  const websocketUrl = buildRelayWebSocketUrl(
    relayBaseUrl.trim() || getDefaultRelayBaseUrl(),
    "sensor",
    sessionCode
  );

  return {
    sessionCode,
    setSessionCode,
    relayBaseUrl,
    setRelayBaseUrl,
    websocketUrl,
    steps,
    distanceSentMeters,
    isActive,
    isSupported,
    isUnavailable,
    connectionStatus,
    displayPeerConnected,
    strideLengthMeters,
    start,
    stop,
    reset,
  };
}
