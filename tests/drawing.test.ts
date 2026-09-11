import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createDrawingController, formatMeasurement, type DrawingState } from '../src/lib/reporting/createDrawingController.js';
import type { GeographicVertex, ObstacleGeometry, ObstacleGeometryType } from '../src/lib/reporting/obstacle.js';

function setup() {
  const changes: DrawingState[] = [];
  const completed: ObstacleGeometry[] = [];
  const drawing = createDrawingController({ onChange: (state) => changes.push(state), onComplete: (geometry) => completed.push(geometry) });
  return { drawing, changes, completed, state: drawing.getState };
}

test('Point completes immediately and emits geometry without fabricated metadata', () => {
  const h = setup();
  assert.equal(h.state().status, 'idle');
  h.drawing.start('Point', [5.34, 60.4]);
  assert.equal(h.state().status, 'completed');
  assert.deepEqual(h.state().draft?.vertices, [[5.34, 60.4]]);
  assert.deepEqual(h.completed, [{ type: 'Point', coordinates: [5.34, 60.4] }]);
  h.drawing.append([6, 61]);
  h.drawing.undo();
  h.drawing.complete();
  h.drawing.start('Polygon', [7, 62]);
  assert.equal(h.completed.length, 1);
  assert.equal(h.state().draft?.type, 'Point');
  assert.equal(h.state().draft?.vertices.length, 1);
});

test('line thresholds, known metre distances, measurement updates, and Undo to the initial vertex', () => {
  const h = setup();
  h.drawing.start('LineString', [0, 0]);
  assert.equal(h.state().measurement?.value, 0);
  assert.equal(h.state().canComplete, false);
  h.drawing.complete();
  h.drawing.append([0, 0]);
  assert.equal(h.state().canComplete, false, 'two coincident vertices cannot complete');
  h.drawing.undo();
  h.drawing.append([0.001, 0]);
  const firstLength = h.state().measurement!.value;
  assert.ok(Math.abs(firstLength - 111.195) < 0.01);
  assert.equal(h.state().measurement?.unit, 'm');
  assert.equal(h.state().canComplete, true);
  h.drawing.append([0.002, 0]);
  assert.ok(Math.abs(h.state().measurement!.value - firstLength * 2) < 0.001);
  h.drawing.undo();
  assert.equal(h.state().measurement?.value, firstLength);
  h.drawing.undo();
  h.drawing.undo();
  assert.deepEqual(h.state().draft?.vertices, [[0, 0]]);
  assert.equal(h.state().measurement?.value, 0);
  assert.equal(h.state().canComplete, false);
  assert.deepEqual(h.completed, []);
});

test('line completion emits ordered coordinates and becomes immutable until Delete', () => {
  const h = setup();
  h.drawing.start('LineString', [5, 60]);
  h.drawing.start('Point', [6, 61]);
  h.drawing.append([5.001, 60]);
  h.drawing.complete();
  const before = h.state();
  h.drawing.append([5.002, 60]);
  h.drawing.undo();
  h.drawing.complete();
  assert.equal(h.state(), before);
  assert.deepEqual(h.completed, [{ type: 'LineString', coordinates: [[5, 60], [5.001, 60]] }]);
  assert.equal(h.state().status, 'completed');
  assert.equal(h.state().canComplete, false);
  h.drawing.delete();
  assert.equal(h.state().status, 'idle');
  assert.equal(h.state().draft, null);
  assert.equal(h.state().measurement, null);
  h.drawing.start('Point', [6, 61]);
  assert.equal(h.completed.length, 2);
});

test('polygon completion closes only GeoJSON, with known square metres and updated area after Undo', () => {
  const h = setup();
  h.drawing.start('Polygon', [0, 0]);
  h.drawing.append([0.001, 0]);
  h.drawing.complete();
  assert.equal(h.state().canComplete, false);
  assert.equal(h.state().measurement, null);
  h.drawing.append([0.001, 0.001]);
  const triangleArea = h.state().measurement!.value;
  assert.ok(Math.abs(triangleArea - 6182.17) < 0.1);
  assert.equal(h.state().measurement?.unit, 'm²');
  h.drawing.append([0, 0.001]);
  assert.ok(Math.abs(h.state().measurement!.value - triangleArea * 2) < 0.01);
  h.drawing.undo();
  assert.equal(h.state().measurement?.value, triangleArea);
  h.drawing.complete();
  assert.deepEqual(h.completed, [{ type: 'Polygon', coordinates: [[[0, 0], [0.001, 0], [0.001, 0.001], [0, 0]]] }]);
  assert.equal(h.state().draft?.vertices.length, 3);
  h.drawing.append([0, 0.001]);
  assert.equal(h.state().draft?.vertices.length, 3);
});

