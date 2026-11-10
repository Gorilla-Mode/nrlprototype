import type { FeatureCollection, LineString, Point, Polygon } from 'geojson';
import type { GeoJSONSource, LayerSpecification, Map } from 'maplibre-gl';
import { polygonGeometry, type GeometryDraft } from '../reporting/createDrawingController.js';

import { drawingSourceId, drawingLayerIds, drawingPreviewSourceId, drawingPreviewLayerIds } from './mapConfig.js';
import { idleCrosshairDrawingState, type CrosshairDrawingState } from './createMapDrawingInteraction.js';
export { drawingSourceId } from './mapConfig.js';
const { fill: fillLayerId, casing: lineCasingLayerId, line: lineLayerId, vertices: vertexLayerId } = drawingLayerIds;

interface MovementArrowOptions {
  map: Pick<Map, 'project' | 'unproject'>;
  length: number;
  width: number;
  candidateRadius: number;
}

/** Preview affected edges only; committed geometry and polygon fill stay in their own source. */
export function drawingPreviewFeatures(draft: GeometryDraft | null, preview: CrosshairDrawingState, arrow: MovementArrowOptions): FeatureCollection<Point | LineString, { kind: 'edge' | 'connector' | 'movement' | 'target' | 'candidate' }> {
  const collection: ReturnType<typeof drawingPreviewFeatures> = { type: 'FeatureCollection', features: [] };
  if (!draft || !preview.candidate) return collection;
  const { candidate, targetIndex, editing } = preview;
  const { vertices, type } = draft;
  const point = (kind: 'target' | 'candidate', coordinate: readonly [number, number]) => {
    collection.features.push({ type: 'Feature', properties: { kind }, geometry: { type: 'Point', coordinates: [...coordinate] } });
  };
  const edge = (kind: 'edge' | 'connector', vertex: readonly [number, number]) => {
    collection.features.push({ type: 'Feature', properties: { kind }, geometry: { type: 'LineString', coordinates: [[...candidate], [...vertex]] } });
  };
  point('candidate', candidate);
  if (targetIndex !== null && vertices[targetIndex]) {
    const origin = vertices[targetIndex];
    point('target', origin);
    if (!editing) edge('connector', origin);
    else {
      const start = arrow.map.project([...origin]);
      const end = arrow.map.project([...candidate]);
      const distance = Math.hypot(end.x - start.x, end.y - start.y);
      // Stop at the candidate's outer edge; overlapping markers have no visible shaft.
      const available = distance - arrow.candidateRadius;
      if (Number.isFinite(distance) && available > 0) {
        const dx = (end.x - start.x) / distance;
        const dy = (end.y - start.y) / distance;
        const tip = { x: end.x - dx * arrow.candidateRadius, y: end.y - dy * arrow.candidateRadius };
        const scale = Math.min(1, available / arrow.length);
        const length = arrow.length * scale;
        const halfWidth = arrow.width * scale / 2;
        const coordinate = (x: number, y: number): [number, number] => {
          const lngLat = arrow.map.unproject([x, y]);
          return [lngLat.lng, lngLat.lat];
        };
        const tipCoordinate = coordinate(tip.x, tip.y);
        for (const coordinates of [
          [[...origin], tipCoordinate],
          [coordinate(tip.x - dx * length - dy * halfWidth, tip.y - dy * length + dx * halfWidth),
            tipCoordinate,
            coordinate(tip.x - dx * length + dy * halfWidth, tip.y - dy * length - dx * halfWidth)],
        ]) collection.features.push({ type: 'Feature', properties: { kind: 'movement' }, geometry: { type: 'LineString', coordinates } });
      }
    }
  }
  const neighbors = new Set<number>();
  if (editing && targetIndex !== null && type !== 'Point') {
    if (targetIndex > 0) neighbors.add(targetIndex - 1);
    if (targetIndex + 1 < vertices.length) neighbors.add(targetIndex + 1);
    if (type === 'Polygon' && vertices.length > 1) {
      if (targetIndex === 0) neighbors.add(vertices.length - 1);
      if (targetIndex === vertices.length - 1) neighbors.add(0);
    }
  } else if (!editing && type !== 'Point' && vertices.length) {
    neighbors.add(vertices.length - 1);
    if (type === 'Polygon' && vertices.length >= 2) neighbors.add(0);
  }
  for (const index of neighbors) edge('edge', vertices[index]);
  return collection;
}

type DrawingFeatures = FeatureCollection<Point | LineString | Polygon, { vertexColor: string }>;

