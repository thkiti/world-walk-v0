"use client";

import { useCallback, useState } from "react";
import { BrowseScreen } from "@/components/navigation/BrowseScreen";
import { HomeScreen } from "@/components/navigation/HomeScreen";
import { PreviewScreen } from "@/components/navigation/PreviewScreen";
import { ActiveWalkView } from "@/components/walk/ActiveWalkView";
import {
  CITIES,
  COUNTRIES,
  cityHasDestinations,
  getDestinationById,
  getDestinationsForCity,
} from "@/lib/catalog";
import type { NavScreen } from "@/lib/types";

export function WorldWalkApp() {
  const [screen, setScreen] = useState<NavScreen>({ step: "home" });

  const goHome = useCallback(() => setScreen({ step: "home" }), []);

  if (screen.step === "home") {
    return (
      <HomeScreen
        onSelectContinent={(continent) =>
          setScreen({ step: "continent", continent })
        }
        onSelectDestination={(destinationId) =>
          setScreen({ step: "preview", destinationId })
        }
      />
    );
  }

  if (screen.step === "continent") {
    const countries = COUNTRIES[screen.continent] ?? [];
    return (
      <BrowseScreen
        title={screen.continent}
        subtitle="Choose a country"
        items={countries}
        onSelect={(country) =>
          setScreen({
            step: "country",
            continent: screen.continent,
            country,
          })
        }
        onBack={goHome}
      />
    );
  }

  if (screen.step === "country") {
    const cities = CITIES[screen.continent]?.[screen.country] ?? [];
    return (
      <BrowseScreen
        title={screen.country}
        subtitle={screen.continent}
        items={cities}
        onSelect={(city) =>
          setScreen({
            step: "city",
            continent: screen.continent,
            country: screen.country,
            city,
          })
        }
        onBack={() =>
          setScreen({ step: "continent", continent: screen.continent })
        }
      />
    );
  }

  if (screen.step === "city") {
    const destinations = getDestinationsForCity(
      screen.continent,
      screen.country,
      screen.city
    );
    const items = destinations.map((destination) => destination.place);

    return (
      <BrowseScreen
        title={`Walk @ ${screen.city}`}
        subtitle={`${screen.country} · ${screen.continent}`}
        items={items}
        emptyMessage="Places coming soon for this city."
        onSelect={(place) => {
          const destination = destinations.find((item) => item.place === place);
          if (destination) {
            setScreen({ step: "preview", destinationId: destination.id });
          }
        }}
        onBack={() =>
          setScreen({
            step: "country",
            continent: screen.continent,
            country: screen.country,
          })
        }
      />
    );
  }

  if (screen.step === "preview") {
    const destination = getDestinationById(screen.destinationId);
    if (!destination) {
      return (
        <BrowseScreen
          title="Place not found"
          items={[]}
          onSelect={() => undefined}
          onBack={goHome}
        />
      );
    }

    return (
      <PreviewScreen
        destination={destination}
        onStartWalk={() =>
          setScreen({ step: "walking", destinationId: destination.id })
        }
        onBack={() => {
          if (
            cityHasDestinations(
              destination.continent,
              destination.country,
              destination.city
            )
          ) {
            setScreen({
              step: "city",
              continent: destination.continent,
              country: destination.country,
              city: destination.city,
            });
            return;
          }
          goHome();
        }}
      />
    );
  }

  if (screen.step === "walking") {
    const destination = getDestinationById(screen.destinationId);
    if (!destination) {
      goHome();
      return null;
    }

    return (
      <ActiveWalkView
        destination={destination}
        onExit={() =>
          setScreen({ step: "preview", destinationId: destination.id })
        }
      />
    );
  }

  return null;
}
