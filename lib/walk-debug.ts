import type { LatLng, MovementSource } from "@/lib/types";
import type { RemoteSensorConnectionStatus } from "@/lib/remote-sensor-client";

export type StreetViewDebugState = {
  panoramaPanoId: string | null;
  panoramaLatLng: LatLng | null;
  lastPanoramaLookupStatus: string;
  lastAppliedPosition: LatLng | null;
  pendingAdvanceMeters?: number;
  linkCount?: number;
  lastAdvanceAction?: string;
  advanceAttempts?: number;
};

export type WalkDebugState = {
  movementSource: MovementSource;
  elapsedSeconds: number;
  totalDistanceMeters: number;
  breadcrumbCount: number;
  lastStepDeltaMeters: number;
  sessionDeltasApplied: number;
  awaitingDecision: boolean;
  isWalking: boolean;
  viewHeading: number;
  viewPosition: LatLng;
  remoteConnected: boolean;
  remoteSensorOnline: boolean;
  remoteConnectionStatus: RemoteSensorConnectionStatus;
  remoteLastDeltaMeters: number;
  remoteDeltasReceived: number;
  remoteDeltasApplied: number;
  remoteTotalSteps: number;
  remoteApplyBlockedReason: string | null;
  relayBaseUrl: string;
  relayConnectionIssue: string | null;
  streetView: StreetViewDebugState;
};

export const EMPTY_STREET_VIEW_DEBUG: StreetViewDebugState = {
  panoramaPanoId: null,
  panoramaLatLng: null,
  lastPanoramaLookupStatus: "IDLE",
  lastAppliedPosition: null,
  advanceAttempts: 0,
};
