type WakeLockNavigator = Navigator & {
  wakeLock: {
    request: (type: "screen") => Promise<WakeLockSentinel>;
  };
};

let wakeLock: WakeLockSentinel | null = null;
let releaseHandler: (() => void) | null = null;

export function isWakeLockSupported(): boolean {
  return typeof navigator !== "undefined" && "wakeLock" in navigator;
}

function attachReleaseListener(sentinel: WakeLockSentinel): void {
  if (releaseHandler) {
    sentinel.removeEventListener("release", releaseHandler);
  }

  releaseHandler = () => {
    wakeLock = null;
  };

  sentinel.addEventListener("release", releaseHandler);
}

export async function requestWakeLock(): Promise<boolean> {
  if (!isWakeLockSupported()) return false;
  if (typeof document !== "undefined" && document.visibilityState !== "visible") {
    return false;
  }

  try {
    if (wakeLock && !wakeLock.released) {
      return true;
    }

    const nav = navigator as WakeLockNavigator;
    wakeLock = await nav.wakeLock.request("screen");
    attachReleaseListener(wakeLock);
    return true;
  } catch {
    wakeLock = null;
    return false;
  }
}

export async function releaseWakeLock(): Promise<void> {
  if (!wakeLock || wakeLock.released) {
    wakeLock = null;
    return;
  }

  try {
    await wakeLock.release();
  } catch {
    // Ignore release errors — walking must continue.
  }

  wakeLock = null;
}

export async function reRequestWakeLockIfNeeded(
  isWalking: boolean
): Promise<boolean> {
  if (!isWalking) return false;
  if (typeof document !== "undefined" && document.visibilityState !== "visible") {
    return false;
  }

  if (wakeLock && !wakeLock.released) {
    return true;
  }

  return requestWakeLock();
}

export function isWakeLockHeld(): boolean {
  return wakeLock !== null && !wakeLock.released;
}

export type WakeLockDisplayStatus = "active" | "unavailable" | "inactive";

export async function syncWakeLock(isWalking: boolean): Promise<WakeLockDisplayStatus> {
  if (!isWalking) {
    await releaseWakeLock();
    return "inactive";
  }

  if (!isWakeLockSupported()) {
    return "unavailable";
  }

  const acquired = await requestWakeLock();
  return acquired ? "active" : "unavailable";
}