interface DrawingVisuals {
  preview: string;
  target: string;
  previewCasing: string;
  previewWidth: number;
  previewCasingThickness: number;
  previewDashLength: number;
  arrowLength: number;
  arrowWidth: number;
  targetWidth: number;
  targetCasing: number;
  targetRadius: number;
  point: string;
  outline: string;
  casing: string;
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
  let preview = idleCrosshairDrawingState;
  let pending = false;
  let rendering = false;
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
        preview: resolveColor('--color-drawing-preview'),
        target: resolveColor('--color-drawing-target'),
        previewCasing: resolveColor('--color-drawing-preview-casing'),
        previewWidth: number('--map-drawing-preview-edge-width'),
        previewCasingThickness: number('--map-drawing-preview-casing-thickness'),
        previewDashLength: number('--map-drawing-preview-dash-length'),
        arrowLength: number('--map-drawing-movement-arrow-length'),
        arrowWidth: number('--map-drawing-movement-arrow-width'),
        targetWidth: number('--map-drawing-target-line-width'),
        targetCasing: number('--map-drawing-target-casing-thickness'),
        targetRadius: number('--map-drawing-target-radius'),
        point: resolveColor('--color-drawing-point'),
        outline: resolveColor('--color-drawing-outline'),
        casing: resolveColor('--color-drawing-casing'),
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

  function previewFeatures() {
    return drawingPreviewFeatures(draft, preview, { map, length: visuals.arrowLength, width: visuals.arrowWidth,
      candidateRadius: visuals.radius + visuals.strokeWidth });
  }

