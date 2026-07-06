"use client";

import { useMemo, useState } from "react";
import { Map } from "@vis.gl/react-google-maps";
import { CURATED_PLACES, searchDestinations } from "@/lib/catalog";
import { GLASS_PANEL, GLASS_SHEET, TOUCH_BUTTON } from "@/lib/ui";

type HomeScreenProps = {
  onSelectPlace: (destinationId: string) => void;
};

export function HomeScreen({ onSelectPlace }: HomeScreenProps) {
  const [query, setQuery] = useState("");

  const searchResults = useMemo(() => searchDestinations(query), [query]);
  const places = searchResults.length > 0 ? searchResults : CURATED_PLACES;

  return (
    <div className="relative h-dvh w-full">
      <Map
        defaultCenter={{ lat: 20, lng: 0 }}
        defaultZoom={2}
        gestureHandling="greedy"
        disableDefaultUI
        style={{ width: "100%", height: "100%" }}
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/35" />

      <div
        className={`pointer-events-auto absolute top-4 right-3 left-3 px-4 py-3 md:top-6 md:right-auto md:left-6 md:w-[24rem] ${GLASS_PANEL}`}
      >
        <p className="text-xs font-semibold tracking-[0.25em] text-zinc-800 uppercase">
          World Walk
        </p>
        <h1 className="mt-1 text-xl font-semibold text-zinc-900 md:text-2xl">
          Choose a Place
        </h1>
        <p className="mt-1 text-sm text-zinc-800">
          Movement is real. Location is virtual. Explore freely in Street View.
        </p>
      </div>

      <div
        className={`${GLASS_SHEET} pointer-events-auto absolute right-0 bottom-0 left-0 max-h-[62vh] overflow-y-auto px-4 pt-4 pb-8 md:right-4 md:bottom-4 md:left-auto md:w-[26rem] md:max-h-[calc(100vh-2rem)] md:rounded-xl md:px-5 md:pt-5`}
      >
        <label className="block">
          <span className="sr-only">Search places</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search places..."
            className="min-h-12 w-full rounded-xl border border-white/60 bg-white/55 px-4 text-base text-zinc-900 placeholder:text-zinc-500 backdrop-blur-sm"
          />
        </label>

        <p className="mt-4 text-xs font-semibold tracking-wide text-zinc-700 uppercase">
          {searchResults.length > 0 ? "Search results" : "Curated places"}
        </p>

        <ul className="mt-2 space-y-2">
          {places.map((destination) => (
            <li key={destination.id}>
              <button
                type="button"
                className={`${TOUCH_BUTTON} w-full bg-white/50 text-left text-zinc-900 hover:bg-white/70`}
                onClick={() => onSelectPlace(destination.id)}
              >
                <span className="block font-medium">{destination.title}</span>
                <span className="block text-sm text-zinc-700">
                  {destination.city}, {destination.country}
                </span>
                {destination.description && (
                  <span className="mt-0.5 block text-xs text-zinc-600">
                    {destination.description}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
