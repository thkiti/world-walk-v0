import { devLog } from "@/lib/dev-log";
import {
  resolveStreetViewPanorama,
  streetViewStatusLabel,
  type StreetViewLookupResult,
} from "@/lib/street-view";
import type { LatLng } from "@/lib/types";

const PREFETCH_LOOKAHEAD = 3;

export class StreetViewPrefetchCache {
  private cache = new Map<number, StreetViewLookupResult>();
  private inflight = new Map<number, Promise<StreetViewLookupResult>>();

  get(index: number): StreetViewLookupResult | undefined {
    return this.cache.get(index);
  }

  clear(): void {
    this.cache.clear();
    this.inflight.clear();
  }

  async prefetch(
    service: google.maps.StreetViewService,
    index: number,
    location: LatLng
  ): Promise<StreetViewLookupResult> {
    const cached = this.cache.get(index);
    if (cached) return cached;

    const existing = this.inflight.get(index);
    if (existing) return existing;

    const promise = resolveStreetViewPanorama(service, location, {
      log: false,
    }).then((result) => {
      if (result.status === google.maps.StreetViewStatus.OK) {
        this.cache.set(index, result);
      }
      this.inflight.delete(index);
      return result;
    });

    this.inflight.set(index, promise);
    return promise;
  }

  prefetchAhead(
    service: google.maps.StreetViewService,
    points: LatLng[],
    currentIndex: number
  ): void {
    for (let offset = 0; offset <= PREFETCH_LOOKAHEAD; offset++) {
      const index = currentIndex + offset;
      if (index >= points.length) continue;

      void this.prefetch(service, index, points[index]).then((result) => {
        if (offset > 0) {
          devLog("[StreetView prefetch]", {
            currentIndex,
            prefetchedIndex: index,
            panoramaStatus: streetViewStatusLabel(result.status),
          });
        }
      });
    }
  }
}

export { PREFETCH_LOOKAHEAD };
