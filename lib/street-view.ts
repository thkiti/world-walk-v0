import type { LatLng } from "@/lib/types";
import { devLog } from "@/lib/dev-log";

const LOOKUP_RADII_METERS = [50, 100, 200] as const;

export type StreetViewLookupResult = {
  requested: LatLng;
  position: LatLng;
  pano: string | null;
  status: google.maps.StreetViewStatus;
  radiusMeters: number | null;
};

function latLngFromGoogle(latLng: google.maps.LatLng): LatLng {
  return { lat: latLng.lat(), lng: latLng.lng() };
}

export function streetViewStatusLabel(
  status: google.maps.StreetViewStatus
): string {
  switch (status) {
    case google.maps.StreetViewStatus.OK:
      return "OK";
    case google.maps.StreetViewStatus.UNKNOWN_ERROR:
      return "UNKNOWN_ERROR";
    case google.maps.StreetViewStatus.ZERO_RESULTS:
      return "ZERO_RESULTS";
    default:
      return String(status);
  }
}

function getPanoramaAtRadius(
  service: google.maps.StreetViewService,
  location: LatLng,
  radius: number,
  source?: google.maps.StreetViewSource
): Promise<{
  data: google.maps.StreetViewPanoramaData | null;
  status: google.maps.StreetViewStatus;
}> {
  return new Promise((resolve) => {
    service.getPanorama(
      {
        location,
        radius,
        ...(source !== undefined ? { source } : {}),
      },
      (data, status) =>
        resolve({ data: data ?? null, status: status as google.maps.StreetViewStatus })
    );
  });
}

function resultFromPanoramaData(
  location: LatLng,
  data: google.maps.StreetViewPanoramaData,
  status: google.maps.StreetViewStatus,
  radius: number
): StreetViewLookupResult {
  const returnedPosition = data.location?.latLng
    ? latLngFromGoogle(data.location.latLng)
    : location;

  return {
    requested: location,
    position: returnedPosition,
    pano: data.location?.pano ?? null,
    status,
    radiusMeters: radius,
  };
}

export async function resolveStreetViewPanorama(
  service: google.maps.StreetViewService,
  location: LatLng,
  options?: { log?: boolean }
): Promise<StreetViewLookupResult> {
  const shouldLog = options?.log ?? process.env.NODE_ENV === "development";

  for (const radius of LOOKUP_RADII_METERS) {
    const { data, status } = await getPanoramaAtRadius(
      service,
      location,
      radius,
      google.maps.StreetViewSource.OUTDOOR
    );

    const returnedPosition = data?.location?.latLng
      ? latLngFromGoogle(data.location.latLng)
      : null;

    if (shouldLog) {
      devLog("[StreetView] getPanorama", {
        requestedPosition: location,
        returnedPosition,
        status: streetViewStatusLabel(status),
        radiusMeters: radius,
        source: "OUTDOOR",
        pano: data?.location?.pano ?? null,
      });
    }

    if (status === google.maps.StreetViewStatus.OK && data?.location?.latLng) {
      return resultFromPanoramaData(location, data, status, radius);
    }
  }

  const fallbackRadius = LOOKUP_RADII_METERS[LOOKUP_RADII_METERS.length - 1];
  const { data, status } = await getPanoramaAtRadius(
    service,
    location,
    fallbackRadius
  );

  const returnedPosition = data?.location?.latLng
    ? latLngFromGoogle(data.location.latLng)
    : null;

  if (shouldLog) {
    devLog("[StreetView] getPanorama", {
      requestedPosition: location,
      returnedPosition,
      status: streetViewStatusLabel(status),
      radiusMeters: fallbackRadius,
      source: "DEFAULT",
      pano: data?.location?.pano ?? null,
    });
  }

  if (status === google.maps.StreetViewStatus.OK && data?.location?.latLng) {
    return resultFromPanoramaData(location, data, status, fallbackRadius);
  }

  if (shouldLog) {
    devLog("[StreetView] no panorama found after radius search", {
      requestedPosition: location,
      radiiMeters: LOOKUP_RADII_METERS,
    });
  }

  return {
    requested: location,
    position: location,
    pano: null,
    status: google.maps.StreetViewStatus.ZERO_RESULTS,
    radiusMeters: null,
  };
}

export function applyStreetViewLookup(
  panorama: google.maps.StreetViewPanorama,
  result: StreetViewLookupResult,
  pov: { heading: number; pitch: number }
): void {
  const previousPanoramaId = panorama.getPano?.() || null;
  const applied = applyPanoramaIfChanged(
    panorama,
    result,
    pov,
    previousPanoramaId
  );

  if (!applied && result.status === google.maps.StreetViewStatus.OK) {
    devLog("[StreetView] setPosition skipped — same pano id", {
      requestedPosition: result.requested,
      pano: result.pano,
      status: streetViewStatusLabel(result.status),
    });
  }
}

export function applyPanoramaIfChanged(
  panorama: google.maps.StreetViewPanorama,
  result: StreetViewLookupResult,
  pov: { heading: number; pitch: number },
  previousPanoramaId: string | null
): boolean {
  const newPanoramaId = result.pano ?? null;

  devLog("[StreetView] panorama id", {
    previousPanoramaId,
    newPanoramaId,
  });

  if (result.status !== google.maps.StreetViewStatus.OK) {
    panorama.setPov(pov);
    return false;
  }

  if (newPanoramaId && newPanoramaId !== previousPanoramaId) {
    panorama.setPano(newPanoramaId);
    panorama.setPov(pov);
    devLog("[StreetView] setPano applied", {
      previousPanoramaId,
      newPanoramaId,
      appliedPosition: result.position,
    });
    return true;
  }

  if (!newPanoramaId) {
    panorama.setPosition(result.position);
    panorama.setPov(pov);
    devLog("[StreetView] setPosition applied", {
      requestedPosition: result.requested,
      appliedPosition: result.position,
      status: streetViewStatusLabel(result.status),
    });
    return true;
  }

  panorama.setPov(pov);
  return false;
}
