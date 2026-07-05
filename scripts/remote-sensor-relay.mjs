#!/usr/bin/env node

/**
 * Local WebSocket relay for World Walk remote phone sensor.
 *
 * Next.js route handlers cannot host WebSocket upgrades, so local dev uses
 * this standalone relay on port 3001. Run alongside `npm run dev`:
 *
 *   npm run relay
 *
 * Phone (sensor) and tablet (display) must be on the same Wi-Fi network.
 * Set NEXT_PUBLIC_REMOTE_SENSOR_WS_URL=ws://<your-lan-ip>:3001 if needed.
 */

import { createServer } from "node:http";
import { WebSocketServer } from "ws";

const PORT = Number(process.env.REMOTE_SENSOR_RELAY_PORT || 3001);

/** @type {Map<string, { sensor: import('ws').WebSocket | null, displays: Set<import('ws').WebSocket> }>} */
const sessions = new Map();

function getSession(sessionCode) {
  const key = sessionCode.toUpperCase();
  if (!sessions.has(key)) {
    sessions.set(key, { sensor: null, displays: new Set() });
  }
  return sessions.get(key);
}

function sendJson(socket, payload) {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

function broadcastPeerStatus(sessionCode) {
  const session = getSession(sessionCode);
  const payload = {
    type: "peer-status",
    sensorConnected: Boolean(session.sensor),
    displayCount: session.displays.size,
  };

  if (session.sensor) {
    sendJson(session.sensor, payload);
  }

  for (const display of session.displays) {
    sendJson(display, payload);
  }
}

function cleanupSession(sessionCode) {
  const session = sessions.get(sessionCode.toUpperCase());
  if (!session) return;

  const empty =
    !session.sensor &&
    session.displays.size === 0;

  if (empty) {
    sessions.delete(sessionCode.toUpperCase());
  }
}

const server = createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end(
    "World Walk remote sensor relay. Connect via WebSocket with ?role=sensor|display&session=CODE\n"
  );
});

const wss = new WebSocketServer({ server });

wss.on("connection", (socket, request) => {
  const url = new URL(request.url || "/", `http://${request.headers.host}`);
  const role = url.searchParams.get("role");
  const sessionCode = (url.searchParams.get("session") || "")
    .trim()
    .toUpperCase();

  if (!sessionCode || (role !== "sensor" && role !== "display")) {
    sendJson(socket, {
      type: "error",
      message: "Missing or invalid role/session query params",
    });
    socket.close();
    return;
  }

  const session = getSession(sessionCode);

  if (role === "sensor") {
    if (session.sensor) {
      session.sensor.close();
    }
    session.sensor = socket;
  } else {
    session.displays.add(socket);
  }

  sendJson(socket, {
    type: "session-joined",
    role,
    session: sessionCode,
  });
  broadcastPeerStatus(sessionCode);

  socket.on("message", (data) => {
    if (role !== "sensor") return;

    let parsed;
    try {
      parsed = JSON.parse(String(data));
    } catch {
      return;
    }

    if (parsed?.type !== "movement-delta") return;

    for (const display of session.displays) {
      sendJson(display, parsed);
    }
  });

  socket.on("close", () => {
    if (role === "sensor" && session.sensor === socket) {
      session.sensor = null;
    } else if (role === "display") {
      session.displays.delete(socket);
    }

    broadcastPeerStatus(sessionCode);
    cleanupSession(sessionCode);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`World Walk remote sensor relay listening on ws://0.0.0.0:${PORT}`);
});
