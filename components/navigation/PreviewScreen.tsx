"use client";

import { Map } from "@vis.gl/react-google-maps";
import { DestinationMapOverlay } from "@/components/map/DestinationMapOverlay";
import { FitBounds } from "@/components/map/FitBounds";
import type { WalkDestination } from "@/lib/types";
import { requestFullscreen } from "@/lib/fullscreen";
import { GLASS_SHEET, TOUCH_BUTTON } from "@/lib/ui";

type PreviewScreenProps = {
  destination: WalkDestination;
  onStartWalk: () => void;
  onBack: () => void;
};

export function PreviewScreen({
  destination,
  onStartWalk,
  onBack,
}: PreviewScreenProps) {
  return (
    <div className="relative h-dvh w-full">
      <Map
        defaultCenter={destination.points[0]}
        defaultZoom={15}
        gestureHandling="greedy"
        style={{ width: "100%", height: "100%" }}
      >
        <DestinationMapOverlay points={destination.points} />
        <FitBounds points={destination.points} />
      </Map>

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/15" />

      <div
        className={`${GLASS_SHEET} pointer-events-auto absolute right-0 bottom-0 left-0 px-4 pt-4 pb-8 md:right-4 md:bottom-4 md:left-auto md:w-[26rem] md:rounded-xl md:px-5 md:pt-5`}
      >
        <button
          type="button"
          onClick={onBack}
          className="mb-3 text-sm font-medium text-zinc-700 hover:text-zinc-900"
        >
          ← Back
        </button>

        <p className="text-xs font-semibold tracking-wide text-zinc-700 uppercase">
          Preview
        </p>
        <h1 className="mt-1 text-xl font-semibold text-zinc-900">
          {destination.title}
        </h1>
        <p className="mt-1 text-sm text-zinc-700">
          {destination.city}, {destination.country}
        </p>

        {destination.description && (
          <p className="mt-3 text-sm text-zinc-700">{destination.description}</p>
        )}

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-white/45 px-3 py-2">
            <dt className="text-xs text-zinc-600">Distance</dt>
            <dd className="font-medium text-zinc-900">
              {destination.distanceKm.toFixed(1)} km
            </dd>
          </div>
          <div className="rounded-xl bg-white/45 px-3 py-2">
            <dt className="text-xs text-zinc-600">Estimated Time</dt>
            <dd className="font-medium text-zinc-900">
              {destination.estimatedMinutes} min
            </dd>
          </div>
          <div className="rounded-xl bg-white/45 px-3 py-2">
            <dt className="text-xs text-zinc-600">Difficulty</dt>
            <dd className="font-medium text-zinc-900">
              {destination.difficulty}
            </dd>
          </div>
          {destination.quality && (
            <div className="rounded-xl bg-white/45 px-3 py-2">
              <dt className="text-xs text-zinc-600">Quality</dt>
              <dd className="font-medium text-zinc-900">
                {destination.quality}
              </dd>
            </div>
          )}
          {destination.streetViewCoverage && (
            <div className="col-span-2 rounded-xl bg-white/45 px-3 py-2">
              <dt className="text-xs text-zinc-600">Street View</dt>
              <dd className="font-medium text-zinc-900">
                {destination.streetViewCoverage} Street View
              </dd>
            </div>
          )}
        </dl>

        <button
          type="button"
          className={`${TOUCH_BUTTON} mt-5 w-full bg-zinc-900 text-center font-semibold text-white hover:bg-zinc-800`}
          onClick={() => {
            requestFullscreen();
            onStartWalk();
          }}
        >
          Start Walk
        </button>
      </div>
    </div>
  );
}
