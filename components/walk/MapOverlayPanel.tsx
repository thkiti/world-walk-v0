"use client";

import type { ReactNode } from "react";
import { Map } from "@vis.gl/react-google-maps";
import { ExplorationMapOverlay } from "@/components/map/ExplorationMapOverlay";
import { formatElapsed } from "@/lib/geo";
import type { LatLng } from "@/lib/types";
import { GLASS_PANEL } from "@/lib/ui";

type MapOverlayPanelProps = {
  open: boolean;
  onClose: () => void;
  destinationTitle: string;
  place: string;
  city: string;
  country: string;
  position: LatLng;
  heading: number;
  breadcrumbs: LatLng[];
  elapsedSeconds: number;
  distanceWalkedKm: number;
  hud?: ReactNode;
};

export function MapOverlayPanel({
  open,
  onClose,
  destinationTitle,
  place,
  city,
  country,
  position,
  heading,
  breadcrumbs,
  elapsedSeconds,
  distanceWalkedKm,
  hud,
}: MapOverlayPanelProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex md:landscape:hidden">
      <button
        type="button"
        aria-label="Close map panel"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <aside
        className={`relative flex h-full w-[min(88vw,22rem)] flex-col shadow-2xl ${GLASS_PANEL} rounded-none border-r border-white/50 bg-white/40`}
      >
        <div className="flex items-center justify-between border-b border-white/40 px-4 py-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-zinc-700 uppercase">
              Map
            </p>
            <p className="text-sm font-medium text-zinc-900">{destinationTitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-10 min-w-10 rounded-lg text-lg text-zinc-700 hover:bg-white/50"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="relative min-h-0 flex-1">
          <Map
            defaultCenter={position}
            defaultZoom={17}
            gestureHandling="greedy"
            disableDefaultUI
            style={{ width: "100%", height: "100%" }}
          >
            <ExplorationMapOverlay
              position={position}
              heading={heading}
              breadcrumbs={breadcrumbs}
            />
          </Map>
          {hud && (
            <div className="pointer-events-none absolute inset-0">
              <div className="pointer-events-auto">{hud}</div>
            </div>
          )}
        </div>

        <div className="space-y-1 border-t border-white/40 px-4 py-3 text-sm text-zinc-800">
          <p className="font-medium">{place}</p>
          <p className="text-xs text-zinc-600">
            {city}, {country}
          </p>
          <p className="text-xs text-zinc-700">
            {formatElapsed(elapsedSeconds)} · {heading.toFixed(0)}° ·{" "}
            {distanceWalkedKm.toFixed(2)} km walked
          </p>
        </div>
      </aside>
    </div>
  );
}