for (const [name, vertices, message] of [
  ['bow tie', [[0, 0], [2, 2], [0, 2], [2, 0]], /cross/],
  ['crossing closing edge with nonzero signed area', [[0, 0], [4, 0], [0, 3], [3, 3]], /cross/],
  ['repeated first vertex', [[0, 0], [2, 0], [2, 2], [0, 0]], /repeat/],
  ['repeated intermediate vertex', [[0, 0], [2, 0], [2, 2], [2, 0]], /repeat/],
  ['overlapping adjacent edges', [[0, 0], [3, 0], [1, 0], [1, 2]], /overlap/],
  ['vertex touching another edge', [[0, 0], [3, 0], [3, 3], [1, 0], [0, 3]], /cross|overlap/],
  ['collinear vertices', [[0, 0], [1, 0], [2, 0]], /area|overlap/],
] as const) {
  test(`invalid polygon stays editable without an area: ${name}`, () => {
    const h = setup();
    h.drawing.start('Polygon', vertices[0]);
    for (const vertex of vertices.slice(1)) h.drawing.append(vertex);
    assert.equal(h.state().canComplete, false);
    assert.equal(h.state().measurement, null);
    assert.match(h.state().message, message);
    h.drawing.complete();
    assert.equal(h.state().status, 'drawing');
    assert.equal(h.completed.length, 0);
    const count = h.state().draft!.vertices.length;
    h.drawing.undo();
    assert.equal(h.state().draft?.vertices.length, count - 1);
  });
}

test('Undo repairs a crossed polygon and restores area and completion', () => {
  const h = setup();
  h.drawing.start('Polygon', [0, 0]);
  h.drawing.append([2, 2]);
  h.drawing.append([0, 2]);
  const before = h.state();
  h.drawing.append([2, 0]);
  assert.equal(h.state().measurement, null);
  h.drawing.undo();
  assert.deepEqual(h.state(), before);
});

test('concave polygons and forward collinear boundary vertices remain valid in both winding orders', () => {
  const vertices: GeographicVertex[] = [[0, 0], [1, 0], [2, 0], [2, 2], [1, 1], [0, 2]];
  for (const ring of [vertices, vertices.toReversed()]) {
    const h = setup();
    h.drawing.start('Polygon', ring[0]);
    for (const vertex of ring.slice(1)) h.drawing.append(vertex);
    assert.equal(h.state().canComplete, true);
    assert.ok(h.state().measurement!.value > 0);
  }
});

for (const type of ['Point', 'LineString', 'Polygon'] satisfies ObstacleGeometryType[]) {
  test(`Delete clears ${type} and permits a new object`, () => {
    const h = setup();
    h.drawing.start(type, [5, 60]);
    h.drawing.delete();
    h.drawing.delete();
    assert.equal(h.state().status, 'idle');
    h.drawing.start('LineString', [6, 61]);
    assert.deepEqual(h.state().draft, { type: 'LineString', vertices: [[6, 61]] });
  });
}

test('input and result coordinates are copied; invalid coordinates do not change state', () => {
  const h = setup();
  h.drawing.start('Point', [NaN, 0]);
  assert.equal(h.state().status, 'idle');
  const first: [number, number] = [5, 60];
  h.drawing.start('LineString', first);
  first[0] = 10;
  h.drawing.append([Infinity, 0]);
  h.drawing.append([0, 91]);
  assert.deepEqual(h.state().draft?.vertices, [[5, 60]]);
  h.drawing.append([6, 61]);
  h.drawing.complete();
  const result = h.completed[0];
  assert.equal(result.type, 'LineString');
  if (result.type === 'LineString') result.coordinates[0][0] = 20;
  assert.equal(h.state().draft?.vertices[0][0], 5);
});

test('measurements are approximate metres or square metres with up to one decimal place', () => {
  assert.equal(formatMeasurement(null), '');
  assert.equal(formatMeasurement({ value: 1234.567, unit: 'm' }), '≈ 1,234.6 m');
  assert.equal(formatMeasurement({ value: 100, unit: 'm²' }), '≈ 100 m²');
});