  function features(): DrawingFeatures {
    const collection: DrawingFeatures = { type: 'FeatureCollection', features: [] };
    if (!draft) return collection;
    const { vertices, type } = draft;
    const properties = { vertexColor: visuals.point };
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
    if (destroyed || rendering) return;
    if ((!map.getSource(drawingSourceId) || !map.getSource(drawingPreviewSourceId)) && !map.isStyleLoaded()) {
      pending = true;
      return;
    }
    rendering = true;
    try {
      const source = map.getSource<GeoJSONSource>(drawingSourceId);
      if (source) source.setData(features());
      else {
        map.addSource(drawingSourceId, { type: 'geojson', data: features() });
      }
      if (!map.getLayer(fillLayerId)) map.addLayer({
        id: fillLayerId, type: 'fill', source: drawingSourceId,
        filter: ['==', '$type', 'Polygon'],
        paint: { 'fill-color': visuals.point, 'fill-opacity': visuals.fillOpacity },
      });
      if (!map.getLayer(lineCasingLayerId)) {
        const casingWidth = visuals.lineWidth + 2 * visuals.casingThickness;
        const casingDashLength = visuals.dashLength * visuals.lineWidth / casingWidth;
        map.addLayer({
          id: lineCasingLayerId, type: 'line', source: drawingSourceId,
          filter: ['==', '$type', 'LineString'],
          paint: {
            'line-color': visuals.casing,
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
      const previewData = previewFeatures();
      const previewSource = map.getSource<GeoJSONSource>(drawingPreviewSourceId);
      if (previewSource) previewSource.setData(previewData);
      else map.addSource(drawingPreviewSourceId, { type: 'geojson', data: previewData });
      // Offset matching segments sideways: the outline must not extend over connector gaps.
      const previewLayers: LayerSpecification[] = [
        { id: drawingPreviewLayerIds.connectorCasing, type: 'line', source: drawingPreviewSourceId,
          filter: ['in', 'kind', 'connector', 'movement'], layout: { 'line-join': 'round' },
          paint: { 'line-color': visuals.previewCasing, 'line-width': visuals.targetWidth + 2 * visuals.targetCasing } },
        { id: drawingPreviewLayerIds.connector, type: 'line', source: drawingPreviewSourceId,
          filter: ['in', 'kind', 'connector', 'movement'], layout: { 'line-join': 'round' },
          paint: { 'line-color': visuals.target, 'line-width': visuals.targetWidth } },
        { id: drawingPreviewLayerIds.edgesCasing, type: 'line', source: drawingPreviewSourceId,
          filter: ['==', 'kind', 'edge'], layout: { 'line-cap': 'butt', 'line-join': 'round' },
          paint: { 'line-color': visuals.previewCasing, 'line-width': visuals.previewWidth,
            'line-offset': -visuals.previewCasingThickness, 'line-dasharray': [visuals.previewDashLength, visuals.previewDashLength] } },
        { id: drawingPreviewLayerIds.edgesCasingRight, type: 'line', source: drawingPreviewSourceId,
          filter: ['==', 'kind', 'edge'], layout: { 'line-cap': 'butt', 'line-join': 'round' },
          paint: { 'line-color': visuals.previewCasing, 'line-width': visuals.previewWidth,
            'line-offset': visuals.previewCasingThickness, 'line-dasharray': [visuals.previewDashLength, visuals.previewDashLength] } },
        { id: drawingPreviewLayerIds.edges, type: 'line', source: drawingPreviewSourceId,
          filter: ['==', 'kind', 'edge'], layout: { 'line-cap': 'butt', 'line-join': 'round' },
          paint: { 'line-color': visuals.preview, 'line-width': visuals.previewWidth,
            'line-dasharray': [visuals.previewDashLength, visuals.previewDashLength] } },
        { id: drawingPreviewLayerIds.target, type: 'circle', source: drawingPreviewSourceId,
          filter: ['==', 'kind', 'target'], paint: { 'circle-radius': visuals.targetRadius, 'circle-opacity': 0,
            'circle-stroke-width': visuals.strokeWidth, 'circle-stroke-color': visuals.target } },
        { id: drawingPreviewLayerIds.candidate, type: 'circle', source: drawingPreviewSourceId,
          filter: ['==', 'kind', 'candidate'], paint: { 'circle-radius': visuals.radius, 'circle-color': visuals.preview,
            'circle-pitch-scale': 'viewport',
            'circle-stroke-width': visuals.strokeWidth, 'circle-stroke-color': visuals.previewCasing } },
      ];
      for (const layer of previewLayers) {
        if (!map.getLayer(layer.id)) map.addLayer(layer);
      }
      pending = false;
    } finally { rendering = false; }
  }

  function refreshTheme() {
    if (destroyed) return;
    visuals = readVisuals();
    render();
    for (const [id, property, value] of [
      [drawingPreviewLayerIds.edgesCasing, 'line-color', visuals.previewCasing],
      [drawingPreviewLayerIds.edgesCasingRight, 'line-color', visuals.previewCasing],
      [drawingPreviewLayerIds.edges, 'line-color', visuals.preview],
      [drawingPreviewLayerIds.connectorCasing, 'line-color', visuals.previewCasing],
      [drawingPreviewLayerIds.connector, 'line-color', visuals.target],
      [drawingPreviewLayerIds.target, 'circle-stroke-color', visuals.target],
      [drawingPreviewLayerIds.candidate, 'circle-color', visuals.preview],
      [drawingPreviewLayerIds.candidate, 'circle-stroke-color', visuals.previewCasing],
    ] as const) if (map.getLayer(id)) map.setPaintProperty(id, property, value);
    if (map.getLayer(fillLayerId)) map.setPaintProperty(fillLayerId, 'fill-color', visuals.point);
    if (map.getLayer(lineCasingLayerId)) map.setPaintProperty(lineCasingLayerId, 'line-color', visuals.casing);
    if (map.getLayer(lineLayerId)) map.setPaintProperty(lineLayerId, 'line-color', visuals.outline);
    if (map.getLayer(vertexLayerId)) map.setPaintProperty(vertexLayerId, 'circle-stroke-color', visuals.outline);
  }
  const themeObserver = new view.MutationObserver(refreshTheme);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  const themeMedia = view.matchMedia('(prefers-color-scheme: dark)');
  themeMedia.addEventListener('change', refreshTheme);
  function retry() { if (pending) render(); }
  function refreshMovement() {
    if (destroyed || rendering || !preview.editing || !preview.candidate) return;
    const source = map.getSource<GeoJSONSource>(drawingPreviewSourceId);
    if (source) source.setData(previewFeatures());
    else render();
  }
  map.on('style.load', render);
  map.on('styledata', retry);
  map.on('render', retry);
  // The candidate coordinate can stay unchanged on zoom/rotation/pitch or resize.
  map.on('move', refreshMovement);
  map.on('resize', refreshMovement);
  render();

  return {
    show(next: GeometryDraft | null) {
      if (destroyed) return;
      draft = next;
      render();
    },
    showPreview(next: CrosshairDrawingState) {
      if (destroyed) return;
      preview = next;
      render();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      map.off('style.load', render);
      map.off('styledata', retry);
      map.off('render', retry);
      map.off('move', refreshMovement);
      map.off('resize', refreshMovement);
      themeObserver.disconnect();
      themeMedia.removeEventListener('change', refreshTheme);
      for (const id of [...Object.values(drawingPreviewLayerIds).reverse(), vertexLayerId, lineLayerId, lineCasingLayerId, fillLayerId]) {
        if (map.getLayer(id)) map.removeLayer(id);
      }
      if (map.getSource(drawingPreviewSourceId)) map.removeSource(drawingPreviewSourceId);
      if (map.getSource(drawingSourceId)) map.removeSource(drawingSourceId);
    },
  };
}
