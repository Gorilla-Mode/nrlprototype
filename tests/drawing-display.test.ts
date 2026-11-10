import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import type { FeatureCollection } from 'geojson';
import type { GeoJSONSourceSpecification, LayerSpecification, Map as MapLibreMap } from 'maplibre-gl';
import { drawingPreviewSourceId, drawingPreviewLayerIds } from '../src/lib/map/mapConfig.js';
import { createDrawingDisplay, drawingSourceId, drawingPreviewFeatures } from '../src/lib/map/createDrawingDisplay.js';

const arrowOptions = (map: Pick<MapLibreMap, 'project' | 'unproject'>) => ({ map, length: 10, width: 10, candidateRadius: 8 });

function setup(t: TestContext) {
  const layers = new Map<string, LayerSpecification>();
  const sources = new Map<string, { data: FeatureCollection; setData: (data: FeatureCollection) => void }>();
  const callbacks = new Map<string, Set<() => void>>();
  const removals: string[] = [];
  let probes = 0;
  const tokenColors: Record<string, string> = {
    'var(--color-drawing-preview)': 'rgb(233, 120, 110)',
    'var(--color-drawing-target)': 'rgb(0, 0, 0)',
    'var(--color-drawing-preview-casing)': 'rgb(255, 255, 255)',
    'var(--color-drawing-point)': 'rgb(215, 40, 0)',
    'var(--color-drawing-outline)': 'rgb(23, 23, 23)',
    'var(--color-drawing-casing)': 'rgb(255, 255, 255)',
  };
  let themeChanged = () => {};
  const media = new EventTarget();
  const dimensions: Record<string, string> = {
    '--map-drawing-preview-edge-width': '3px', '--map-drawing-target-line-width': '2px',
    '--map-drawing-preview-casing-thickness': '1px', '--map-drawing-preview-dash-length': '2',
    '--map-drawing-movement-arrow-length': '10px', '--map-drawing-movement-arrow-width': '10px',
    '--map-drawing-target-casing-thickness': '1px', '--map-drawing-target-radius': '10px',
    '--map-drawing-fill-opacity': '0.35', '--map-drawing-line-width': '3px',
    '--map-drawing-casing-thickness': '1px', '--map-drawing-casing-opacity': '0.7',
    '--map-drawing-vertex-radius': '6px', '--map-drawing-stroke-width': '2px', '--map-drawing-dash-length': '2',
  };
  const document = {
    documentElement: {},
    createElement: () => ({ style: { color: '' }, remove: () => { probes--; } }),
    defaultView: {
      getComputedStyle: (element: { style?: { color: string } }) => ({ color: tokenColors[element.style?.color ?? ''], getPropertyValue: (token: string) => dimensions[token] }),
      matchMedia: () => media,
      MutationObserver: class {
        constructor(callback: () => void) { themeChanged = callback; }
        observe() {}
        disconnect() { themeChanged = () => {}; }
      },
    },
  };
  const map = {
    ready: false,
    scale: 100, bearing: 0, pitchScale: 1, offset: [0, 0],
    project([lng, lat]: [number, number]) {
      const x = lng * this.scale, y = lat * this.scale;
      const cos = Math.cos(this.bearing), sin = Math.sin(this.bearing);
      return { x: x * cos - y * sin + this.offset[0], y: (x * sin + y * cos) * this.pitchScale + this.offset[1] };
    },
    unproject([x, y]: [number, number]) {
      x -= this.offset[0]; y = (y - this.offset[1]) / this.pitchScale;
      const cos = Math.cos(this.bearing), sin = Math.sin(this.bearing);
      return { lng: (x * cos + y * sin) / this.scale, lat: (-x * sin + y * cos) / this.scale };
    },
    getCanvas: () => ({ ownerDocument: document }),
    getContainer: () => ({ append: () => { probes++; } }),
    isStyleLoaded() { return this.ready; },
    getSource: (id: string) => sources.get(id),
    addSource(id: string, spec: GeoJSONSourceSpecification) {
      assert.equal(sources.has(id), false);
      sources.set(id, { data: spec.data as FeatureCollection, setData(data) { this.data = data; } });
    },
    removeSource(id: string) { assert.ok([...layers.values()].every(layer => !('source' in layer) || layer.source !== id)); removals.push(id); sources.delete(id); },
    getLayer: (id: string) => layers.get(id),
    addLayer(layer: LayerSpecification) { assert.equal(layers.has(layer.id), false); layers.set(layer.id, layer); },
    setPaintProperty(id: string, property: string, value: unknown) {
      const layer = layers.get(id)!;
      Object.assign(layer.paint!, { [property]: value });
    },
    removeLayer(id: string) { removals.push(id); layers.delete(id); },
    on(event: string, callback: () => void) {
      if (!callbacks.has(event)) callbacks.set(event, new Set());
      callbacks.get(event)!.add(callback);
    },
    off(event: string, callback: () => void) { callbacks.get(event)?.delete(callback); },
    fire(event: string) { for (const callback of callbacks.get(event) ?? []) callback(); },
    load() { this.ready = true; this.fire('style.load'); },
  };
  let writes = 0;
  const originalAddSource = map.addSource;
  map.addSource = (id, spec) => {
    originalAddSource(id, spec);
    const source = sources.get(id)!;
    const setData = source.setData.bind(source);
    source.setData = data => { writes++; setData(data); };
  };
  const display = createDrawingDisplay(map as unknown as MapLibreMap);
  t.after(() => display.destroy());
  return { map, display, layers, sources, callbacks, removals, tokenColors, media, themeChanged: () => themeChanged(),
    arrow: arrowOptions(map as unknown as MapLibreMap),
    get writes() { return writes; },
    get preview() { return sources.get(drawingPreviewSourceId)!.data; },
    get data() { return sources.get(drawingSourceId)!.data; }, get probes() { return probes; } };
}

