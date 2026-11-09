import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Component } from 'svelte';
import { render } from 'svelte/server';
import type { Draft } from '../src/lib/drafts/types.js';
import { matchesGeometryFilter } from '../src/lib/reports/filtering.js';
import { geometryKind } from '../src/lib/reports/reportGeometry.js';
import { reportEditIdFromHash, reportEditRoute } from '../src/lib/reports/reports.js';
import { ObstacleType, obstacleGeometryChoices } from '../src/lib/reporting/obstacle.js';
import { drafts } from './helpers/reportFixtures.js';
import { compileSvelteComponent } from './helpers/svelte-server.js';
import { compileStatusBadge } from './helpers/statusBadge.js';

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
  '../reports/StatusBadge.svelte': await compileStatusBadge(),
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
  assert.deepEqual(labels, [['draft-type', 'Obstacle type'], ['draft-height', 'Height above ground'], ['draft-lighting', 'Lighting']]);
  assert.doesNotMatch(html, />PHOTO<|ACTIVITY|DESCRIPTION AND REPORTER/);
  assert.match(html, /<h2 class="section-heading[^"]*" id="description-heading">Description and photo \(optional\)<\/h2>[\s\S]*id="pilot-report"[\s\S]*class="photo-row[\s\S]*class="location-panel[\s\S]*<h2 class="section-heading[^"]*" id="location-heading">Location<\/h2>/);
  assert.doesNotMatch(html, /DESCRIPTION AND PHOTO|>LOCATION</);
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
  assert.match(html, /<\/header>[\s\S]*class="safe-area[\s\S]*?<p class="report-meta[^"]*">\s*Reported by Ada Lovelace, Luftambulansen\s*· Last edited <time datetime="[^"]+">/);
  assert.doesNotMatch(html, /Created/);
  assert.doesNotMatch(html, /class="reporter-row/);
});

test('no repeated subtitle or geometry caption; the geometry word leads the location coordinates', () => {
  const html = page(base);
  assert.doesNotMatch(html, /class="subtitle|geometry<\/div>/);
  // The caption is the shared report map's own (tests/mini-map.test.ts).
  assert.doesNotMatch(html, /class="map-caption/);
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

test('no type: "Select type" is chosen, cannot be picked again, is marked missing, and the title is muted', () => {
  const html = page({ ...base, title: '', category: null });
  assert.match(html, /<option value="" disabled(="")? hidden(="")? selected[^>]*>Select type<\/option>/);
  assert.match(html, /<select class="dropdown[^"]*\binvalid\b[^"]*\bunset\b[^"]*"[^>]*id="draft-type"[^>]*aria-describedby="draft-type-error"[^>]*aria-invalid="true"/);
  assert.match(html, /id="draft-type-error"[^>]*>[\s\S]*Required to send/);
  assert.match(html, /<h1 class="page-header-title[^"]*\bmuted\b[^"]*"[^>]*>Untitled obstacle<\/h1>/);
  assert.match(html, /2 fields still needed/);
  const other = page({ ...base, title: '', category: ObstacleType.Other });
  assert.match(other, /<option value="other"[^>]*selected/);
  assert.doesNotMatch(other, /draft-type-error|class="page-header-title[^"]*muted/);
  // With a type and no name, the title says it is a new obstacle.
  assert.match(page({ ...base, title: '', category: ObstacleType.Bridge, heightAboveGround: '7 m (23 ft)' }), /<h1 class="page-header-title[^"]*"[^>]*>New obstacle · Bridge · 7\u00a0m<\/h1>/);
});

test('the summary names each missing field as a link, without referring to colour', () => {
  const html = page({ ...base, title: '', category: null, heightAboveGround: 'Not set' });
  const text = html.replace(/<!--[^>]*-->/g, '');
  assert.match(text, /2 fields still needed before you can send:\s*<a class="needed-link[^"]*" href="#draft-type"[^>]*>Obstacle type<\/a>, <a class="needed-link[^"]*" href="#draft-height"[^>]*>Height above ground<\/a>/);
  assert.doesNotMatch(html, /marked in red|Fill in the fields/);
});

test('Send stays focusable: aria-disabled with a note naming what is missing, then active with the usual note', () => {
  const missing = page({ ...base, title: '', category: null, heightAboveGround: 'Not set' });
  const send = missing.match(/<button class="ds-button send-button[^>]*>/)?.[0] ?? '';
  assert.match(send, /aria-describedby="send-note"/);
  assert.match(send, /aria-disabled="true"/);
  assert.doesNotMatch(send, /\sdisabled/);
  assert.match(missing, /id="send-note"[\s\S]*Add obstacle type and height above ground to send/);
  assert.doesNotMatch(missing, /Goes straight to the NRL reviewer/);
  const ready = page({ ...base, heightAboveGround: '30 m (98 ft)' });
  assert.doesNotMatch(ready.match(/<button class="ds-button send-button[^>]*>/)?.[0] ?? '', /aria-disabled/);
  assert.match(ready, /Goes straight to the NRL reviewer[\s\S]*You cannot edit the report after sending/);
});
