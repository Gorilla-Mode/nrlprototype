import type { FeatureCollection, LineString, Point, Polygon } from 'geojson';
import type { GeoJSONSource, Map } from 'maplibre-gl';
import { polygonGeometry, type GeometryDraft } from '../reporting/createDrawingController.js';

export const drawingSourceId = 'obstacle-drawing';
const fillLayerId = 'obstacle-drawing-fill';
const lineCasingLayerId = 'obstacle-drawing-line-casing';
const lineLayerId = 'obstacle-drawing-line';
const vertexLayerId = 'obstacle-drawing-vertices';
type DrawingFeatures = FeatureCollection<Point | LineString | Polygon, { vertexColor: string }>;

interface DrawingVisuals {
  point: string;
  outline: string;
  vertex: string;
  fillOpacity: number;
  lineWidth: number;
  casingThickness: number;
  casingOpacity: number;
  radius: number;
  strokeWidth: number;
  dashLength: number;
}

export function createDrawingDisplay(map: Map) {
  let draft: GeometryDraft | null = null;
  let destroyed = false;
  const document = map.getCanvas().ownerDocument;
  const view = document.defaultView!;

  // CSS is authoritative; resolve colours for WebGL and lengths in CSS pixels.
  function readVisuals(): DrawingVisuals {
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
        point: resolveColor('--color-drawing-point'),
        outline: resolveColor('--color-drawing-outline'),
        vertex: resolveColor('--color-drawing-vertex'),
        fillOpacity: number('--map-drawing-fill-opacity'),
        lineWidth: number('--map-drawing-line-width'),
        casingThickness: number('--map-drawing-casing-thickness'),
        casingOpacity: number('--map-drawing-casing-opacity'),
        radius: number('--map-drawing-vertex-radius'),
        strokeWidth: number('--map-drawing-stroke-width'),
        dashLength: number('--map-drawing-dash-length'),
      };
    } finally { probe.remove(); }
  }
  let visuals = readVisuals();

  function features(): DrawingFeatures {
    const collection: DrawingFeatures = { type: 'FeatureCollection', features: [] };
    if (!draft) return collection;
    const { vertices, type } = draft;
    const properties = { vertexColor: type === 'Point' ? visuals.point : visuals.vertex };
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
      paint: { 'fill-color': visuals.outline, 'fill-opacity': visuals.fillOpacity },
    });
    if (!map.getLayer(lineCasingLayerId)) {
      const casingWidth = visuals.lineWidth + 2 * visuals.casingThickness;
      const casingDashLength = visuals.dashLength * visuals.lineWidth / casingWidth;
      map.addLayer({
        id: lineCasingLayerId, type: 'line', source: drawingSourceId,
        filter: ['==', '$type', 'LineString'],
        paint: {
          'line-color': visuals.vertex,
          'line-width': casingWidth,
          'line-opacity': visuals.casingOpacity,
          'line-dasharray': [casingDashLength, casingDashLength],
        },
      });
    }
    if (!map.getLayer(lineLayerId)) map.addLayer({
      id: lineLayerId, type: 'line', source: drawingSourceId,
      filter: ['==', '$type', 'LineString'],
      paint: { 'line-color': visuals.outline, 'line-width': visuals.lineWidth, 'line-dasharray': [visuals.dashLength, visuals.dashLength] },
    });
    if (!map.getLayer(vertexLayerId)) map.addLayer({
      id: vertexLayerId, type: 'circle', source: drawingSourceId,
      filter: ['==', '$type', 'Point'],
      paint: { 'circle-color': ['get', 'vertexColor'], 'circle-radius': visuals.radius, 'circle-stroke-width': visuals.strokeWidth, 'circle-stroke-color': visuals.outline },
    });
  }

  function refreshTheme() {
    if (destroyed) return;
    visuals = readVisuals();
    render();
    if (map.getLayer(fillLayerId)) map.setPaintProperty(fillLayerId, 'fill-color', visuals.outline);
    if (map.getLayer(lineCasingLayerId)) map.setPaintProperty(lineCasingLayerId, 'line-color', visuals.vertex);
    if (map.getLayer(lineLayerId)) map.setPaintProperty(lineLayerId, 'line-color', visuals.outline);
    if (map.getLayer(vertexLayerId)) map.setPaintProperty(vertexLayerId, 'circle-stroke-color', visuals.outline);
  }
  const themeObserver = new view.MutationObserver(refreshTheme);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  const themeMedia = view.matchMedia('(prefers-color-scheme: dark)');
  themeMedia.addEventListener('change', refreshTheme);
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
      themeObserver.disconnect();
      themeMedia.removeEventListener('change', refreshTheme);
      for (const id of [vertexLayerId, lineLayerId, lineCasingLayerId, fillLayerId]) {
        if (map.getLayer(id)) map.removeLayer(id);
      }
      if (map.getSource(drawingSourceId)) map.removeSource(drawingSourceId);
    },
  };
}
