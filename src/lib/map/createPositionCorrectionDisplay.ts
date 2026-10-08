import type { Feature, LineString } from 'geojson';
import { Marker, type GeoJSONSource, type Map } from 'maplibre-gl';
import type { GeographicVertex } from '../reporting/obstacle.js';

const lineSourceId = 'position-correction-line';
const lineLayerId = 'position-correction-line';

/** Registered position as a pale dashed marker, with a dashed line to the corrected position. */
export function createPositionCorrectionDisplay(map: Map) {
  let origin: GeographicVertex | null = null;
  let target: GeographicVertex | null = null;
  let destroyed = false;
  const document = map.getCanvas().ownerDocument;
  const view = document.defaultView!;

  const element = document.createElement('div');
  element.className = 'registered-position-marker';
  element.setAttribute('aria-hidden', 'true');
  const label = document.createElement('span');
  label.className = 'map-label-pill';
  label.textContent = 'Registered';
  element.append(label);
  const marker = new Marker({ element });
  let markerShown = false;

  // CSS is authoritative; resolve colours for WebGL and lengths in CSS pixels.
  function readVisuals() {
    const probe = document.createElement('span');
    probe.hidden = true;
    map.getContainer().append(probe);
    probe.style.color = 'var(--color-registered-obstacle)';
    const style = view.getComputedStyle(map.getContainer());
    const number = (token: string): number => {
      const value = Number.parseFloat(style.getPropertyValue(token));
      if (!Number.isFinite(value)) throw new Error(`Missing numeric design token: ${token}`);
      return value;
    };
    try {
      return {
        color: view.getComputedStyle(probe).color,
        width: number('--map-drawing-line-width'),
        dashLength: number('--map-drawing-dash-length'),
      };
    } finally { probe.remove(); }
  }
  const visuals = readVisuals();

  function line(): Feature<LineString> | { type: 'FeatureCollection'; features: [] } {
    if (!origin || !target) return { type: 'FeatureCollection', features: [] };
    return { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [[...origin], [...target]] } };
  }

  function render() {
    if (destroyed) return;
    if (origin) {
      marker.setLngLat([...origin]);
      if (!markerShown) { marker.addTo(map); markerShown = true; }
    } else if (markerShown) {
      marker.remove();
      markerShown = false;
    }
    const source = map.getSource<GeoJSONSource>(lineSourceId);
    if (source) source.setData(line());
    else {
      // isStyleLoaded() stays false while any tile loads; only the style itself must be ready.
      // Before that addSource throws, and the style.load listener renders again.
      try { map.addSource(lineSourceId, { type: 'geojson', data: line() }); } catch { return; }
    }
    if (!map.getLayer(lineLayerId)) map.addLayer({
      id: lineLayerId, type: 'line', source: lineSourceId,
      layout: { 'line-cap': 'round' },
      paint: { 'line-color': visuals.color, 'line-width': visuals.width, 'line-dasharray': [visuals.dashLength, visuals.dashLength] },
    });
  }

  map.on('style.load', render);

  return {
    /** `null` origin hides both marker and line. */
    show(nextOrigin: GeographicVertex | null, nextTarget: GeographicVertex | null) {
      if (destroyed) return;
      origin = nextOrigin;
      target = nextOrigin ? nextTarget : null;
      render();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      map.off('style.load', render);
      marker.remove();
      if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId);
      if (map.getSource(lineSourceId)) map.removeSource(lineSourceId);
    },
  };
}
