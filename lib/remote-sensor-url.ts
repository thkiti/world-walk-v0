const DEFAULT_RELAY_PORT = 3001;

export function generateSessionCode(length = 6): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

export function normalizeSessionCode(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function getDefaultRelayBaseUrl(): string {
  if (typeof window === "undefined") {
    return `ws://localhost:${DEFAULT_RELAY_PORT}`;
  }

  const envUrl = process.env.NEXT_PUBLIC_REMOTE_SENSOR_WS_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.hostname}:${DEFAULT_RELAY_PORT}`;
}

export function buildRelayWebSocketUrl(
  baseUrl: string,
  role: "sensor" | "display",
  sessionCode: string
): string {
  const normalizedBase = baseUrl.replace(/\/$/, "");
  const url = new URL(normalizedBase);
  url.searchParams.set("role", role);
  url.searchParams.set("session", normalizeSessionCode(sessionCode));
  return url.toString();
}

export function getSensorPageUrl(sessionCode: string): string {
  if (typeof window === "undefined") {
    return `/sensor?session=${sessionCode}`;
  }
  const url = new URL("/sensor", window.location.origin);
  url.searchParams.set("session", sessionCode);
  return url.toString();
}
