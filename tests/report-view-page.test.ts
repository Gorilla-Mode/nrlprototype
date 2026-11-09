import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Component } from 'svelte';
import { render } from 'svelte/server';
import type { Report } from '../src/lib/reports/reportsData.js';
import { canonicalReportsHash, reportEditIdFromHash, reportViewIdFromHash, reportViewRoute } from '../src/lib/reports/reports.js';
import { ObstacleType } from '../src/lib/reporting/obstacle.js';
import { reports } from './helpers/reportFixtures.js';
import { compileSvelteComponent } from './helpers/svelte-server.js';
import { compileStatusBadge } from './helpers/statusBadge.js';

test('a Ready report has its own URL, apart from the list and the edit page', () => {
  assert.equal(reportViewRoute('map-1'), '#/reports/map-1');
  assert.equal(reportViewIdFromHash('#/reports/map-1'), 'map-1');
  assert.equal(reportViewIdFromHash(reportViewRoute('a b')), 'a b');
  for (const hash of ['#/reports', '#/reports/map-1/edit', '#/Report/details', '']) assert.equal(reportViewIdFromHash(hash), null);
  assert.equal(reportEditIdFromHash('#/reports/map-1'), null);
  assert.equal(canonicalReportsHash('#/Reports/map-1'), '#/reports/map-1');
});

const stub = (name: string) => `data:text/javascript,export default function ${name}() {}`;
const pageUrl = await compileSvelteComponent('src/lib/reports/ReportViewPage.svelte', {
  '../components/PageHeader.svelte': await compileSvelteComponent('src/lib/components/PageHeader.svelte'),
  './StatusBadge.svelte': await compileStatusBadge(),
  '../map/MiniMap.svelte': stub('MiniMap'),
  '../map/LocationEditor.svelte': stub('LocationEditor'),
  './PhotoField.svelte': stub('PhotoField'),
  '../drafts/types': new URL('../src/lib/drafts/types.js', import.meta.url).href,
  '../reporting/obstacle': new URL('../src/lib/reporting/obstacle.js', import.meta.url).href,
  './reportGeometry': new URL('../src/lib/reports/reportGeometry.js', import.meta.url).href,
  './reportsData': new URL('../src/lib/reports/reportsData.js', import.meta.url).href,
  './reportStore': new URL('../src/lib/reports/reportStore.js', import.meta.url).href,  '../obstacles/errorReport': new URL('../src/lib/obstacles/errorReport.js', import.meta.url).href,
  '../obstacles/position': new URL('../src/lib/obstacles/position.js', import.meta.url).href,
  './errorReportRecords': new URL('../src/lib/reports/errorReportRecords.js', import.meta.url).href,
  './photos': new URL('../src/lib/reports/photos.js', import.meta.url).href,
});
const { default: Page } = await import(pageUrl) as { default: Component<{ report: Report; onback: () => void; onedit: () => void; onsent: () => void; onshowonmap?: () => void }> };
const noop = () => {};
const base: Report = {
  ...reports.find((report) => report.status === 'ready')!,
  name: '', obstacleType: ObstacleType.Bridge, heightMeters: 7, heightFeet: 23, lighting: 'unknown',
  pilotReportText: '', photos: [], geometry: { type: 'Point', coordinates: [5.3221, 60.3913] },
  reportedByName: 'Paul Atreides', reportedByOrg: 'Politihelikoptertjenesten',
};
const page = (report: Report) => render(Page, { props: { report, onback: noop, onedit: noop, onsent: noop } }).body;

test('the edit page layout, read-only: header meta line, three labelled values, no Activity box', () => {
  const html = page(base);
  assert.match(html, /aria-label="Back to Reports"/);
  assert.match(html, /<h1 class="page-header-title[^"]*"[^>]*>New obstacle · Bridge · 7\u00a0m<\/h1>/);
  // The header holds only the back arrow, title and tag; the metadata line opens the content, without Created.
  assert.match(html, /<\/header>[\s\S]*class="safe-area[\s\S]*?<p class="report-meta[^"]*">\s*Reported by Paul Atreides, Politihelikoptertjenesten\s*· Last edited <time datetime="[^"]+">[^<]+<\/time>/);
  assert.doesNotMatch(html, /Created/);
  const pairs = [...html.matchAll(/<dt class="input-label[^"]*">([^<]+)<\/dt>\s*<dd class="field-value[^"]*">([^<]+)<\/dd>/g)].map((match) => [match[1], match[2]]);
  assert.deepEqual(pairs, [['Obstacle type', 'Bridge'], ['Height above ground', '7 m (23 ft)'], ['Lighting', 'Unknown']]);
  assert.match(html, /<dd class="field-help[^"]*">Above ground, at the highest point<\/dd>/);
  assert.equal([...html.matchAll(/field-help/g)].length, 1);
  assert.doesNotMatch(html, /ACTIVITY|Point geometry|Marking on the obstacle|>PHOTO<|DESCRIPTION AND REPORTER|<input|<select|<textarea/);
});

test('description and photo: one muted line when both are missing, the text when there is one', () => {
  const empty = page(base);
  assert.match(empty, /<h2 class="section-heading[^"]*" id="view-description-heading">Description and photo<\/h2>/);
  assert.match(empty, /class="muted empty[^"]*">No description or photo added<\/p>/);
  assert.doesNotMatch(empty, /Reported by<\/span>|What the pilot reported/);
  const withText = page({ ...base, pilotReportText: 'Seen from the air' });
  assert.match(withText, /<p class="description[^"]*">Seen from the air<\/p>/);
  assert.doesNotMatch(withText, /No description or photo added/);
});

test('Edit location is back beside the Location heading, with Show on map next to it when the main map can open', () => {
  const html = page(base).replace(/<!--[^>]*-->/g, '');
  assert.match(html, /id="view-location-heading">Location<\/h2>\s*<div class="location-actions[^"]*">\s*<button type="button" class="card-cta-link location-action[^"]*">Edit location<\/button>/);
  assert.doesNotMatch(html, /Show on map|vertex|vertices|class="map-caption/);
  const withMap = render(Page, { props: { report: base, onback: noop, onedit: noop, onsent: noop, onshowonmap: noop } }).body.replace(/<!--[^>]*-->/g, '');
  assert.match(withMap, /class="location-actions[^"]*">\s*<button[^>]*>Show on map<\/button>\s*<button[^>]*>Edit location<\/button>/);
});

test('bottom bar: Edit report on the left; the note beside a blue Send for Review on the right', () => {
  const html = page(base);
  assert.match(html, /data-variant="secondary"[^>]*>Edit report<\/button>[\s\S]*class="send-group[\s\S]*Goes straight to the NRL reviewer[\s\S]*You cannot edit the report after sending[\s\S]*data-variant="primary" data-color="brand1"[^>]*aria-describedby="view-send-note"/);
});
