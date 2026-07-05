export type RemoteSensorRole = "sensor" | "display";

export type MovementDeltaMessage = {
  type: "movement-delta";
  deltaMeters: number;
  stepsDelta: number;
  totalSteps: number;
  timestamp: number;
};

export type SessionJoinedMessage = {
  type: "session-joined";
  role: RemoteSensorRole;
  session: string;
};

export type PeerStatusMessage = {
  type: "peer-status";
  sensorConnected: boolean;
  displayCount: number;
};

export type RelayErrorMessage = {
  type: "error";
  message: string;
};

export type RemoteSensorInboundMessage =
  | MovementDeltaMessage
  | SessionJoinedMessage
  | PeerStatusMessage
  | RelayErrorMessage;

export type RemoteSensorOutboundMessage = MovementDeltaMessage;

export function createMovementDeltaMessage(
  deltaMeters: number,
  stepsDelta: number,
  totalSteps: number
): MovementDeltaMessage {
  return {
    type: "movement-delta",
    deltaMeters,
    stepsDelta,
    totalSteps,
    timestamp: Date.now(),
  };
}

export function parseRemoteSensorMessage(
  raw: string
): RemoteSensorInboundMessage | null {
  try {
    const parsed = JSON.parse(raw) as RemoteSensorInboundMessage;
    if (!parsed || typeof parsed !== "object" || !("type" in parsed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function isMovementDeltaMessage(
  message: RemoteSensorInboundMessage
): message is MovementDeltaMessage {
  return message.type === "movement-delta";
}
