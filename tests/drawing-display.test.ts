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
    'var(--color-radial-point)': 'rgb(228, 171, 47)',
    'var(--color-radial-line)': 'rgb(134, 112, 214)',
    'var(--color-radial-polygon)': 'rgb(35, 170, 158)',
    'var(--color-surface)': 'rgb(255, 255, 255)',
  };
  const document = {
    createElement: () => ({ style: { color: '' }, remove: () => { probes--; } }),
    defaultView: { getComputedStyle: (element: { style: { color: string } }) => ({ color: tokenColors[element.style.color] }) },
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
  return { map, display, layers, sources, callbacks, removals,
    get data() { return sources.get(drawingSourceId)!.data; }, get probes() { return probes; } };
}

test('buffers the latest geometry before loading, resolves CSS tokens, and adds layers once', (t) => {
  const h = setup(t);
  h.display.show({ type: 'LineString', vertices: [[5, 60]] });
  h.display.show({ type: 'LineString', vertices: [[5, 60], [5.1, 60.1]] });
  assert.equal(h.sources.size, 0);
  h.map.load();
  assert.equal(h.sources.size, 1);
  assert.equal(h.layers.size, 3);
  assert.equal(h.probes, 0, 'temporary token resolver was removed');
  assert.deepEqual(h.data.features.map((feature) => feature.geometry.type), ['Point', 'Point', 'LineString']);
  assert.equal(h.data.features[0].properties?.color, 'rgb(134, 112, 214)');
  const line = [...h.layers.values()].find((layer) => layer.type === 'line');
  assert.deepEqual(line?.paint?.['line-dasharray'], [2, 2]);
  const fill = [...h.layers.values()].find((layer) => layer.type === 'fill');
  assert.equal(fill?.paint?.['fill-opacity'], 0.2);
  h.map.fire('style.load');
  assert.equal(h.layers.size, 3);
});

test('shows only placed vertices; polygon closing edge and fill appear starting at three corners', (t) => {
  const h = setup(t);
  h.map.load();
  h.display.show({ type: 'Point', vertices: [[5, 60]] });
  assert.equal(h.data.features.length, 1);
  assert.equal(h.data.features[0].properties?.color, 'rgb(228, 171, 47)');
  h.display.show({ type: 'Polygon', vertices: [[5, 60], [6, 60]] });
  assert.deepEqual(h.data.features.map((feature) => feature.geometry.type), ['Point', 'Point', 'LineString']);
  assert.deepEqual(h.data.features[2].geometry, { type: 'LineString', coordinates: [[5, 60], [6, 60]] });
  h.display.show({ type: 'Polygon', vertices: [[5, 60], [6, 60], [6, 61]] });
  assert.equal(h.data.features.filter((feature) => feature.geometry.type === 'Point').length, 3);
  assert.deepEqual(h.data.features[3].geometry, { type: 'Polygon', coordinates: [[[5, 60], [6, 60], [6, 61], [5, 60]]] });
  assert.deepEqual(h.data.features[4].geometry, { type: 'LineString', coordinates: [[5, 60], [6, 60], [6, 61], [5, 60]] });
  assert.equal(h.data.features[0].properties?.color, 'rgb(35, 170, 158)');
  h.display.show({ type: 'Polygon', vertices: [[5, 60], [6, 60]] });
  assert.equal(h.data.features.length, 3, 'Undo removes the fill and closing edge');
});

test('style replacement restores retained geographic geometry; Delete clears data, including before load', (t) => {
  const h = setup(t);
  h.display.show({ type: 'Point', vertices: [[5, 60]] });
  h.display.show(null);
  h.map.load();
  assert.deepEqual(h.data.features, []);
  h.display.show({ type: 'LineString', vertices: [[5, 60], [6, 61]] });
  const expected = h.data;
  h.sources.clear();
  h.layers.clear();
  h.map.load();
  assert.deepEqual(h.data, expected);
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
  assert.equal(h.removals.length, 4);
  assert.equal(h.callbacks.get('style.load')?.size, 0);
  h.display.show({ type: 'Point', vertices: [[6, 61]] });
  h.map.load();
  assert.equal(h.sources.size, 0);
});
