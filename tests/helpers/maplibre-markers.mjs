// Keep the real coordinate math; only replace Marker DOM mounting in unit tests.
export { LngLat, LngLatBounds } from 'maplibre-gl';

export class Marker {
  constructor(options) { this.options = options; }
  setLngLat(center) { this.center = center; return this; }
  getLngLat() { return this.center; }
  addTo(map) {
    this.map = map;
    map.markers.add(this);
    return this;
  }
  remove() { this.map?.markers.delete(this); return this; }
}
