"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_STRIDE_LENGTH_METERS,
  isPhoneStepCounterSupported,
  PhoneStepCounter,
} from "@/lib/step-counter";

export function usePhoneStepCounter() {
  const counterRef = useRef<PhoneStepCounter | null>(null);
  const [steps, setSteps] = useState(0);
  const [isSupported] = useState(() => isPhoneStepCounterSupported());
  const [isActive, setIsActive] = useState(false);
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [strideLengthMeters, setStrideLengthMeters] = useState(
    DEFAULT_STRIDE_LENGTH_METERS
  );

  useEffect(() => {
    counterRef.current = new PhoneStepCounter();
    return () => {
      counterRef.current?.stop();
      counterRef.current = null;
    };
  }, []);

  const start = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !counterRef.current) {
      setIsUnavailable(true);
      setIsActive(false);
      return false;
    }

    const started = await counterRef.current.start((nextSteps) => {
      setSteps(nextSteps);
    });

    setIsActive(started);
    setIsUnavailable(!started);
    return started;
  }, [isSupported]);

  const stop = useCallback(() => {
    counterRef.current?.stop();
    setIsActive(false);
  }, []);

  const reset = useCallback(() => {
    counterRef.current?.resetSteps();
    setSteps(0);
  }, []);

  return {
    steps,
    isSupported,
    isActive,
    isUnavailable,
    strideLengthMeters,
    setStrideLengthMeters,
    start,
    stop,
    reset,
  };
}
