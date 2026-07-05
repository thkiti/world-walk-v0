import type { WalkDestination } from "@/lib/types";

import champsElysees from "@/content/world/europe/france/paris/champs-elysees.json";

export const CONTINENTS = [
  "Europe",
  "Asia",
  "North America",
  "South America",
  "Africa",
  "Oceania",
] as const;

export const COUNTRIES: Record<string, string[]> = {
  Europe: ["France", "United Kingdom", "Italy", "Spain", "Germany"],
  Asia: ["Japan", "Thailand", "Singapore"],
  "North America": ["United States", "Canada", "Mexico"],
  "South America": ["Brazil", "Argentina", "Chile"],
  Africa: ["South Africa", "Morocco", "Egypt"],
  Oceania: ["Australia", "New Zealand"],
};

export const CITIES: Record<string, Record<string, string[]>> = {
  Europe: {
    France: ["Paris", "Lyon", "Nice", "Marseille"],
    "United Kingdom": ["London", "Edinburgh"],
    Italy: ["Rome", "Florence"],
    Spain: ["Barcelona", "Madrid"],
    Germany: ["Berlin", "Munich"],
  },
  Asia: {
    Japan: ["Tokyo", "Kyoto", "Osaka"],
    Thailand: ["Bangkok", "Chiang Mai"],
    Singapore: ["Singapore"],
  },
  "North America": {
    "United States": ["New York", "San Francisco", "Chicago"],
    Canada: ["Toronto", "Vancouver"],
    Mexico: ["Mexico City"],
  },
  "South America": {
    Brazil: ["Rio de Janeiro", "São Paulo"],
    Argentina: ["Buenos Aires"],
    Chile: ["Santiago"],
  },
  Africa: {
    "South Africa": ["Cape Town"],
    Morocco: ["Marrakech"],
    Egypt: ["Cairo"],
  },
  Oceania: {
    Australia: ["Sydney", "Melbourne"],
    "New Zealand": ["Auckland", "Wellington"],
  },
};

export const DESTINATIONS: WalkDestination[] = [champsElysees];

const destinationById = new Map(
  DESTINATIONS.map((destination) => [destination.id, destination])
);

function normalizeSearchText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/-/g, " ")
    .trim();
}

function destinationSearchText(destination: WalkDestination): string {
  return normalizeSearchText(
    [
      destination.title,
      destination.place,
      destination.city,
      destination.country,
      destination.continent,
      destination.description ?? "",
      destination.quality ?? "",
      destination.streetViewCoverage ?? "",
      ...(destination.tags ?? []),
      ...(destination.whyWalkHere ?? []),
    ].join(" ")
  );
}

export function getDestinationById(id: string): WalkDestination | undefined {
  return destinationById.get(id);
}

export function getDestinationsForCity(
  continent: string,
  country: string,
  city: string
): WalkDestination[] {
  return DESTINATIONS.filter(
    (destination) =>
      destination.continent === continent &&
      destination.country === country &&
      destination.city === city
  );
}

export function searchDestinations(query: string): WalkDestination[] {
  const normalized = normalizeSearchText(query);
  if (!normalized) return [];

  return DESTINATIONS.filter((destination) =>
    destinationSearchText(destination).includes(normalized)
  );
}

export function cityHasDestinations(
  continent: string,
  country: string,
  city: string
): boolean {
  return getDestinationsForCity(continent, country, city).length > 0;
}
