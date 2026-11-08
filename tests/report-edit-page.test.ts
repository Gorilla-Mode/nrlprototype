import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Component } from 'svelte';
import { render } from 'svelte/server';
import type { Draft } from '../src/lib/drafts/types.js';
import { matchesGeometryFilter } from '../src/lib/reports/filtering.js';
import { geometryKind } from '../src/lib/reports/reportGeometry.js';
import { reportEditIdFromHash, reportEditRoute } from '../src/lib/reports/reports.js';
import { obstacleGeometryChoices } from '../src/lib/reporting/obstacle.js';
import { drafts } from './helpers/reportFixtures.js';
import { compileSvelteComponent } from './helpers/svelte-server.js';

test('the edit page has its own URL, and only edit URLs give an id', () => {
  assert.equal(reportEditRoute('map-1'), '#/reports/map-1/edit');
  assert.equal(reportEditIdFromHash('#/reports/map-1/edit'), 'map-1');
  assert.equal(reportEditIdFromHash(reportEditRoute('a b/c')), 'a b/c');
  for (const hash of ['#/Reports', '#/reports/map-1', '#/reports//edit', '#/Report/details', '']) assert.equal(reportEditIdFromHash(hash), null);
});

test('the Polygon filter uses the drawing tool name and matches polygons only', () => {
  assert.equal(obstacleGeometryChoices.find(({ type }) => type === 'Polygon')?.label, 'Polygon');
  const polygon = geometryKind({ type: 'Polygon', coordinates: [[[5, 60], [5.1, 60], [5.1, 60.1], [5, 60]]] });
  const point = geometryKind({ type: 'Point', coordinates: [5, 60] });
  assert.equal(matchesGeometryFilter(polygon, new Set(['Polygon'])), true);
  assert.equal(matchesGeometryFilter(point, new Set(['Polygon'])), false);
  assert.equal(matchesGeometryFilter(polygon, new Set(['Point', 'Line'])), false);
});

const stub = (name: string) => `data:text/javascript,export default function ${name}() {}`;
const pageUrl = await compileSvelteComponent('src/lib/drafts/DraftDetailPage.svelte', {
  './types': new URL('../src/lib/drafts/types.js', import.meta.url).href,
  '../map/MiniMap.svelte': stub('MiniMap'),
  '../map/LocationEditor.svelte': stub('LocationEditor'),
  '../reports/PhotoField.svelte': stub('PhotoField'),
  '../components/PageHeader.svelte': await compileSvelteComponent('src/lib/components/PageHeader.svelte'),
  '../reports/StatusBadge.svelte': await compileSvelteComponent('src/lib/reports/StatusBadge.svelte'),
  '../reports/Dropdown.svelte': await compileSvelteComponent('src/lib/reports/Dropdown.svelte'),
  '../reporting/obstacle': new URL('../src/lib/reporting/obstacle.js', import.meta.url).href,
  '../reports/reportGeometry': new URL('../src/lib/reports/reportGeometry.js', import.meta.url).href,
  '../reports/reportStore': new URL('../src/lib/reports/reportStore.js', import.meta.url).href,
  '../reports/reportsData': new URL('../src/lib/reports/reportsData.js', import.meta.url).href,
});
type PageProps = { draft: Draft; status?: 'draft' | 'ready'; onBack: () => void; onDone: () => void; onSend: () => void; ondirtychange: () => void };
const { default: Page } = await import(pageUrl) as { default: Component<PageProps> };
const noop = () => {};
const page = (draft: Draft) => render(Page, { props: { draft, onBack: noop, onDone: noop, onSend: noop, ondirtychange: noop } }).body;
const base: Draft = { ...drafts[0], geometry: { type: 'Point', coordinates: [5.3221, 60.3913] } };

