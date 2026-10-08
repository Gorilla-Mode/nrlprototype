import type { FeatureCollection, Point } from 'geojson';
import type { GeoJSONSource, Map } from 'maplibre-gl';
import { registeredObstacleAttribution, type RegisteredObstacle } from '../obstacles/registeredObstacles.js';

export const registeredObstacleSourceId = 'registered-obstacles';
const markerLayerId = 'registered-obstacles-markers';
const selectedLayerId = 'registered-obstacles-selected';
type ObstacleFeatures = FeatureCollection<Point, { id: string }>;

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
        properties: { id: obstacle.id },
        geometry: { type: 'Point', coordinates: [obstacle.lng, obstacle.lat] },
      })),
    };
  }

  // The selection is a filter on its own layer: changing it never resends hundreds of points.
  function selectedFilter() {
    return ['==', ['get', 'id'], selectedId ?? ''] as ['==', ['get', string], string];
  }

  function render(dataChanged = true) {
    if (destroyed) return;
    const source = map.getSource<GeoJSONSource>(registeredObstacleSourceId);
    if (source) {
      if (dataChanged) source.setData(features());
    } else {
      // isStyleLoaded() stays false while any tile loads; only the style itself must be ready.
      // Before that addSource throws, and the style.load listener renders again.
      try {
        map.addSource(registeredObstacleSourceId, { type: 'geojson', data: features(), attribution: registeredObstacleAttribution });
      } catch { return; }
    }
    if (!map.getLayer(markerLayerId)) map.addLayer({
      id: markerLayerId, type: 'circle', source: registeredObstacleSourceId,
      paint: {
        'circle-color': visuals.fill,
        'circle-radius': visuals.radius,
        'circle-stroke-width': visuals.strokeWidth,
        'circle-stroke-color': visuals.outline,
      },
    });
    // Above the other markers, so the selected obstacle is never hidden by a neighbour.
    if (!map.getLayer(selectedLayerId)) map.addLayer({
      id: selectedLayerId, type: 'circle', source: registeredObstacleSourceId,
      filter: selectedFilter(),
      paint: {
        'circle-color': visuals.selected,
        'circle-radius': visuals.selectedRadius,
        'circle-stroke-width': visuals.strokeWidth,
        'circle-stroke-color': visuals.outline,
      },
    });
    else map.setFilter(selectedLayerId, selectedFilter());
  }

  const renderAll = () => render();
  map.on('style.load', renderAll);
  render();

  return {
    /** `null` hides every marker. */
    /** Called on every map move; only real changes reach MapLibre. */
    show(next: readonly RegisteredObstacle[] | null, nextSelectedId: string | null) {
      if (destroyed) return;
      const dataChanged = next !== obstacles;
      if (!dataChanged && nextSelectedId === selectedId) return;
      obstacles = next;
      selectedId = nextSelectedId;
      render(dataChanged);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      map.off('style.load', renderAll);
      if (map.getLayer(selectedLayerId)) map.removeLayer(selectedLayerId);
      if (map.getLayer(markerLayerId)) map.removeLayer(markerLayerId);
      if (map.getSource(registeredObstacleSourceId)) map.removeSource(registeredObstacleSourceId);
    },
  };
}
