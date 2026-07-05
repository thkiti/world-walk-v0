export type LatLng = google.maps.LatLngLiteral;

export type WalkDestination = {
  id: string;
  title: string;
  place: string;
  continent: string;
  country: string;
  city: string;
  distanceKm: number;
  estimatedMinutes: number;
  difficulty: string;
  quality?: string;
  streetViewCoverage?: string;
  description?: string;
  whyWalkHere?: string[];
  tags?: string[];
  points: LatLng[];
};

export type StreetViewState = {
  position: LatLng;
  heading: number;
  pitch: number;
};

export type RouteProgress = {
  position: LatLng;
  heading: number;
  atEnd: boolean;
};

export type NavScreen =
  | { step: "home" }
  | { step: "continent"; continent: string }
  | { step: "country"; continent: string; country: string }
  | { step: "city"; continent: string; country: string; city: string }
  | { step: "preview"; destinationId: string }
  | { step: "walking"; destinationId: string };

export type MovementSource = "manual" | "phone-steps" | "remote-phone-sensor";
