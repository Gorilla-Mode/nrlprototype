import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Component } from 'svelte';
import { render } from 'svelte/server';
import type { Report } from '../src/lib/reports/reportsData.js';
import { canonicalReportsHash, reportEditIdFromHash, reportViewIdFromHash, reportViewRoute } from '../src/lib/reports/reports.js';
import { ObstacleType } from '../src/lib/reporting/obstacle.js';
import { reports } from './helpers/reportFixtures.js';
import { locationLine, mapViewerText, reportDetailTitle } from '../src/lib/reports/reportDetail.js';
import { compileSvelteComponent } from './helpers/svelte-server.js';
import { reportDetailSpecifiers } from './helpers/reportDetail.js';

test('a Ready report has its own URL, apart from the list and the edit page', () => {
  assert.equal(reportViewRoute('map-1'), '#/reports/map-1');
  assert.equal(reportViewIdFromHash('#/reports/map-1'), 'map-1');
  assert.equal(reportViewIdFromHash(reportViewRoute('a b')), 'a b');
  for (const hash of ['#/reports', '#/reports/map-1/edit', '#/Report/details', '']) assert.equal(reportViewIdFromHash(hash), null);
  assert.equal(reportEditIdFromHash('#/reports/map-1'), null);
  assert.equal(canonicalReportsHash('#/Reports/map-1'), '#/reports/map-1');
});

const pageUrl = await compileSvelteComponent('src/lib/reports/ReportViewPage.svelte', await reportDetailSpecifiers());
const { default: Page } = await import(pageUrl) as { default: Component<{ report: Report; onback: () => void; onedit: () => void; onsent: () => void }> };
const noop = () => {};
const base: Report = {
  ...reports.find((report) => report.status === 'ready')!,
  name: '', obstacleType: ObstacleType.Bridge, heightMeters: 7, heightFeet: 23, lighting: 'unknown',
  pilotReportText: '', photos: [], geometry: { type: 'Point', coordinates: [5.3221, 60.3913] },
  reportedByName: 'Paul Atreides', reportedByOrg: 'Politihelikoptertjenesten',
};
const sandviken = { name: 'Sandviken, Bergen', at: [5.3221, 60.3913] as [number, number] };
const page = (report: Report) => render(Page, { props: { report, onback: noop, onedit: noop, onsent: noop } }).body.replace(/<!--[^>]*-->/g, '');

test('Ready to send: titled by its place, the meta line, and the reported obstacle as a table', () => {
  const html = page({ ...base, place: sandviken });
  assert.match(html, /aria-label="Back to Reports"/);
  assert.match(html, /<section class="page report-detail[^"]*">/);
  assert.match(html, /<h1 class="page-header-title[^"]*"[^>]*>New obstacle · Sandviken, Bergen<\/h1>/);
  assert.match(html, /<\/header>[\s\S]*class="safe-area[\s\S]*?<p class="report-meta[^"]*">\s*Reported by Paul Atreides, Politihelikoptertjenesten\s*· Last edited <time datetime="[^"]+">[^<]+<\/time>/);
  assert.match(html, /<h2 class="report-detail-card-heading[^"]*" id="view-obstacle-heading">Reported obstacle<\/h2>\s*<table class="reported-table/);
  assert.match(html, /<th scope="col" class="reported-field[^"]*">Field<\/th><th scope="col"[^>]*>Reported<\/th>/);
  assert.doesNotMatch(html, /In NRL today|class="fields-row|<dl|<input|<select|<textarea|Created/);
  const rows = [...html.matchAll(/<th scope="row"[^>]*>([^<]+)<\/th>\s*<td class="reported[^"]*"><strong[^>]*>([^<]+)<\/strong>(?:<span class="reported-note[^"]*">([^<]+)<\/span>)?/g)]
    .map((match) => [match[1], match[2], match[3] ?? '']);
  assert.deepEqual(rows, [
    ['Type', 'Bridge', ''], ['Height', '7 m (23 ft)', 'Above ground, at the highest point'], ['Lighting', 'Unknown', ''],
    ['Position', '60.3913° N, 5.3221° E', 'Near Sandviken, Bergen'],
  ]);
});

test('without a looked-up place the title and position use the coordinates, as the list does', () => {
  const html = page(base);
  assert.match(html, /<h1[^>]*>New obstacle · 60\.3913° N, 5\.3221° E<\/h1>/);
  assert.doesNotMatch(html, /Near /);
});

test('description and photo: one muted line when both are missing, the text when there is one', () => {
  const empty = page(base);
  assert.match(empty, /<h2 class="report-detail-card-heading[^"]*" id="view-description-heading">Description and photo<\/h2>/);
  assert.match(empty, /class="muted empty[^"]*">No description or photo added<\/p>/);
  const withText = page({ ...base, pilotReportText: 'Seen from the air' });
  assert.match(withText, /<p class="description[^"]*">Seen from the air<\/p>/);
  assert.doesNotMatch(withText, /No description or photo added/);
});

test('Location: no Edit location or Show on map; changed only through Edit report; the aside on wide screens', () => {
  const html = page(base);
  assert.match(html, /<section class="report-detail-card report-detail-aside[^"]*" aria-labelledby="detail-location-heading">\s*<h2[^>]*>Location<\/h2>/);
  assert.doesNotMatch(html, /Edit location|Show on map/);
  // Order in the column: table, description, then location.
  assert.match(html, /class="report-detail-content[\s\S]*Reported obstacle[\s\S]*Description and photo[\s\S]*>Location<\/h2>/);
});

test('bottom bar: Edit report on the left; the note beside a blue Send for Review on the right', () => {
  const html = page(base);
  assert.match(html, /data-variant="secondary"[^>]*>Edit report<\/button>[\s\S]*class="send-group[\s\S]*Goes straight to the NRL reviewer[\s\S]*You cannot edit the report after sending[\s\S]*data-variant="primary" data-color="brand1"[^>]*aria-describedby="view-send-note"/);
});

test('the location line and the read-only map viewer: place, report type, obstacle and coordinates', () => {
  const report = { ...base, place: sandviken };
  assert.equal(locationLine(report), 'Near Sandviken, Bergen · 60.3913° N, 5.3221° E');
  assert.equal(locationLine(base), '60.3913° N, 5.3221° E');
  // A place looked up for an earlier location is not used.
  assert.equal(locationLine({ ...report, geometry: { type: 'Point', coordinates: [6, 61] } }), '61.0000° N, 6.0000° E');
  assert.deepEqual(mapViewerText(report), {
    title: 'Sandviken, Bergen',
    subtitle: 'New obstacle · Bridge · 7 m · 60.3913° N, 5.3221° E',
    note: 'View only. To move the point, close the map and choose Edit report.',
  });
  const obstacle = { id: 'DSB-201', name: 'Sandviken', type: 'Building' as const, heightM: 10, lit: true, lat: 60.3913, lng: 5.3221 };
  const error = { ...report, errorReport: { obstacle, answers: { errorKinds: [], actualHeightM: null, correctedPosition: null, description: '' } } };
  assert.equal(mapViewerText(error).subtitle, 'Error report · Building · 10 m · 60.3913° N, 5.3221° E');
  assert.equal(reportDetailTitle(error), 'Error report · Sandviken');
  assert.equal(reportDetailTitle({ ...base, geometry: null }), 'New obstacle · Bridge · 7\u00a0m');
});
