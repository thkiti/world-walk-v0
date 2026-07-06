const DEFAULT_RELAY_PORT = 3001;
const RELAY_URL_STORAGE_KEY = "world-walk-relay-url";

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

function isPrivateLanHostname(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    /^192\.168\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  );
}

function isServerlessHostname(hostname: string): boolean {
  return (
    hostname.endsWith(".vercel.app") ||
    hostname.endsWith(".netlify.app") ||
    hostname.endsWith(".pages.dev")
  );
}

export function getStoredRelayBaseUrl(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(RELAY_URL_STORAGE_KEY) ?? "";
}

export function storeRelayBaseUrl(url: string): void {
  if (typeof window === "undefined" || !url.trim()) return;
  localStorage.setItem(RELAY_URL_STORAGE_KEY, url.trim().replace(/\/$/, ""));
}

/**
 * Default relay URL for the remote sensor client.
 *
 * Architecture: a standalone Node relay (`npm run relay` on port 3001).
 * Vercel/Next.js does NOT host this relay. Set NEXT_PUBLIC_REMOTE_SENSOR_WS_URL
 * for production, or enter ws://<your-lan-ip>:3001 on phone and tablet.
 */
export function getDefaultRelayBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_REMOTE_SENSOR_WS_URL?.trim();
  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }

  if (typeof window === "undefined") {
    return `ws://localhost:${DEFAULT_RELAY_PORT}`;
  }

  const stored = getStoredRelayBaseUrl();
  if (stored) {
    return stored;
  }

  const hostname = window.location.hostname;

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return `ws://localhost:${DEFAULT_RELAY_PORT}`;
  }

  if (isPrivateLanHostname(hostname)) {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${hostname}:${DEFAULT_RELAY_PORT}`;
  }

  // Vercel / other hosted deploy: no relay on same host:3001
  return "";
}

export function getRelayConnectionIssue(relayBaseUrl: string): string | null {
  const trimmed = relayBaseUrl.trim();
  if (!trimmed) {
    return "Relay URL required. Run npm run relay on your PC, then use ws://<your-pc-lan-ip>:3001 on phone and tablet.";
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return "Invalid relay WebSocket URL.";
  }

  if (url.protocol !== "ws:" && url.protocol !== "wss:") {
    return "Relay URL must start with ws:// or wss://";
  }

  if (typeof window !== "undefined") {
    const pageIsSecure = window.location.protocol === "https:";
    const pageHost = window.location.hostname;

    if (pageIsSecure && url.protocol === "ws:") {
      return "This page is HTTPS — browsers block ws:// (mixed content). Open the app at http://<your-pc-ip>:3000 on both devices, or use a wss:// relay.";
    }

    if (
      isServerlessHostname(pageHost) &&
      url.hostname === pageHost &&
      (url.port === String(DEFAULT_RELAY_PORT) || url.port === "")
    ) {
      return "No WebSocket relay runs on Vercel (:3001). Run npm run relay on your home network, or set NEXT_PUBLIC_REMOTE_SENSOR_WS_URL to a real wss:// relay.";
    }
  }

  return null;
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

export { DEFAULT_RELAY_PORT };
