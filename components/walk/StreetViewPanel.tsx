"use client";

import { useEffect, useRef, useState } from "react";
import { useApiIsLoaded } from "@vis.gl/react-google-maps";
import { moveForward } from "@/lib/geo";
import {
  applyStreetViewLookup,
  resolveStreetViewPanorama,
} from "@/lib/street-view";
import type { StreetViewState } from "@/lib/types";

const TURN_DEGREES = 15;
const FORWARD_METERS = 10;

type StreetViewPanelProps = {
  view: StreetViewState;
  setView: React.Dispatch<React.SetStateAction<StreetViewState>>;
};

export function StreetViewPanel({ view, setView }: StreetViewPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const panoramaRef = useRef<google.maps.StreetViewPanorama | null>(null);
  const serviceRef = useRef<google.maps.StreetViewService | null>(null);
  const lookupGenerationRef = useRef(0);
  const [panoramaReady, setPanoramaReady] = useState(false);
  const apiIsLoaded = useApiIsLoaded();

  useEffect(() => {
    if (!apiIsLoaded || !containerRef.current) return;

    const panorama = new google.maps.StreetViewPanorama(containerRef.current, {
      visible: true,
      enableCloseButton: false,
    });
    panoramaRef.current = panorama;
    serviceRef.current = new google.maps.StreetViewService();

    console.log("[StreetView] panorama created successfully", {
      hasContainer: Boolean(containerRef.current),
    });

    setPanoramaReady(true);

    return () => {
      lookupGenerationRef.current += 1;
      panorama.setVisible(false);
      panoramaRef.current = null;
      serviceRef.current = null;
      setPanoramaReady(false);
    };
  }, [apiIsLoaded]);

  useEffect(() => {
    const panorama = panoramaRef.current;
    const service = serviceRef.current;
    if (!panoramaReady || !panorama || !service) return;

    const generation = ++lookupGenerationRef.current;
    const requested = view.position;
    const pov = { heading: view.heading, pitch: view.pitch };

    console.log("[StreetView] resolving panorama for position", {
      requestedPosition: requested,
    });

    void resolveStreetViewPanorama(service, requested).then((result) => {
      if (generation !== lookupGenerationRef.current) return;
      if (!panoramaRef.current) return;

      applyStreetViewLookup(panoramaRef.current, result, pov);
    });
  }, [view, panoramaReady]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />

      <div className="absolute right-3 bottom-3 left-3 flex flex-col gap-2 md:right-4 md:bottom-4 md:left-4 md:gap-3">
        <div className="hidden rounded-lg bg-white/80 px-3 py-2 font-mono text-xs text-zinc-700 shadow-md backdrop-blur-sm sm:block">
          <p>lat: {view.position.lat.toFixed(6)}</p>
          <p>lng: {view.position.lng.toFixed(6)}</p>
          <p>heading: {view.heading.toFixed(1)}°</p>
        </div>

        <div className="flex justify-center gap-2">
          <button
            type="button"
            className="min-h-12 flex-1 rounded-xl bg-white/85 px-3 py-2 text-sm font-medium text-zinc-900 shadow-md backdrop-blur-sm active:scale-[0.98] md:flex-none md:px-4"
            onClick={() =>
              setView((current) => ({
                ...current,
                heading: current.heading - TURN_DEGREES,
              }))
            }
          >
            Turn Left
          </button>
          <button
            type="button"
            className="min-h-12 flex-1 rounded-xl bg-white/85 px-3 py-2 text-sm font-medium text-zinc-900 shadow-md backdrop-blur-sm active:scale-[0.98] md:flex-none md:px-4"
            onClick={() =>
              setView((current) => ({
                ...current,
                position: moveForward(
                  current.position,
                  current.heading,
                  FORWARD_METERS
                ),
              }))
            }
          >
            Forward
          </button>
          <button
            type="button"
            className="min-h-12 flex-1 rounded-xl bg-white/85 px-3 py-2 text-sm font-medium text-zinc-900 shadow-md backdrop-blur-sm active:scale-[0.98] md:flex-none md:px-4"
            onClick={() =>
              setView((current) => ({
                ...current,
                heading: current.heading + TURN_DEGREES,
              }))
            }
          >
            Turn Right
          </button>
        </div>
      </div>
    </div>
  );
}
