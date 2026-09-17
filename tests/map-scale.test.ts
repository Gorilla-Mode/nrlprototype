import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LngLat, type Map as MapLibreMap } from 'maplibre-gl';
import { MetricScaleControl, selectMetricScale } from '../src/lib/map/MetricScaleControl.js';

test('metric scale uses 1/2/5 steps, keeps 1000 m, and supports sub-metre scales', () => {
  const cases: Array<[number, number, string]> = [
    [0.09, 0.05, '0.05 m'], [0.9, 0.5, '0.5 m'], [1, 1, '1 m'],
    [2, 2, '2 m'], [5, 5, '5 m'], [10, 10, '10 m'], [20, 20, '20 m'],
    [50, 50, '50 m'], [100, 100, '100 m'], [200, 200, '200 m'],
    [499, 200, '200 m'], [500, 500, '500 m'], [999, 500, '500 m'],
    [1000, 1000, '1000 m'], [1999, 1000, '1000 m'],
    [2000, 2000, '2 km'], [5000, 5000, '5 km'], [10000, 10000, '10 km'],
    [20000, 20000, '20 km'], [50000, 50000, '50 km'],
    [100000, 100000, '100 km'], [200000, 200000, '200 km'],
    [500000, 500000, '500 km'], [1000000, 1000000, '1000 km'],
  ];
  for (const [availableMeters, meters, label] of cases) {
    const result = selectMetricScale(availableMeters, 120);
    assert.ok(result, `${availableMeters} has a scale`);
    assert.equal(result.meters, meters);
    assert.equal(result.label, label);
    assert.ok(Math.abs(result.width - 120 * meters / availableMeters) < 1e-9);
  }
});

test('unavailable distance or viewport never yields a misleading scale', () => {
  for (const invalid of [0, -1, NaN, Infinity]) {
    assert.equal(selectMetricScale(invalid, 120), null);
    assert.equal(selectMetricScale(100, invalid), null);
  }
});

class FakeElement {
  className = '';
  textContent = '';
  hidden = false;
  removed = false;
  children: FakeElement[] = [];
  properties = new Map<string, string>();
  style = { setProperty: (name: string, value: string) => this.properties.set(name, value) };
  append(...children: FakeElement[]) { this.children.push(...children); }
  setAttribute() {}
  remove() { this.removed = true; }
}

function setup() {
  const events = new EventTarget();
  const container = {
    clientWidth: 800, clientHeight: 600,
    ownerDocument: { createElement: () => new FakeElement() },
  };
  const map = {
    latitude: 0,
    degreesPerPixel: 0.001,
    globeHalfWidth: Infinity,
    getContainer: () => container,
    unproject([x]: [number, number]) {
      const offset = Math.max(-this.globeHalfWidth, Math.min(this.globeHalfWidth, x - container.clientWidth / 2));
      return new LngLat(offset * this.degreesPerPixel, this.latitude);
    },
    project(point: LngLat) {
      return { x: container.clientWidth / 2 + point.lng / this.degreesPerPixel, y: container.clientHeight / 2 };
    },
    on: events.addEventListener.bind(events),
    off: events.removeEventListener.bind(events),
  };
  const control = new MetricScaleControl({ maxWidth: 120 });
  const element = control.onAdd(map as unknown as MapLibreMap) as unknown as FakeElement;
  const label = () => element.children[0]?.textContent;
  const width = () => parseFloat(element.properties.get('--map-scale-width') ?? 'NaN');
  const fire = (event: string) => events.dispatchEvent(new Event(event));
  return { control, map, container, element, label, width, fire };
}

test('scale follows measured geography, camera latitude, resize and projection changes', () => {
  const h = setup();
  assert.equal(h.label(), '10 km');
  assert.ok(h.width() > 89 && h.width() < 91);
  h.map.latitude = 60;
  h.fire('move');
  assert.equal(h.label(), '5 km');
  h.map.degreesPerPixel = 0.0001;
  h.fire('move');
  assert.equal(h.label(), '500 m');
  h.container.clientWidth = 60;
  h.fire('resize');
  assert.equal(h.label(), '200 m');
  assert.ok(h.width() < 60);
  h.map.globeHalfWidth = 10;
  h.fire('projectiontransition');
  assert.equal(h.label(), '100 m');
  assert.ok(h.width() > 17 && h.width() < 19);
  h.control.onRemove();
});

test('scale hides for zero-size viewports, recovers and stops listening after removal', () => {
  const h = setup();
  h.container.clientWidth = 0;
  h.fire('resize');
  assert.equal(h.element.hidden, true);
  h.container.clientWidth = 800;
  h.fire('resize');
  assert.equal(h.element.hidden, false);
  assert.equal(h.label(), '10 km');
  h.control.onRemove();
  assert.equal(h.element.removed, true);
  h.map.unproject = () => { throw new Error('removed scale still samples map'); };
  for (const event of ['move', 'resize', 'projectiontransition']) h.fire(event);
  h.control.onRemove();
});

