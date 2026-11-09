import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Component } from 'svelte';
import { render } from 'svelte/server';
import type { ErrorReportRecord } from '../src/lib/obstacles/errorReport.js';
import { describeMoveFromRegistered } from '../src/lib/obstacles/position.js';
import type { Report } from '../src/lib/reports/reportsData.js';
import { errorReportToReport } from '../src/lib/reports/errorReportRecords.js';
import { compileSvelteComponent } from './helpers/svelte-server.js';
import { compileStatusBadge } from './helpers/statusBadge.js';

const stub = (name: string) => `data:text/javascript,export default function ${name}() {}`;
const url = await compileSvelteComponent('src/lib/reports/ReportViewPage.svelte', {
  '../components/PageHeader.svelte': await compileSvelteComponent('src/lib/components/PageHeader.svelte'),
  './StatusBadge.svelte': await compileStatusBadge(),
  '../map/MiniMap.svelte': stub('MiniMap'),
  '../map/LocationEditor.svelte': stub('LocationEditor'),
  './PhotoField.svelte': stub('PhotoField'),
  '../drafts/types': new URL('../src/lib/drafts/types.js', import.meta.url).href,
  '../reporting/obstacle': new URL('../src/lib/reporting/obstacle.js', import.meta.url).href,
  '../obstacles/errorReport': new URL('../src/lib/obstacles/errorReport.js', import.meta.url).href,
  '../obstacles/position': new URL('../src/lib/obstacles/position.js', import.meta.url).href,
  './reportGeometry': new URL('../src/lib/reports/reportGeometry.js', import.meta.url).href,
  './reportsData': new URL('../src/lib/reports/reportsData.js', import.meta.url).href,
  './reportStore': new URL('../src/lib/reports/reportStore.js', import.meta.url).href,
  './errorReportRecords': new URL('../src/lib/reports/errorReportRecords.js', import.meta.url).href,
  './photos': new URL('../src/lib/reports/photos.js', import.meta.url).href,
});
type Props = { report: Report; record: ErrorReportRecord; onback: () => void; onedit: () => void; onsent: () => void; onshowonmap?: () => void };
const { default: Page } = await import(url) as { default: Component<Props> };
const noop = () => {};
const obstacle = { id: 'DSB-201', name: 'Sandviken', type: 'Building' as const, heightM: 10, lit: true, lat: 60.4054, lng: 5.3235 };
const moved: ErrorReportRecord = { obstacle, answers: { errorKinds: ['wrong-position'], actualHeightM: null, correctedPosition: { lat: 60.4077, lng: 5.3279 }, description: '' } };
const page = (record: ErrorReportRecord, extra: Partial<Props> = {}) => {
  const report = errorReportToReport('e1', record);
  return render(Page, { props: { report, record, onback: noop, onedit: noop, onsent: noop, ...extra } }).body.replace(/<!--[^>]*-->/g, '');
};

test('only what was reported: what is wrong and the registered obstacle, no repeats', () => {
  const html = page(moved);
  const pairs = [...html.matchAll(/<dt class="input-label[^"]*">([^<]+)<\/dt>\s*<dd class="field-value[^"]*">([^<]+)<\/dd>/g)].map((match) => [match[1], match[2]]);
  assert.deepEqual(pairs, [['What is wrong', 'Wrong position'], ['Registered obstacle', 'Building · 10 m · ID DSB-201']]);
  assert.doesNotMatch(html, /Not reported|ACTIVITY|DESCRIPTION AND REPORTER|>POSITION<|Error report<\/strong>|Registered Building · 10 m/);
  assert.match(html, /Reported by [^<]+· Last edited <time/);
});

test('reported corrections add their own cards', () => {
  const html = page({ obstacle, answers: { errorKinds: ['wrong-height', 'wrong-lighting'], actualHeightM: 12, correctedPosition: null, description: 'Taller now' } });
  assert.match(html, />Actual height<\/dt>\s*<dd[^>]*>12 m \(registered 10 m\)<\/dd>/);
  assert.match(html, />Lighting<\/dt>\s*<dd[^>]*>Lit → Not lit<\/dd>/);
  assert.match(html, /<p class="description[^"]*">Taller now<\/p>/);
});

test('the new obstacle page itself: Description and photo, then Location, both full width', () => {
  const html = page(moved, { onshowonmap: noop });
  assert.doesNotMatch(html, /two-col/);
  assert.match(html, /class="fields-row[\s\S]*class="info-card[^"]*"[^>]*>[\s\S]*id="view-description-heading">Description and photo<\/h2>[\s\S]*class="location-panel panel[\s\S]*id="view-location-heading">Location<\/h2>[\s\S]*>Show on map<\/button>[\s\S]*>Edit location<\/button>/);
  assert.match(html, /class="muted empty[^"]*">No description added<\/p>/);
  assert.match(html, /data-variant="secondary"[^>]*>Edit report<\/button>[\s\S]*Goes straight to the NRL reviewer[\s\S]*data-color="brand1"/);
});

test('the move is written out in words', () => {
  assert.equal(describeMoveFromRegistered({ lat: 60.4054, lng: 5.3235 }, { lat: 60.4077, lng: 5.3279 }), 'Moved 352 m northeast of the registered position');
  assert.equal(describeMoveFromRegistered({ lat: 60, lng: 5 }, { lat: 60, lng: 5 }), 'Not moved');
});
