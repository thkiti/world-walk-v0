import { devLog } from "@/lib/dev-log";
import {
  createMovementDeltaMessage,
  parseRemoteSensorMessage,
  type MovementDeltaMessage,
  type RemoteSensorInboundMessage,
  type RemoteSensorRole,
} from "@/lib/remote-sensor-protocol";
import { buildRelayWebSocketUrl } from "@/lib/remote-sensor-url";

export type RemoteSensorConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

type RemoteSensorClientOptions = {
  role: RemoteSensorRole;
  sessionCode: string;
  relayBaseUrl: string;
  onMessage?: (message: RemoteSensorInboundMessage) => void;
  onMovementDelta?: (message: MovementDeltaMessage) => void;
  onStatusChange?: (status: RemoteSensorConnectionStatus) => void;
  onOpen?: () => void;
  onClose?: () => void;
};

export class RemoteSensorClient {
  private socket: WebSocket | null = null;
  private status: RemoteSensorConnectionStatus = "idle";
  private reconnectTimer: number | null = null;
  private shouldReconnect = false;
  private readonly options: RemoteSensorClientOptions;

  constructor(options: RemoteSensorClientOptions) {
    this.options = options;
  }

  get connectionStatus(): RemoteSensorConnectionStatus {
    return this.status;
  }

  connect(): void {
    this.shouldReconnect = true;
    this.openSocket();
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.socket?.close();
    this.socket = null;
    this.setStatus("idle");
  }

  sendMovementDelta(
    deltaMeters: number,
    stepsDelta: number,
    totalSteps: number
  ): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    const message = createMovementDeltaMessage(
      deltaMeters,
      stepsDelta,
      totalSteps
    );
    this.socket.send(JSON.stringify(message));
  }

  private openSocket(): void {
    if (typeof window === "undefined") return;

    this.socket?.close();
    this.setStatus("connecting");

    const url = buildRelayWebSocketUrl(
      this.options.relayBaseUrl,
      this.options.role,
      this.options.sessionCode
    );

    devLog("[RemoteSensor] connecting", { url, role: this.options.role });

    const socket = new WebSocket(url);
    this.socket = socket;

    socket.onopen = () => {
      this.setStatus("connected");
      this.options.onOpen?.();
      devLog("[RemoteSensor] connected", { role: this.options.role });
    };

    socket.onmessage = (event) => {
      const message = parseRemoteSensorMessage(String(event.data));
      if (!message) return;

      this.options.onMessage?.(message);

      if (message.type === "movement-delta") {
        this.options.onMovementDelta?.(message);
      }
    };

    socket.onerror = () => {
      this.setStatus("error");
      devLog("[RemoteSensor] socket error", { role: this.options.role });
    };

    socket.onclose = () => {
      this.socket = null;
      this.options.onClose?.();

      if (this.shouldReconnect) {
        this.setStatus("disconnected");
        devLog("[RemoteSensor] disconnected — will retry", {
          role: this.options.role,
        });
        this.reconnectTimer = window.setTimeout(() => {
          this.reconnectTimer = null;
          if (this.shouldReconnect) {
            this.openSocket();
          }
        }, 2000);
        return;
      }

      this.setStatus("idle");
    };
  }

  private setStatus(status: RemoteSensorConnectionStatus): void {
    if (this.status === status) return;
    this.status = status;
    this.options.onStatusChange?.(status);
  }
}
