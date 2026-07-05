export function requestFullscreen(): void {
  if (typeof document === "undefined") return;

  try {
    if (document.fullscreenElement) return;
    void document.documentElement.requestFullscreen();
  } catch {
    // Best-effort only — walking continues regardless.
  }
}

export function exitFullscreenIfActive(): void {
  if (typeof document === "undefined") return;

  try {
    if (!document.fullscreenElement) return;
    void document.exitFullscreen();
  } catch {
    // Best-effort only.
  }
}
