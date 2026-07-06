import type { LatLng, StreetViewState, WalkDestination } from "./types";

export const INITIAL_PITCH = 0;
export const EARTH_RADIUS_METERS = 6378137;

export function haversineDistance(a: LatLng, b: LatLng): number {
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const dLat = lat2 - lat1;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

export function getPathLengthMeters(points: LatLng[]): number {
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += haversineDistance(points[i], points[i + 1]);
  }
  return total;
}

export function bearing(from: LatLng, to: LatLng): number {
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export type RouteProgress = {
  position: LatLng;
  heading: number;
  atEnd: boolean;
};

export function getRouteProgress(
  points: LatLng[],
  distanceMeters: number
): RouteProgress {
  if (points.length < 2) {
    throw new Error("Path needs at least 2 points");
  }

  if (distanceMeters <= 0) {
    return {
      position: points[0],
      heading: bearing(points[0], points[1]),
      atEnd: false,
    };
  }

  const totalLength = getPathLengthMeters(points);
  if (distanceMeters >= totalLength) {
    const last = points[points.length - 1];
    const prev = points[points.length - 2];
    return {
      position: last,
      heading: bearing(prev, last),
      atEnd: true,
    };
  }

  let traveled = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const segmentLength = haversineDistance(points[i], points[i + 1]);
    if (traveled + segmentLength >= distanceMeters) {
      const t = (distanceMeters - traveled) / segmentLength;
      const position = {
        lat: points[i].lat + (points[i + 1].lat - points[i].lat) * t,
        lng: points[i].lng + (points[i + 1].lng - points[i].lng) * t,
      };
      return {
        position,
        heading: bearing(position, points[i + 1]),
        atEnd: false,
      };
    }
    traveled += segmentLength;
  }

  const last = points[points.length - 1];
  const prev = points[points.length - 2];
  return {
    position: last,
    heading: bearing(prev, last),
    atEnd: true,
  };
}

export function moveForward(
  position: LatLng,
  heading: number,
  distanceMeters: number
): LatLng {
  const headingRad = (heading * Math.PI) / 180;
  const latRad = (position.lat * Math.PI) / 180;
  const lngRad = (position.lng * Math.PI) / 180;
  const angularDistance = distanceMeters / EARTH_RADIUS_METERS;

  const newLatRad = Math.asin(
    Math.sin(latRad) * Math.cos(angularDistance) +
      Math.cos(latRad) * Math.sin(angularDistance) * Math.cos(headingRad)
  );
  const newLngRad =
    lngRad +
    Math.atan2(
      Math.sin(headingRad) * Math.sin(angularDistance) * Math.cos(latRad),
      Math.cos(angularDistance) - Math.sin(latRad) * Math.sin(newLatRad)
    );

  return {
    lat: (newLatRad * 180) / Math.PI,
    lng: (newLngRad * 180) / Math.PI,
  };
}

export function viewFromPlace(destination: WalkDestination): StreetViewState {
  return {
    position: destination.startPosition,
    heading: destination.initialHeading,
    pitch: INITIAL_PITCH,
  };
}

export function formatElapsed(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function getCumulativeDistances(points: LatLng[]): number[] {
  const cumulative = [0];
  for (let i = 0; i < points.length - 1; i++) {
    cumulative.push(cumulative[i] + haversineDistance(points[i], points[i + 1]));
  }
  return cumulative;
}

/** Route vertex index the walker has reached at the given path distance. */
export function getRoutePointIndexForDistance(
  points: LatLng[],
  distanceMeters: number
): number {
  if (points.length === 0) return 0;

  const cumulative = getCumulativeDistances(points);
  let index = 0;

  for (let i = 0; i < cumulative.length; i++) {
    if (distanceMeters >= cumulative[i]) {
      index = i;
    } else {
      break;
    }
  }

  return index;
}
