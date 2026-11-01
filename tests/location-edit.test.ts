import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { LineString, Point, Polygon } from 'geojson';
import {
  applyCoordinate, convertVertices, isInNorway, locationGeometry, locationPreview, locationVertices,
  missingVerticesMessage, needsPointConfirmation, parseCoordinate, type Vertex,
} from '../src/lib/reports/locationEdit.js';
import { createLocationEditorStyle, LOCATION_CONNECTOR_SOURCE_ID, LOCATION_EDIT_SOURCE_ID, LOCATION_REGISTERED_SOURCE_ID } from '../src/lib/map/mapConfig.js';
import { geometryKind, locationCaption, positions } from '../src/lib/reports/reportGeometry.js';

const point: Point = { type: 'Point', coordinates: [5.3446, 60.4022] };
const line: LineString = { type: 'LineString', coordinates: [[5, 60], [6, 61], [7, 60]] };
const polygon: Polygon = { type: 'Polygon', coordinates: [[[5, 60], [6, 61], [7, 60], [5, 60]]] };

test('a polygon is stored closed but edited, counted and described by its distinct points', () => {
  assert.deepEqual(locationVertices(polygon), [[5, 60], [6, 61], [7, 60]]);
  assert.equal(positions(polygon).length, 3);
  assert.equal(geometryKind(polygon), 'Polygon');
  assert.equal(locationCaption(polygon), '60.0000° N, 5.0000° E · 3 vertices');
  assert.deepEqual(locationGeometry('Polygon', locationVertices(polygon)), polygon);
});

test('Point → Line or Polygon keeps the point first; Line ↔ Polygon keeps every point', () => {
  const pointVertices = locationVertices(point);
  assert.deepEqual(locationGeometry('LineString', [...convertVertices(pointVertices, 'LineString'), [5.4, 60.5]]),
    { type: 'LineString', coordinates: [[5.3446, 60.4022], [5.4, 60.5]] });
  assert.deepEqual(locationGeometry('LineString', convertVertices(locationVertices(polygon), 'LineString')),
    { type: 'LineString', coordinates: [[5, 60], [6, 61], [7, 60]] });
  assert.deepEqual(locationGeometry('Polygon', convertVertices(locationVertices(line), 'Polygon')), polygon);
});

test('changing to a point asks first, then keeps only the first point', () => {
  assert.equal(needsPointConfirmation('Point', 3), true);
  assert.equal(needsPointConfirmation('Point', 1), false);
  assert.equal(needsPointConfirmation('LineString', 3), false);
  assert.deepEqual(convertVertices(locationVertices(line), 'Point'), [[5, 60]]);
});

test('a location can only be used with enough points, and says what is missing', () => {
  const one: Vertex[] = [[5, 60]];
  assert.equal(locationGeometry('LineString', one), null);
  assert.equal(locationGeometry('Polygon', [...one, [6, 61]]), null);
  assert.match(missingVerticesMessage('LineString', 1)!, /Add 1 more point .*at least 2 points/);
  assert.match(missingVerticesMessage('Polygon', 1)!, /Add 2 more points .*at least 3 points/);
  assert.equal(missingVerticesMessage('Polygon', 3), null);
  assert.equal(missingVerticesMessage('Point', 1), null);
  // An unfinished polygon is drawn as its line so far.
  assert.deepEqual(locationPreview('Polygon', [...one, [6, 61]]), { type: 'LineString', coordinates: [[5, 60], [6, 61]] });
  assert.equal(locationPreview('Point', one), null, 'a point is the pin, not a map feature');
});

test('coordinates accept a comma or a dot and must be numbers inside Norway', () => {
  assert.equal(parseCoordinate('60,4022'), 60.4022);
  assert.equal(parseCoordinate(' 60.4022 '), 60.4022);
  for (const text of ['', '60,40,22', 'abc', '60.', '1e3']) assert.equal(parseCoordinate(text), null, text);
  const start: Vertex = [5.3, 60.3];
  assert.deepEqual(applyCoordinate(start, 'lat', '60,4022'), { vertex: [5.3, 60.4022] });
  assert.deepEqual(applyCoordinate(start, 'lng', '5,3446'), { vertex: [5.3446, 60.3] });
  assert.deepEqual(applyCoordinate(start, 'lat', 'sixty'), { error: 'Enter a latitude, e.g. 60.4022.' });
  assert.deepEqual(applyCoordinate(start, 'lat', '48.85'), { error: 'This position is outside Norway.' });
  assert.equal(isInNorway([15.6, 78.2]), true, 'Svalbard');
  assert.equal(isInNorway([-8.5, 71]), true, 'Jan Mayen');
  assert.equal(isInNorway([2.35, 48.85]), false);
});

test('the editor draws the registered location faintly, under the connector and the edited location', () => {
  const visuals = { point: 'red', line: 'blue', area: 'teal', casing: 'white', fillOpacity: 0.35, dashLength: 2, lineWidth: 3, casingThickness: 1, radius: 6, strokeWidth: 2 };
  const style = createLocationEditorStyle(point, visuals);
  assert.deepEqual(Object.keys(style.sources).sort(), ['n100', LOCATION_REGISTERED_SOURCE_ID, LOCATION_CONNECTOR_SOURCE_ID, LOCATION_EDIT_SOURCE_ID].sort());
  const ids = style.layers.map((layer) => layer.id);
  assert.ok(ids.indexOf('location-registered-point') < ids.indexOf('location-connector'));
  assert.ok(ids.indexOf('location-connector') < ids.indexOf('location-edit-line'));
  const registered = style.layers.find((layer) => layer.id === 'location-registered-point');
  assert.ok(registered?.type === 'circle' && registered.paint?.['circle-opacity'] === visuals.fillOpacity);
  const connector = style.layers.find((layer) => layer.id === 'location-connector');
  assert.ok(connector?.type === 'line' && Array.isArray(connector.paint?.['line-dasharray']));
});