test('buffers the latest geometry before loading, resolves CSS tokens, and adds layers once', (t) => {
  const h = setup(t);
  h.display.show({ type: 'LineString', vertices: [[5, 60]] });
  h.display.show({ type: 'LineString', vertices: [[5, 60], [5.1, 60.1]] });
  assert.equal(h.sources.size, 0);
  h.map.load();
  assert.equal(h.sources.size, 2);
  assert.equal(h.layers.size, 11);
  assert.equal(h.probes, 0, 'temporary token resolver was removed');
  assert.deepEqual(h.data.features.map((feature) => feature.geometry.type), ['Point', 'Point', 'LineString']);
  assert.equal(h.data.features[0].properties?.vertexColor, 'rgb(215, 40, 0)');
  const orderedLayers = [...h.layers.values()];
  assert.deepEqual(orderedLayers.map(({ id }) => id), [
    'obstacle-drawing-fill',
    'obstacle-drawing-line-casing',
    'obstacle-drawing-line',
    'obstacle-drawing-vertices',
    drawingPreviewLayerIds.connectorCasing,
    drawingPreviewLayerIds.connector,
    drawingPreviewLayerIds.edgesCasing,
    drawingPreviewLayerIds.edgesCasingRight,
    drawingPreviewLayerIds.edges,
    drawingPreviewLayerIds.target,
    drawingPreviewLayerIds.candidate,
  ]);
  const casing = orderedLayers[1];
  const line = orderedLayers[2];
  assert.ok(casing?.type === 'line');
  assert.ok(line?.type === 'line');
  assert.deepEqual(casing.filter, ['==', '$type', 'LineString']);
  assert.equal(casing.paint?.['line-color'], 'rgb(255, 255, 255)');
  assert.equal(casing.paint?.['line-width'], 5);
  assert.equal(casing.paint?.['line-opacity'], 0.7);
  assert.deepEqual(
    casing.paint?.['line-dasharray'],
    [2 * 3 / 5, 2 * 3 / 5],
    'casing dash units preserve the foreground dash and gap lengths in pixels',
  );
  assert.equal(line.paint?.['line-color'], 'rgb(23, 23, 23)');
  assert.equal(line.paint?.['line-width'], 3);
  assert.deepEqual(line.paint?.['line-dasharray'], [2, 2]);
  const fill = [...h.layers.values()].find((layer) => layer.type === 'fill');
  assert.equal(fill?.paint?.['fill-color'], 'rgb(215, 40, 0)');
  assert.equal(fill?.paint?.['fill-opacity'], 0.35);
  const vertex = [...h.layers.values()].find((layer) => layer.type === 'circle');
  assert.deepEqual(vertex?.paint?.['circle-color'], ['get', 'vertexColor']);
  assert.equal(vertex?.paint?.['circle-stroke-color'], 'rgb(23, 23, 23)');
  h.map.fire('style.load');
  assert.equal(h.layers.size, 11);
});

