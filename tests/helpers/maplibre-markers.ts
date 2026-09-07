// Keep the real coordinate math; only replace Marker DOM mounting in unit tests.
export { LngLat, LngLatBounds } from 'maplibre-gl';
import type { LngLat, MarkerOptions } from 'maplibre-gl';

export interface MarkerMap {
  markers: Set<Marker>;
}

export class Marker {
  options: MarkerOptions;
  center?: LngLat;
  map?: MarkerMap;

  constructor(options: MarkerOptions) { this.options = options; }
  setLngLat(center: LngLat) { this.center = center; return this; }
  getLngLat() {
    if (!this.center) throw new Error('Marker position has not been set');
    return this.center;
  }
  addTo(map: MarkerMap) {
    this.map = map;
    map.markers.add(this);
    return this;
  }
  remove() { this.map?.markers.delete(this); return this; }
}
