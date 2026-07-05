import type { LatLng } from "@/lib/types";

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
  location: LatLng
): Promise<StreetViewLookupResult> {
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

    console.log("[StreetView] getPanorama", {
      requestedPosition: location,
      returnedPosition,
      status: streetViewStatusLabel(status),
      radiusMeters: radius,
      source: "OUTDOOR",
      pano: data?.location?.pano ?? null,
    });

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

  console.log("[StreetView] getPanorama", {
    requestedPosition: location,
    returnedPosition,
    status: streetViewStatusLabel(status),
    radiusMeters: fallbackRadius,
    source: "DEFAULT",
    pano: data?.location?.pano ?? null,
  });

  if (status === google.maps.StreetViewStatus.OK && data?.location?.latLng) {
    return resultFromPanoramaData(location, data, status, fallbackRadius);
  }

  console.warn("[StreetView] no panorama found after radius search", {
    requestedPosition: location,
    radiiMeters: LOOKUP_RADII_METERS,
  });

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
  if (result.status === google.maps.StreetViewStatus.OK) {
    if (result.pano) {
      panorama.setPano(result.pano);
    } else {
      panorama.setPosition(result.position);
    }
    console.log("[StreetView] setPosition applied", {
      requestedPosition: result.requested,
      appliedPosition: result.position,
      pano: result.pano,
      status: streetViewStatusLabel(result.status),
    });
  } else {
    console.warn("[StreetView] setPosition skipped — no valid panorama", {
      requestedPosition: result.requested,
      status: streetViewStatusLabel(result.status),
    });
  }

  panorama.setPov(pov);
}