test('shows only placed vertices; polygon closing edge and fill appear starting at three corners', (t) => {
  const h = setup(t);
  h.map.load();
  h.display.show({ type: 'Point', vertices: [[5, 60]] });
  assert.equal(h.data.features.length, 1);
  assert.equal(h.data.features[0].properties?.vertexColor, 'rgb(215, 40, 0)');
  h.display.show({ type: 'Polygon', vertices: [[5, 60], [6, 60]] });
  assert.deepEqual(h.data.features.map((feature) => feature.geometry.type), ['Point', 'Point', 'LineString']);
  assert.ok(h.data.features.slice(0, 2).every((feature) => feature.properties?.vertexColor === 'rgb(215, 40, 0)'));
  assert.deepEqual(h.data.features[2].geometry, { type: 'LineString', coordinates: [[5, 60], [6, 60]] });
  h.display.show({ type: 'Polygon', vertices: [[5, 60], [6, 60], [6, 61]] });
  assert.equal(h.data.features.filter((feature) => feature.geometry.type === 'Point').length, 3);
  assert.deepEqual(h.data.features[3].geometry, { type: 'Polygon', coordinates: [[[5, 60], [6, 60], [6, 61], [5, 60]]] });
  assert.deepEqual(h.data.features[4].geometry, { type: 'LineString', coordinates: [[5, 60], [6, 60], [6, 61], [5, 60]] });
  assert.ok(h.data.features.slice(0, 3).every((feature) => feature.properties?.vertexColor === 'rgb(215, 40, 0)'));
  h.display.show({ type: 'Polygon', vertices: [[5, 60], [6, 60]] });
  assert.equal(h.data.features.length, 3, 'Undo removes the fill and closing edge');
});

test('style replacement restores retained geographic geometry; Delete clears data, including before load', (t) => {
  const h = setup(t);
  h.display.show({ type: 'Point', vertices: [[5, 60]] });
  h.display.show(null);
  h.map.load();
  assert.equal(h.data.features.length, 0);
  h.display.show({ type: 'Polygon', vertices: [[5, 60], [6, 60], [6, 61]] });
  const expected = h.data;
  h.sources.clear();
  h.layers.clear();
  h.map.load();
  assert.deepEqual(h.data, expected);
  assert.ok(h.data.features.slice(0, 3).every((feature) => feature.properties?.vertexColor === 'rgb(215, 40, 0)'));
  const restoredFill = [...h.layers.values()].find((layer) => layer.type === 'fill');
  assert.ok(restoredFill?.type === 'fill');
  assert.equal(restoredFill.paint?.['fill-color'], 'rgb(215, 40, 0)');
  h.display.show(null);
  assert.deepEqual(h.data.features, []);
});

