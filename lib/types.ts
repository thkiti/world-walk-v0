export type LatLng = google.maps.LatLngLiteral;

export type WalkDestination = {
  id: string;
  title: string;
  place: string;
  continent: string;
  country: string;
  city: string;
  description?: string;
  streetViewCoverage?: string;
  tags?: string[];
  startPosition: LatLng;
  initialHeading: number;
};

export type StreetViewState = {
  position: LatLng;
  heading: number;
  pitch: number;
};

export type NavScreen =
  | { step: "home" }
  | { step: "walking"; destinationId: string };

export type MovementSource = "phone-steps" | "remote-phone-sensor";
