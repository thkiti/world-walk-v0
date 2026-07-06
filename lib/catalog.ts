import type { WalkDestination } from "@/lib/types";

import champsElysees from "@/content/world/europe/france/paris/champs-elysees.json";
import shibuyaCrossing from "@/content/world/asia/japan/tokyo/shibuya-crossing.json";
import timesSquare from "@/content/world/north-america/usa/new-york/times-square.json";
import coventGarden from "@/content/world/europe/united-kingdom/london/covent-garden.json";
import venice from "@/content/world/europe/italy/venice/venice.json";
import kyotoGion from "@/content/world/asia/japan/kyoto/kyoto-gion.json";
import marinaBay from "@/content/world/asia/singapore/marina-bay.json";

export const CURATED_PLACES: WalkDestination[] = [
  champsElysees,
  shibuyaCrossing,
  timesSquare,
  coventGarden,
  venice,
  kyotoGion,
  marinaBay,
];

/** @deprecated Use CURATED_PLACES */
export const DESTINATIONS = CURATED_PLACES;

const destinationById = new Map(
  CURATED_PLACES.map((destination) => [destination.id, destination])
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
      destination.streetViewCoverage ?? "",
      ...(destination.tags ?? []),
    ].join(" ")
  );
}

export function getDestinationById(id: string): WalkDestination | undefined {
  return destinationById.get(id);
}

export function searchDestinations(query: string): WalkDestination[] {
  const normalized = normalizeSearchText(query);
  if (!normalized) return [];

  return CURATED_PLACES.filter((destination) =>
    destinationSearchText(destination).includes(normalized)
  );
}