test('teardown removes layers before the source, unregisters listeners, and ignores later loading or updates', (t) => {
  const h = setup(t);
  h.map.load();
  h.display.show({ type: 'Point', vertices: [[5, 60]] });
  h.display.destroy();
  h.display.destroy();
  assert.equal(h.sources.size, 0);
  assert.equal(h.layers.size, 0);
  assert.equal(h.removals.at(-1), drawingSourceId);
  assert.deepEqual(h.removals, [
    ...Object.values(drawingPreviewLayerIds).reverse(),
    'obstacle-drawing-vertices',
    'obstacle-drawing-line',
    'obstacle-drawing-line-casing',
    'obstacle-drawing-fill',
    drawingPreviewSourceId,
    drawingSourceId,
  ]);
  assert.equal(h.callbacks.get('style.load')?.size, 0);
  h.display.show({ type: 'Point', vertices: [[6, 61]] });
  h.map.load();
  assert.equal(h.sources.size, 0);
});

test('theme changes refresh drawing colors and preserve retained coordinates', (t) => {
  const h = setup(t);
  h.map.load();
  h.display.show({ type: 'Polygon', vertices: [[5, 60], [6, 60], [6, 61]] });
  h.display.showPreview({ candidate: [7, 61], targetIndex: 1, editing: true });
  const preview = structuredClone(h.preview);
  h.tokenColors['var(--color-drawing-point)'] = 'rgb(230, 50, 20)';
  h.tokenColors['var(--color-drawing-preview)'] = 'rgb(234, 121, 111)';
  h.tokenColors['var(--color-drawing-preview-casing)'] = 'rgb(250, 250, 250)';
  h.themeChanged();
  assert.deepEqual(h.preview, preview, 'theme changes preserve movement and affected-edge coordinates');
  const edges = h.layers.get(drawingPreviewLayerIds.edges);
  const edgesCasing = h.layers.get(drawingPreviewLayerIds.edgesCasing);
  const edgesCasingRight = h.layers.get(drawingPreviewLayerIds.edgesCasingRight);
  assert.ok(edges?.type === 'line' && edgesCasing?.type === 'line' && edgesCasingRight?.type === 'line');
  assert.equal(edges.paint?.['line-color'], 'rgb(234, 121, 111)');
  assert.equal(edgesCasing.paint?.['line-color'], 'rgb(250, 250, 250)');
  assert.equal(edgesCasingRight.paint?.['line-color'], 'rgb(250, 250, 250)');
  assert.ok(h.data.features.slice(0, 3).every((feature) => feature.properties?.vertexColor === 'rgb(230, 50, 20)'));
  const fill = [...h.layers.values()].find((layer) => layer.type === 'fill');
  assert.ok(fill?.type === 'fill');
  assert.equal(fill.paint?.['fill-color'], 'rgb(230, 50, 20)');
  const vertex = [...h.layers.values()].find(layer => layer.type === 'circle');
  assert.equal(vertex?.paint?.['circle-stroke-color'], 'rgb(23, 23, 23)');
  h.media.dispatchEvent(new Event('change'));
  assert.equal(h.data.features[0].properties?.vertexColor, 'rgb(230, 50, 20)');
  assert.deepEqual(h.data.features[3].geometry, { type: 'Polygon', coordinates: [[[5, 60], [6, 60], [6, 61], [5, 60]]] });
  h.display.destroy();
  h.media.dispatchEvent(new Event('change'));
  h.themeChanged();
  assert.equal(h.sources.size, 0);
});

