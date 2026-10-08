import type { FeatureCollection, Point } from 'geojson';
import type { GeoJSONSource, Map } from 'maplibre-gl';
import { registeredObstacleAttribution, type RegisteredObstacle } from '../obstacles/registeredObstacles.js';

export const registeredObstacleSourceId = 'registered-obstacles';
const markerLayerId = 'registered-obstacles-markers';
type ObstacleFeatures = FeatureCollection<Point, { id: string; selected: boolean }>;

interface ObstacleVisuals {
  fill: string;
  selected: string;
  outline: string;
  radius: number;
  selectedRadius: number;
  strokeWidth: number;
}

export function createObstacleDisplay(map: Map) {
  let obstacles: readonly RegisteredObstacle[] | null = null;
  let selectedId: string | null = null;
  let destroyed = false;
  const document = map.getCanvas().ownerDocument;
  const view = document.defaultView!;

  // CSS is authoritative; resolve colours for WebGL and lengths in CSS pixels.
  function readVisuals(): ObstacleVisuals {
    const probe = document.createElement('span');
    probe.hidden = true;
    map.getContainer().append(probe);
    const resolveColor = (token: string): string => {
      probe.style.color = `var(${token})`;
      return view.getComputedStyle(probe).color;
    };
    const style = view.getComputedStyle(map.getContainer());
    const number = (token: string): number => {
      const value = Number.parseFloat(style.getPropertyValue(token));
      if (!Number.isFinite(value)) throw new Error(`Missing numeric design token: ${token}`);
      return value;
    };
    try {
      return {
        fill: resolveColor('--color-registered-obstacle'),
        selected: resolveColor('--color-registered-obstacle-selected'),
        outline: resolveColor('--color-registered-obstacle-outline'),
        radius: number('--map-registered-obstacle-radius'),
        selectedRadius: number('--map-registered-obstacle-selected-radius'),
        strokeWidth: number('--map-registered-obstacle-stroke-width'),
      };
    } finally { probe.remove(); }
  }
  const visuals = readVisuals();

  function features(): ObstacleFeatures {
    return {
      type: 'FeatureCollection',
      features: (obstacles ?? []).map((obstacle) => ({
        type: 'Feature',
        properties: { id: obstacle.id, selected: obstacle.id === selectedId },
        geometry: { type: 'Point', coordinates: [obstacle.lng, obstacle.lat] },
      })),
    };
  }

  function render() {
    if (destroyed) return;
    const source = map.getSource<GeoJSONSource>(registeredObstacleSourceId);
    if (source) source.setData(features());
    else {
      // isStyleLoaded() stays false while any tile loads; only the style itself must be ready.
      // Before that addSource throws, and the style.load listener renders again.
      try {
        map.addSource(registeredObstacleSourceId, { type: 'geojson', data: features(), attribution: registeredObstacleAttribution });
      } catch { return; }
    }
    if (!map.getLayer(markerLayerId)) map.addLayer({
      id: markerLayerId, type: 'circle', source: registeredObstacleSourceId,
      layout: { 'circle-sort-key': ['case', ['get', 'selected'], 1, 0] },
      paint: {
        'circle-color': ['case', ['get', 'selected'], visuals.selected, visuals.fill],
        'circle-radius': ['case', ['get', 'selected'], visuals.selectedRadius, visuals.radius],
        'circle-stroke-width': visuals.strokeWidth,
        'circle-stroke-color': visuals.outline,
      },
    });
  }

  map.on('style.load', render);
  render();

  return {
    /** `null` hides every marker. */
    show(next: readonly RegisteredObstacle[] | null, nextSelectedId: string | null) {
      if (destroyed) return;
      obstacles = next;
      selectedId = nextSelectedId;
      render();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      map.off('style.load', render);
      if (map.getLayer(markerLayerId)) map.removeLayer(markerLayerId);
      if (map.getSource(registeredObstacleSourceId)) map.removeSource(registeredObstacleSourceId);
    },
  };
}
