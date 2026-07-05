"use client";

import { useMemo, useState } from "react";
import { Map } from "@vis.gl/react-google-maps";
import { CONTINENTS, searchDestinations } from "@/lib/catalog";
import { GLASS_PANEL, GLASS_SHEET, TOUCH_BUTTON } from "@/lib/ui";

type HomeScreenProps = {
  onSelectContinent: (continent: string) => void;
  onSelectDestination: (destinationId: string) => void;
};

export function HomeScreen({
  onSelectContinent,
  onSelectDestination,
}: HomeScreenProps) {
  const [query, setQuery] = useState("");

  const searchResults = useMemo(() => searchDestinations(query), [query]);

  return (
    <div className="relative h-dvh w-full">
      <Map
        defaultCenter={{ lat: 48.8566, lng: 2.3522 }}
        defaultZoom={4}
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
          WORLD WALK
        </h1>
        <p className="mt-1 text-sm text-zinc-800">
          Where would you like to Walk @ ?
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

        {searchResults.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {searchResults.map((destination) => (
              <li key={destination.id}>
                <button
                  type="button"
                  className={`${TOUCH_BUTTON} w-full bg-white/50 text-left text-zinc-900 hover:bg-white/70`}
                  onClick={() => onSelectDestination(destination.id)}
                >
                  <span className="block font-medium">{destination.title}</span>
                  <span className="block text-sm text-zinc-700">
                    {destination.city}, {destination.country}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <>
            <p className="mt-4 text-xs font-semibold tracking-wide text-zinc-700 uppercase">
              Explore by continent
            </p>
            <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-1">
              {CONTINENTS.map((continent) => (
                <li key={continent}>
                  <button
                    type="button"
                    className={`${TOUCH_BUTTON} w-full bg-white/50 text-zinc-900 hover:bg-white/70`}
                    onClick={() => onSelectContinent(continent)}
                  >
                    {continent}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