for (const [type, vertices, editing, targetIndex, neighbors] of [
  ['LineString', [[1, 1]], false, 0, [[1, 1]]],
  ['LineString', [[1, 1], [2, 2], [3, 3]], false, 1, [[3, 3]]],
  ['LineString', [[1, 1], [2, 2], [3, 3]], true, 0, [[2, 2]]],
  ['LineString', [[1, 1], [2, 2], [3, 3]], true, 1, [[1, 1], [3, 3]]],
  ['LineString', [[1, 1], [2, 2], [3, 3]], true, 2, [[2, 2]]],
  ['Polygon', [[1, 1]], true, 0, []],
  ['Polygon', [[1, 1], [2, 2]], true, 0, [[2, 2]]],
  ['Polygon', [[1, 1], [2, 2]], true, 1, [[1, 1]]],
  ['Polygon', [[1, 1], [2, 2]], false, 0, [[2, 2], [1, 1]]],
  ['Polygon', [[1, 1], [2, 2], [3, 3]], true, 0, [[2, 2], [3, 3]]],
  ['Polygon', [[1, 1], [2, 2], [3, 3]], true, 2, [[2, 2], [1, 1]]],
  ['Point', [[1, 1]], true, 0, []],
  ['Point', [[1, 1]], false, 0, []],
] as const) {
  test(`${type} ${vertices.length} vertices: ${editing ? 'edit' : 'add'} preview at ${targetIndex} draws only affected edges`, (t) => {
    const h = setup(t);
    const draft = { type, vertices };
    const before = structuredClone(draft);
    const features = drawingPreviewFeatures(draft, { candidate: [9, 9], targetIndex, editing }, h.arrow).features;
    assert.deepEqual(features.filter(f => f.properties.kind === 'edge').map(f => f.geometry),
      neighbors.map(vertex => ({ type: 'LineString', coordinates: [[9, 9], vertex] })));
    assert.deepEqual(features.find(f => f.properties.kind === 'connector')?.geometry,
      editing ? undefined : { type: 'LineString', coordinates: [[9, 9], vertices[targetIndex]] });
    assert.equal(features.filter(f => f.properties.kind === 'movement').length, editing ? 2 : 0);
    assert.deepEqual(features.find(f => f.properties.kind === 'target')?.geometry,
      { type: 'Point', coordinates: vertices[targetIndex] });
    assert.equal(features.some(f => (f.geometry.type as string) === 'Polygon'), false);
    assert.deepEqual(draft, before);
  });
}

