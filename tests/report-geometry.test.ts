import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { LineString, Point } from 'geojson';
import { createPreviewStyle, createRasterStyle, PREVIEW_GEOMETRY_SOURCE_ID, PREVIEW_MAX_ZOOM } from '../src/lib/map/mapConfig.js';
import { previewCamera } from '../src/lib/map/previewMap.js';
import { matchesGeometryFilter } from '../src/lib/reports/filtering.js';
import { coordinateLabel, geometryBounds, geometryCameraTarget, geometryKind, locationCaption, vertexCount } from '../src/lib/reports/reportGeometry.js';
import { reports } from '../src/lib/reports/reportsData.js';
import { ObstacleType } from '../src/lib/reporting/obstacle.js';
import { drafts } from '../src/lib/drafts/mockData.js';

const point: Point = { type: 'Point', coordinates: [8.785, 61.045] };
const line: LineString = { type: 'LineString', coordinates: [[5.3221, 60.3913], [5.3405, 60.3982]] };

test('geometry kind and vertex count come from the stored geometry, not the obstacle category', () => {
  assert.equal(geometryKind(point), 'Point');
  assert.equal(geometryKind(line), 'Line');
  assert.equal(geometryKind(null), null);
  assert.equal(vertexCount(point), 1);
  assert.equal(vertexCount(line), 2);
  assert.equal(vertexCount(null), 0);

  const pointSpan = { ...reports.find((report) => report.obstacleType === ObstacleType.Airspan)!, geometry: point };
  assert.equal(geometryKind(pointSpan.geometry), 'Point');
});

test('location caption starts at the first vertex and falls back when no position is set', () => {
  assert.equal(locationCaption(point), '61.0450° N, 8.7850° E · 1 vertex');
  assert.equal(locationCaption(line), '60.3913° N, 5.3221° E · 2 vertices');
  assert.equal(locationCaption(null), 'Location not set');
});

test('bounds enclose every vertex and the main-map camera frames the geometry', () => {
  assert.deepEqual(geometryBounds(line), [[5.3221, 60.3913], [5.3405, 60.3982]]);
  assert.deepEqual(geometryBounds(point), [[8.785, 61.045], [8.785, 61.045]]);

  assert.deepEqual(geometryCameraTarget(point), { lng: 8.785, lat: 61.045, zoom: 15 });
  const camera = geometryCameraTarget(line);
  assert.ok(Math.abs(camera.lng - 5.3313) < 1e-9 && Math.abs(camera.lat - 60.39475) < 1e-9);
  assert.ok(camera.zoom > 11 && camera.zoom < 15, `zoom ${camera.zoom} should show a ~1 km line whole`);

  const long: LineString = { type: 'LineString', coordinates: [[0, 60], [40, 70]] };
  assert.equal(geometryCameraTarget(long).zoom, 4);
});

test('geometry filter keeps items without a position only while no geometry is selected', () => {
  assert.equal(matchesGeometryFilter(null, new Set()), true);
  assert.equal(matchesGeometryFilter(null, new Set(['Point'])), false);
  assert.equal(matchesGeometryFilter('Line', new Set(['Line'])), true);
  assert.equal(matchesGeometryFilter('Point', new Set(['Line'])), false);
});

test('mock data covers a point, a line and a draft without position', () => {
  const all = [...reports.map((report) => report.geometry), ...drafts.map((draft) => draft.geometry)];
  assert.ok(all.some((geometry) => geometry?.type === 'Point'));
  assert.ok(all.some((geometry) => geometry?.type === 'LineString'));
  assert.ok(drafts.some((draft) => draft.geometry === null));
  for (const report of reports) assert.notEqual(report.geometry, null, `${report.name} needs a position`);
});

test('the preview uses the main map Kartverket tiles and draws only the matching geometry layer', () => {
  const visuals = { point: 'rgb(1, 2, 3)', line: 'rgb(4, 5, 6)', casing: 'rgb(255, 255, 255)', lineWidth: 3, casingThickness: 1, radius: 6, strokeWidth: 2 };
  const style = createPreviewStyle(line, visuals);
  assert.deepEqual(style.sources.n100, createRasterStyle().sources.n100);
  assert.deepEqual(Object.keys(style.sources).sort(), ['n100', PREVIEW_GEOMETRY_SOURCE_ID].sort());
  assert.equal(style.layers[0].type, 'raster');

  const byId = Object.fromEntries(style.layers.map((layer) => [layer.id, layer]));
  const lineLayer = byId['preview-line'];
  const casing = byId['preview-line-casing'];
  const pointLayer = byId['preview-point'];
  assert.ok(lineLayer.type === 'line' && casing.type === 'line' && pointLayer.type === 'circle');
  assert.equal(lineLayer.paint?.['line-color'], visuals.line);
  assert.equal(casing.paint?.['line-width'], 5);
  assert.equal(pointLayer.paint?.['circle-color'], visuals.point);
  assert.deepEqual(lineLayer.filter, ['==', ['geometry-type'], 'LineString']);
  assert.deepEqual(pointLayer.filter, ['==', ['geometry-type'], 'Point']);
});

test('mini map and enlarged map share one initial camera: fixed zoom for a point, fitted bounds for a line', () => {
  assert.deepEqual(previewCamera(point, 400, 160), { center: [8.785, 61.045], zoom: PREVIEW_MAX_ZOOM });
  assert.deepEqual(previewCamera(line, 400, 160), {
    bounds: [[5.3221, 60.3913], [5.3405, 60.3982]],
    fitBoundsOptions: { padding: 32, maxZoom: PREVIEW_MAX_ZOOM },
  });
  const large = previewCamera(line, 1024, 700);
  assert.ok('fitBoundsOptions' in large && large.fitBoundsOptions.padding === 140);
});

test('coordinates alone, for the sent-report summary, or null without a location', () => {
  assert.equal(coordinateLabel(line), '60.3913° N, 5.3221° E');
  assert.equal(coordinateLabel(point), '61.0450° N, 8.7850° E');
  assert.equal(coordinateLabel(null), null);
});
