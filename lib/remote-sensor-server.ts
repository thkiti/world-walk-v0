/**
 * World Walk remote sensor relay runs as a standalone WebSocket server because
 * Next.js App Router route handlers do not support WebSocket upgrades.
 *
 * See: scripts/remote-sensor-relay.mjs
 * Run: npm run relay
 *
 * Configure the client with NEXT_PUBLIC_REMOTE_SENSOR_WS_URL, e.g.
 * ws://192.168.1.10:3001
 */

export { generateSessionCode, getDefaultRelayBaseUrl } from "@/lib/remote-sensor-url";
