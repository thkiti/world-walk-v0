"use client";

import { useEffect, useState } from "react";
import {
  isWakeLockSupported,
  releaseWakeLock,
  reRequestWakeLockIfNeeded,
  syncWakeLock,
  type WakeLockDisplayStatus,
} from "@/lib/wake-lock";

export function useWakeLock(isWalking: boolean): WakeLockDisplayStatus {
  const [status, setStatus] = useState<WakeLockDisplayStatus>("inactive");

  useEffect(() => {
    let cancelled = false;

    void syncWakeLock(isWalking).then((nextStatus) => {
      if (!cancelled) {
        setStatus(nextStatus);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isWalking]);

  useEffect(() => {
    if (!isWakeLockSupported()) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void reRequestWakeLockIfNeeded(isWalking).then((acquired) => {
          if (!isWalking) {
            setStatus("inactive");
            return;
          }

          if (!isWakeLockSupported()) {
            setStatus("unavailable");
            return;
          }

          setStatus(acquired ? "active" : "unavailable");
        });
        return;
      }

      setStatus("inactive");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isWalking]);

  useEffect(() => {
    return () => {
      void releaseWakeLock();
    };
  }, []);

  return status;
}
