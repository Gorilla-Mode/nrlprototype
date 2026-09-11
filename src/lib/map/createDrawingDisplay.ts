import type { FeatureCollection, LineString, Point, Polygon } from 'geojson';
import type { GeoJSONSource, Map } from 'maplibre-gl';
import { polygonGeometry, type GeometryDraft } from '../reporting/createDrawingController.js';
import { obstacleGeometryChoices, type ObstacleGeometryType } from '../reporting/obstacle.js';

export const drawingSourceId = 'obstacle-drawing';
const fillLayerId = 'obstacle-drawing-fill';
const lineLayerId = 'obstacle-drawing-line';
const vertexLayerId = 'obstacle-drawing-vertices';
type DrawingFeatures = FeatureCollection<Point | LineString | Polygon, { color: string }>;

export function createDrawingDisplay(map: Map) {
  let draft: GeometryDraft | null = null;
  let destroyed = false;
  const document = map.getCanvas().ownerDocument;
  const view = document.defaultView!;

  // Resolve inherited CSS tokens through computed color before passing them to WebGL.
  const probe = document.createElement('span');
  probe.hidden = true;
  map.getContainer().append(probe);
  function resolveColor(token: string) {
    probe.style.color = `var(${token})`;
    return view.getComputedStyle(probe).color;
  }
  const colors = Object.fromEntries(obstacleGeometryChoices.map(({ type, colorToken }) => [type, resolveColor(colorToken)])) as Record<ObstacleGeometryType, string>;
  const surface = resolveColor('--color-surface');
  probe.remove();

  function features(): DrawingFeatures {
    const collection: DrawingFeatures = { type: 'FeatureCollection', features: [] };
    if (!draft) return collection;
    const { vertices, type } = draft;
    const properties = { color: colors[type] };
    for (const vertex of vertices) {
      collection.features.push({ type: 'Feature', properties, geometry: { type: 'Point', coordinates: [...vertex] } });
    }
    if (type === 'Polygon' && vertices.length >= 3) {
      const polygon = polygonGeometry(vertices);
      collection.features.push({ type: 'Feature', properties, geometry: polygon });
      collection.features.push({ type: 'Feature', properties, geometry: { type: 'LineString', coordinates: polygon.coordinates[0] } });
    } else if (vertices.length >= 2) {
      collection.features.push({ type: 'Feature', properties, geometry: { type: 'LineString', coordinates: vertices.map((vertex) => [...vertex]) } });
    }
    return collection;
  }

  function render() {
    if (destroyed) return;
    const source = map.getSource<GeoJSONSource>(drawingSourceId);
    if (source) source.setData(features());
    else {
      if (!map.isStyleLoaded()) return;
      map.addSource(drawingSourceId, { type: 'geojson', data: features() });
    }
    if (!map.getLayer(fillLayerId)) map.addLayer({
      id: fillLayerId, type: 'fill', source: drawingSourceId,
      filter: ['==', '$type', 'Polygon'],
      paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.2 },
    });
    if (!map.getLayer(lineLayerId)) map.addLayer({
      id: lineLayerId, type: 'line', source: drawingSourceId,
      filter: ['==', '$type', 'LineString'],
      paint: { 'line-color': ['get', 'color'], 'line-width': 3, 'line-dasharray': [2, 2] },
    });
    if (!map.getLayer(vertexLayerId)) map.addLayer({
      id: vertexLayerId, type: 'circle', source: drawingSourceId,
      filter: ['==', '$type', 'Point'],
      paint: { 'circle-color': ['get', 'color'], 'circle-radius': 6, 'circle-stroke-width': 2, 'circle-stroke-color': surface },
    });
  }

  map.on('style.load', render);
  render();

  return {
    show(next: GeometryDraft | null) {
      if (destroyed) return;
      draft = next;
      render();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      map.off('style.load', render);
      for (const id of [vertexLayerId, lineLayerId, fillLayerId]) {
        if (map.getLayer(id)) map.removeLayer(id);
      }
      if (map.getSource(drawingSourceId)) map.removeSource(drawingSourceId);
    },
  };
}