test('three cards on top, description and photo, then location; no Activity box', () => {
  const html = page(base);
  const labels = [...html.matchAll(/<label class="input-label[^"]*"[^>]*for="(draft-[a-z]+)"[^>]*>([^<]+)</g)].map((match) => [match[1], match[2]]);
  assert.deepEqual(labels, [['draft-type', 'Type'], ['draft-height', 'Height above ground'], ['draft-lighting', 'Lighting']]);
  assert.doesNotMatch(html, />PHOTO<|ACTIVITY|DESCRIPTION AND REPORTER/);
  assert.match(html, /DESCRIPTION AND PHOTO \(OPTIONAL\)[\s\S]*id="pilot-report"[\s\S]*class="photo-row[\s\S]*class="location-panel/);
});

test('lighting is a labelled list with the same stored values and new labels', () => {
  const html = page({ ...base, lighting: 'no' });
  assert.match(html, /<label[^>]*id="draft-lighting-label"[^>]*for="draft-lighting"[^>]*>Lighting<\/label>/);
  assert.match(html, /<select[^>]*id="draft-lighting"[^>]*aria-labelledby="draft-lighting-label"[^>]*aria-describedby="draft-lighting-help"/);
  const options = [...html.matchAll(/<option value="(yes|no|unknown)"([^>]*)>([^<]+)<\/option>/g)];
  assert.deepEqual(options.map((match) => [match[1], match[3]]), [['yes', 'Yes, lit'], ['no', 'No, not lit'], ['unknown', 'Unknown']]);
  assert.match(options[1][2], /selected/);
  assert.match(html, /id="draft-lighting-help"[^>]*>Is the obstacle lit\?</);
  assert.match(page({ ...base, lighting: null }), /<option value="" disabled(="")? hidden(="")? selected[^>]*>Not set<\/option>/);
});

test('reporter and dates sit under the title, from the report, with times', () => {
  const html = page({ ...base, reportedByName: 'Ada Lovelace', reportedByOrg: 'Luftambulansen' });
  assert.match(html, /<h1[\s\S]*class="report-meta[^"]*">\s*Reported by Ada Lovelace · Luftambulansen\s*· Created <time datetime="[^"]+">[^<]+<\/time>\s*· Last edited <time datetime="[^"]+">/);
  assert.doesNotMatch(html, /class="reporter-row/);
});

test('no repeated subtitle or geometry caption; the geometry word leads the location coordinates', () => {
  const html = page(base);
  assert.doesNotMatch(html, /class="subtitle|geometry<\/div>/);
  assert.match(html, /class="map-caption[^"]*">Point · 60\.3913° N, 5\.3221° E<\/div>/);
});

test('Send is blue with its note beside it in one right-aligned group', () => {
  const html = page({ ...base, heightAboveGround: '30 m (98 ft)' });
  assert.match(html, /class="send-group[\s\S]*Goes straight to the NRL reviewer[\s\S]*You cannot edit the report after sending[\s\S]*data-variant="primary" data-color="brand1"[^>]*>\s*<span class="paper-plane[^"]*">➤<\/span> Send for Review/);
});

test('a missing height is marked on the field, explained under it, and invalid', () => {
  const html = page({ ...base, heightAboveGround: 'Not set' });
  assert.match(html, /class="height-input-wrap[^"]*invalid/);
  assert.match(html, /<input id="draft-height"[^>]*aria-invalid="true"[^>]*aria-describedby="draft-height-help draft-height-error"/);
  assert.match(html, /<p class="field-error[^"]*" id="draft-height-error">[\s\S]*Required to send/);
  assert.doesNotMatch(html, /field-box[^"]*missing/);
  const set = page({ ...base, heightAboveGround: '30 m (98 ft)' });
  assert.doesNotMatch(set, /aria-invalid|Required to send|height-input-wrap[^"]*invalid/);
});

test('the lists draw their own arrow beside a native select', () => {
  const html = page(base);
  assert.equal([...html.matchAll(/<select class="dropdown[^"]*"[\s\S]*?<\/select>\s*<svg class="dropdown-chevron[^"]*"[^>]*aria-hidden="true"/g)].length, 2);
});