test('buffered preview retries when style.load is early and stops redrawing after success', (t) => {
  const h = setup(t);
  const draft = { type: 'Polygon', vertices: [[1, 1], [2, 2]] } as const;
  h.display.show(draft);
  h.display.showPreview({ candidate: [3, 3], targetIndex: 0, editing: true });
  h.map.fire('style.load');
  h.map.fire('render');
  assert.equal(h.sources.size, 0);
  h.map.ready = true;
  h.map.fire('render');
  assert.deepEqual(h.preview, drawingPreviewFeatures(draft, { candidate: [3, 3], targetIndex: 0, editing: true }, h.arrow));
  const writes = h.writes;
  for (let i = 0; i < 10; i++) { h.map.fire('render'); h.map.fire('styledata'); }
  assert.equal(h.writes, writes, 'source.setData must not trigger a render retry loop');
  const edges = h.layers.get(drawingPreviewLayerIds.edges);
  const connector = h.layers.get(drawingPreviewLayerIds.connector);
  const casing = h.layers.get(drawingPreviewLayerIds.connectorCasing);
  assert.ok(edges?.type === 'line' && connector?.type === 'line' && casing?.type === 'line');
  assert.equal(edges.paint?.['line-width'], 3);
  assert.equal(edges.paint?.['line-color'], 'rgb(233, 120, 110)');
  assert.deepEqual(edges.layout, { 'line-cap': 'butt', 'line-join': 'round' });
  const placedLine = h.layers.get('obstacle-drawing-line');
  const placedCasing = h.layers.get('obstacle-drawing-line-casing');
  assert.ok(placedLine?.type === 'line' && placedCasing?.type === 'line');
  assert.equal(edges.paint?.['line-width'], placedLine.paint?.['line-width']);
  assert.deepEqual(edges.paint?.['line-dasharray'], placedLine.paint?.['line-dasharray'], 'preview segments match placed segment length and spacing');
  const edgeCasing = h.layers.get(drawingPreviewLayerIds.edgesCasing);
  assert.ok(edgeCasing?.type === 'line');
  assert.equal(edgeCasing.paint?.['line-color'], 'rgb(255, 255, 255)');
  assert.equal(edgeCasing.paint?.['line-width'], 3, 'casing keeps the foreground segment length');
  assert.equal(edgeCasing.paint?.['line-offset'], -1, 'white extends only perpendicular to the path');
  assert.deepEqual(edgeCasing.layout, edges.layout);
  assert.deepEqual(edgeCasing.paint?.['line-dasharray'], edges.paint?.['line-dasharray'], 'segment positions and lengths stay aligned');
  const placedWidth = placedLine.paint?.['line-width'];
  const placedCasingWidth = placedCasing.paint?.['line-width'];
  assert.ok(typeof placedWidth === 'number' && typeof placedCasingWidth === 'number');
  assert.equal(Math.abs(Number(edgeCasing.paint?.['line-offset'])), (placedCasingWidth - placedWidth) / 2, 'preview outline matches placed outline thickness');
  const edgeCasingRight = h.layers.get(drawingPreviewLayerIds.edgesCasingRight);
  assert.ok(edgeCasingRight?.type === 'line');
  assert.deepEqual(edgeCasingRight.layout, edgeCasing.layout);
  assert.deepEqual(edgeCasingRight.paint, { ...edgeCasing.paint, 'line-offset': 1 });
  assert.equal(connector.paint?.['line-width'], 2);
  assert.equal(connector.paint?.['line-color'], 'rgb(0, 0, 0)');
  assert.equal(connector.paint?.['line-dasharray'], undefined);
  assert.equal(casing.paint?.['line-width'], 4);
  assert.deepEqual(connector.filter, ['in', 'kind', 'connector', 'movement']);
  assert.deepEqual(casing.filter, connector.filter);
  const candidate = h.layers.get(drawingPreviewLayerIds.candidate);
  assert.ok(candidate?.type === 'circle');
  assert.equal(candidate.paint?.['circle-pitch-scale'], 'viewport');
  h.sources.clear(); h.layers.clear(); h.map.ready = false;
  h.map.fire('style.load');
  h.map.scale = 200;
  h.map.fire('move');
  assert.equal(h.sources.size, 0, 'movement remains buffered during style replacement');
  h.map.ready = true; h.map.fire('styledata');
  assert.equal(h.preview.features.length, 5);
  assert.deepEqual(h.preview, drawingPreviewFeatures(draft, { candidate: [3, 3], targetIndex: 0, editing: true }, h.arrow));
  h.display.showPreview({ candidate: null, targetIndex: null, editing: false });
  assert.deepEqual(h.preview.features, []);
  assert.equal(h.data.features.length, 3, 'preview clearing preserves committed geometry');
  h.display.show(null);
  assert.deepEqual(h.data.features, []);
  h.display.destroy();
  assert.equal(h.callbacks.get('render')?.size, 0);
  assert.equal(h.callbacks.get('styledata')?.size, 0);
  assert.equal(h.callbacks.get('move')?.size, 0);
  assert.equal(h.callbacks.get('resize')?.size, 0);
});

