import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';
import { LngLat } from 'maplibre-gl';

const source = await readFile(new URL('../src/lib/map/createGeolocationDisplay.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
const code = compiled.outputText.replace("'maplibre-gl'", JSON.stringify(new URL('./helpers/maplibre-markers.mjs', import.meta.url).href));
const { createGeolocationDisplay } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);

function setup(t) {
  const elements = [];
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', { configurable: true, value: {
    createElement() {
      const element = { style: {}, setAttribute() {} };
      elements.push(element);
      return element;
    },
  } });
  t.after(() => {
    if (descriptor) Object.defineProperty(globalThis, 'document', descriptor);
    else delete globalThis.document;
  });
  const listeners = new Map();
  let userMoves = 0;
  let stops = 0;
  const fits = [];
  const map = {
    markers: new Set(),
    longitudePerPixel: 0.00001,
    on(event, callback) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event).add(callback);
    },
    off(event, callback) { listeners.get(event).delete(callback); },
    fire(event, data = {}) { for (const callback of listeners.get(event) ?? []) callback(data); },
    project(center) { return { x: center.lng / this.longitudePerPixel, y: center.lat }; },
    unproject([x, y]) { return new LngLat(x * this.longitudePerPixel, y); },
    getBearing() { return 30; },
    fitBounds(bounds, options, eventData) {
      fits.push({ bounds, options });
      this.fire('movestart', eventData);
    },
    stop() { stops++; this.fire('moveend'); },
  };
  const display = createGeolocationDisplay(map, () => userMoves++);
  t.after(() => display.destroy());
  return {
    map, display, listeners, elements, fits,
    get circle() { return elements.find((e) => e.className.includes('accuracy-circle')); },
    get userMoves() { return userMoves; },
    get stops() { return stops; },
  };
}

const fix = { coords: { longitude: 5.34, latitude: 60.4, accuracy: 20 } };

test('dot and accuracy circle follow coordinates and scale with zoom and accuracy', (t) => {
  const h = setup(t);
  h.display.show(fix);
  assert.equal(h.map.markers.size, 2);
  for (const marker of h.map.markers) {
    assert.deepEqual(marker.getLngLat().toArray(), [5.34, 60.4]);
  }
  const diameter = parseFloat(h.circle.style.width);
  assert.ok(diameter > 0);
  h.map.longitudePerPixel /= 2;
  h.map.fire('zoom');
  assert.ok(Math.abs(parseFloat(h.circle.style.width) - diameter * 2) < 0.02);
  h.display.show({ coords: { ...fix.coords, accuracy: 40 } });
  assert.ok(Math.abs(parseFloat(h.circle.style.width) - diameter * 4) < 0.04);
  assert.equal(h.circle.style.width, h.circle.style.height);
  assert.equal(h.map.markers.size, 2, 'updates do not accumulate markers');
});

test('recenter uses accuracy bounds, preserves bearing, and caps zoom at 16', (t) => {
  const h = setup(t);
  h.display.recenter(fix);
  const { bounds, options } = h.fits[0];
  assert.equal(options.maxZoom, 16);
  assert.equal(options.bearing, 30);
  assert.ok(bounds.contains([5.34, 60.4]));
  assert.ok(bounds.getWest() < 5.34 && bounds.getEast() > 5.34);
  assert.equal(h.userMoves, 0, 'recenter does not release following');
  h.display.clear();
  assert.equal(h.stops, 1, 'cancellation stops a location camera animation');
});

test('user movement releases following but automatic movement and resize do not', (t) => {
  const h = setup(t);
  h.map.fire('movestart');
  h.map.fire('resize');
  assert.equal(h.userMoves, 0);
  h.map.fire('movestart', { originalEvent: { type: 'keydown' } });
  assert.equal(h.userMoves, 1);
  h.display.clear();
  assert.equal(h.stops, 0, 'clearing location must not cancel the user camera movement');
});

test('clear removes overlays; destroy also removes every map listener and ignores new fixes', (t) => {
  const h = setup(t);
  h.display.show(fix);
  h.display.clear();
  assert.equal(h.map.markers.size, 0);
  const previousWidth = h.circle.style.width;
  h.map.longitudePerPixel /= 2;
  h.map.fire('zoom');
  assert.equal(h.circle.style.width, previousWidth, 'no accuracy work after stopping');
  h.display.show(fix);
  assert.equal(h.map.markers.size, 2);
  h.display.destroy();
  h.display.destroy();
  assert.equal(h.map.markers.size, 0);
  for (const callbacks of h.listeners.values()) assert.equal(callbacks.size, 0);
  h.display.show(fix);
  h.display.recenter(fix);
  h.map.fire('movestart', { originalEvent: { type: 'mousedown' } });
  assert.equal(h.map.markers.size, 0);
  assert.equal(h.fits.length, 0);
  assert.equal(h.userMoves, 0);
});
