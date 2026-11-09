import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Component } from 'svelte';
import { render } from 'svelte/server';
import type { ReportGeometry } from '../src/lib/reports/reportGeometry.js';
import { REPORT_MAP_ZOOM, reportMapCamera } from '../src/lib/map/previewMap.js';
import { createReportMapStyle, type PreviewVisuals } from '../src/lib/map/mapConfig.js';
import { compileSvelteComponent } from './helpers/svelte-server.js';

const stub = (body: string) => `data:text/javascript,${encodeURIComponent(body)}`;
const url = await compileSvelteComponent('src/lib/map/MiniMap.svelte', {
  'maplibre-gl': stub('export class Map {}'),
  './MapLightbox.svelte': stub('export default function MapLightbox() {}'),
  './mapConfig': new URL('../src/lib/map/mapConfig.js', import.meta.url).href,
  './previewMap': new URL('../src/lib/map/previewMap.js', import.meta.url).href,
  '../reports/reportGeometry': new URL('../src/lib/reports/reportGeometry.js', import.meta.url).href,
  '../reporting/obstacle': new URL('../src/lib/reporting/obstacle.js', import.meta.url).href,
});
const { default: MiniMap } = await import(url) as { default: Component<{ geometry: ReportGeometry | null; label: string; registered?: { lat: number; lng: number } | null; caption?: string; viewer?: { title: string; subtitle: string; note: string }; onedit?: () => void }> };
const point: ReportGeometry = { type: 'Point', coordinates: [5.3455, 60.4053] };
const map = (props: { geometry: ReportGeometry | null; registered?: { lat: number; lng: number } | null }) => render(MiniMap, { props: { label: 'Mast', ...props } }).body;

test('every report page gets the same caption under the map: geometry word and coordinates, no vertex count', () => {
  assert.match(map({ geometry: point }), /class="mini-map-caption[^"]*">Point · 60\.4053° N, 5\.3455° E<\/p>/);
  const line: ReportGeometry = { type: 'LineString', coordinates: [[5.3, 60.39], [5.31, 60.4]] };
  assert.match(map({ geometry: line }), /class="mini-map-caption[^"]*">Line · /);
  assert.doesNotMatch(map({ geometry: line }), /vertex|vertices/);
  assert.doesNotMatch(map({ geometry: point }), /Show on map|mini-map-legend/);
});

test('a moved error report shows a legend with both symbols, by shape as well as colour', () => {
  const html = map({ geometry: point, registered: { lat: 60.405, lng: 5.344 } });
  assert.match(html, /class="mini-map-legend[^"]*">\s*<span class="mini-map-symbol registered[^"]*" aria-hidden="true"><\/span>Registered position[\s\S]*<span class="mini-map-symbol reported[^"]*" aria-hidden="true"><\/span>Reported position/);
});

test('the camera keeps the earlier preview zoom on a point, and fits two positions never closer than it', () => {
  assert.equal(REPORT_MAP_ZOOM, 15);
  assert.deepEqual(reportMapCamera(point, 800, 450), { center: [5.3455, 60.4053], zoom: REPORT_MAP_ZOOM });
  const both = reportMapCamera(point, 800, 450, [5.344, 60.405]);
  assert.ok('bounds' in both);
  assert.deepEqual(both.bounds, [[5.344, 60.405], [5.3455, 60.4053]]);
  assert.equal(both.fitBoundsOptions.padding, 90);
  assert.equal(both.fitBoundsOptions.maxZoom, REPORT_MAP_ZOOM);
});

test('the registered position is a hollow ring with a white halo under the filled reported point', () => {
  const visuals: PreviewVisuals = { point: 'orange', line: 'blue', area: 'green', casing: 'white', fillOpacity: 0.2, dashLength: 2, lineWidth: 3, casingThickness: 1, radius: 10, strokeWidth: 3 };
  const style = createReportMapStyle(point, visuals, [5.344, 60.405]);
  const ids = style.layers.map((layer) => layer.id);
  assert.ok(ids.indexOf('report-map-registered') < ids.indexOf('preview-point'));
  const ring = style.layers.find((layer) => layer.id === 'report-map-registered');
  assert.equal(ring && 'paint' in ring ? (ring.paint as Record<string, unknown>)['circle-color'] : null, 'transparent');
  const reported = style.layers.find((layer) => layer.id === 'preview-point');
  assert.equal(reported && 'paint' in reported ? (reported.paint as Record<string, unknown>)['circle-radius'] : null, 10);
  assert.deepEqual(createReportMapStyle(point, visuals).layers.map((layer) => layer.id).filter((id) => id.startsWith('report-map')), []);
});

test('a page can give its own caption; others keep the standard caption', () => {
  const html = render(MiniMap, { props: { geometry: point, label: 'Mast', caption: 'Moved 280 m northeast of the registered position · 60.4053° N, 5.3455° E' } }).body;
  assert.match(html, /class="mini-map-caption[^"]*">Moved 280 m northeast of the registered position · 60\.4053° N, 5\.3455° E<\/p>/);
  assert.match(map({ geometry: point }), /class="mini-map-caption[^"]*">Point · /);
});

test('the report detail page adds an Enlarge button to the corner; edit pages and others do not', () => {
  const viewer = { title: 'Sandviken', subtitle: 'New obstacle · Mast · 30 m · 60.4053° N, 5.3455° E', note: 'View only.' };
  const html = render(MiniMap, { props: { geometry: point, label: 'Mast', viewer } }).body;
  assert.match(html, /<button type="button" class="mini-map-corner[^"]*" aria-haspopup="dialog"><svg[^>]*aria-hidden="true"[\s\S]*?<\/svg>\s*Enlarge<\/button>/);
  assert.match(html, /aria-label="Enlarge map of Mast"/);
  assert.doesNotMatch(map({ geometry: point }), /mini-map-corner/);
  assert.doesNotMatch(render(MiniMap, { props: { geometry: point, label: 'Mast', viewer, onedit: () => {} } }).body, /mini-map-corner/);
});