for (const [name, scale, bearing, pitchScale] of [
  ['normal', 100, 0, 1], ['zoomed', 400, 0, 1], ['rotated', 100, Math.PI / 3, 1],
  ['pitched and rotated', 200, -Math.PI / 4, 0.4],
] as const) {
  test(`${name}: movement arrow points from the locked origin to the candidate with a 10 px head`, (t) => {
    const h = setup(t);
    Object.assign(h.map, { scale, bearing, pitchScale });
    const draft = { type: 'Point', vertices: [[1, 1]] } as const;
    const features = drawingPreviewFeatures(draft, { candidate: [3, 2], targetIndex: 0, editing: true }, h.arrow).features;
    const movement = features.filter(f => f.properties.kind === 'movement');
    assert.equal(movement.length, 2, 'one shaft and one arrowhead replace the connector');
    assert.equal(features.some(f => f.properties.kind === 'connector'), false);
    const project = (coordinate: number[]) => h.map.project([coordinate[0], coordinate[1]]);
    assert.ok(movement[0].geometry.type === 'LineString' && movement[1].geometry.type === 'LineString');
    const [origin, tip] = movement[0].geometry.coordinates.map(project);
    const [left, headTip, right] = movement[1].geometry.coordinates.map(project);
    const candidate = h.map.project([3, 2]);
    const near = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);
    near(Math.hypot(candidate.x - tip.x, candidate.y - tip.y), 8);
    near(Math.hypot(left.x - right.x, left.y - right.y), 10);
    near(Math.hypot(tip.x - (left.x + right.x) / 2, tip.y - (left.y + right.y) / 2), 10);
    near(headTip.x, tip.x); near(headTip.y, tip.y);
    const dx = candidate.x - origin.x, dy = candidate.y - origin.y;
    near((tip.x - origin.x) * dy - (tip.y - origin.y) * dx, 0);
    assert.ok((tip.x - origin.x) * dx + (tip.y - origin.y) * dy > 0, 'shaft points toward the candidate');
    near(origin.x, h.map.project([1, 1]).x); near(origin.y, h.map.project([1, 1]).y);
  });
}

test('short moves shrink the head; coincident and overlapping markers hide the arrow but retain the ring', (t) => {
  const h = setup(t);
  const draft = { type: 'Point', vertices: [[0, 0]] } as const;
  for (const distance of [0, 4, 8, 12]) {
    const features = drawingPreviewFeatures(draft, { candidate: [distance / 100, 0], targetIndex: 0, editing: true }, h.arrow).features;
    assert.equal(features.filter(f => f.properties.kind === 'target').length, 1);
    assert.equal(features.some(f => f.properties.kind === 'connector'), false);
    const movement = features.filter(f => f.properties.kind === 'movement');
    assert.equal(movement.length, distance <= 8 ? 0 : 2);
    if (distance === 12) {
      assert.ok(movement[1].geometry.type === 'LineString');
      const [left, tip, right] = movement[1].geometry.coordinates;
      assert.deepEqual(h.map.project([tip[0], tip[1]]), { x: 4, y: 0 });
      assert.equal(Math.abs(left[1] - right[1]) * 100, 4, 'head shrinks to available shaft length');
    }
  }
});

test('camera and resize refresh screen geometry even with an unchanged geographic candidate; teardown stops writes', (t) => {
  const h = setup(t);
  h.map.load();
  const draft = { type: 'LineString', vertices: [[0, 0], [2, 2]] } as const;
  const preview = { candidate: [1, 1], targetIndex: 0, editing: true } as const;
  h.display.show(draft); h.display.showPreview(preview);
  const committed = structuredClone(h.data);
  for (const change of [
    { scale: 200 }, { bearing: Math.PI / 2 }, { pitchScale: 0.4 }, { offset: [90, 80] },
  ]) {
    Object.assign(h.map, change);
    const writes = h.writes;
    h.map.fire('move');
    assert.equal(h.writes, writes + 1, 'only the preview source needs refreshing');
    assert.deepEqual(h.preview, drawingPreviewFeatures(draft, preview, h.arrow));
    assert.deepEqual(h.data, committed);
  }
  const writes = h.writes;
  h.map.fire('resize');
  assert.equal(h.writes, writes + 1);
  h.display.showPreview({ ...preview, editing: false });
  const placementWrites = h.writes;
  h.map.fire('move'); h.map.fire('resize'); h.map.fire('render');
  assert.equal(h.writes, placementWrites, 'geographic placement connectors need no camera redraw');
  h.display.showPreview(preview);
  h.display.destroy();
  const finalWrites = h.writes;
  h.map.fire('move'); h.map.fire('resize'); h.map.fire('render');
  assert.equal(h.writes, finalWrites);
});
