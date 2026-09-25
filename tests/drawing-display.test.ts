import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import type { FeatureCollection } from 'geojson';
import type { GeoJSONSourceSpecification, LayerSpecification, Map as MapLibreMap } from 'maplibre-gl';
import { createDrawingDisplay, drawingSourceId } from '../src/lib/map/createDrawingDisplay.js';

function setup(t: TestContext) {
  const layers = new Map<string, LayerSpecification>();
  const sources = new Map<string, { data: FeatureCollection; setData: (data: FeatureCollection) => void }>();
  const callbacks = new Map<string, Set<() => void>>();
  const removals: string[] = [];
  let probes = 0;
  const tokenColors: Record<string, string> = {
    'var(--color-drawing-point)': 'rgb(215, 40, 0)',
    'var(--color-drawing-outline)': 'rgb(23, 23, 23)',
    'var(--color-drawing-casing)': 'rgb(255, 255, 255)',
  };
  let themeChanged = () => {};
  const media = new EventTarget();
  const dimensions: Record<string, string> = {
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
    getCanvas: () => ({ ownerDocument: document }),
    getContainer: () => ({ append: () => { probes++; } }),
    isStyleLoaded() { return this.ready; },
    getSource: (id: string) => sources.get(id),
    addSource(id: string, spec: GeoJSONSourceSpecification) {
      assert.equal(sources.has(id), false);
      sources.set(id, { data: spec.data as FeatureCollection, setData(data) { this.data = data; } });
    },
    removeSource(id: string) { assert.equal(layers.size, 0); removals.push(id); sources.delete(id); },
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
  const display = createDrawingDisplay(map as unknown as MapLibreMap);
  t.after(() => display.destroy());
  return { map, display, layers, sources, callbacks, removals, tokenColors, media, themeChanged: () => themeChanged(),
    get data() { return sources.get(drawingSourceId)!.data; }, get probes() { return probes; } };
}

test('buffers the latest geometry before loading, resolves CSS tokens, and adds layers once', (t) => {
  const h = setup(t);
  h.display.show({ type: 'LineString', vertices: [[5, 60]] });
  h.display.show({ type: 'LineString', vertices: [[5, 60], [5.1, 60.1]] });
  assert.equal(h.sources.size, 0);
  h.map.load();
  assert.equal(h.sources.size, 1);
  assert.equal(h.layers.size, 4);
  assert.equal(h.probes, 0, 'temporary token resolver was removed');
  assert.deepEqual(h.data.features.map((feature) => feature.geometry.type), ['Point', 'Point', 'LineString']);
  assert.equal(h.data.features[0].properties?.vertexColor, 'rgb(215, 40, 0)');
  const orderedLayers = [...h.layers.values()];
  assert.deepEqual(orderedLayers.map(({ id }) => id), [
    'obstacle-drawing-fill',
    'obstacle-drawing-line-casing',
    'obstacle-drawing-line',
    'obstacle-drawing-vertices',
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
  assert.equal(h.layers.size, 4);
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
    'obstacle-drawing-vertices',
    'obstacle-drawing-line',
    'obstacle-drawing-line-casing',
    'obstacle-drawing-fill',
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
  h.tokenColors['var(--color-drawing-point)'] = 'rgb(230, 50, 20)';
  h.themeChanged();
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
