import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Component } from 'svelte';
import { render } from 'svelte/server';
import type { ErrorReportRecord } from '../src/lib/obstacles/errorReport.js';
import { describeMoveFromRegistered } from '../src/lib/obstacles/position.js';
import type { Report } from '../src/lib/reports/reportsData.js';
import { errorReportToReport } from '../src/lib/reports/errorReportRecords.js';
import { compileSvelteComponent } from './helpers/svelte-server.js';
import { reportDetailSpecifiers } from './helpers/reportDetail.js';

const url = await compileSvelteComponent('src/lib/reports/ReportViewPage.svelte', await reportDetailSpecifiers());
type Props = { report: Report; record: ErrorReportRecord; onback: () => void; onedit: () => void; onsent: () => void };
const { default: Page } = await import(url) as { default: Component<Props> };
const noop = () => {};
const obstacle = { id: 'DSB-201', name: 'Sandviken', type: 'Building' as const, heightM: 10, lit: true, lat: 60.4054, lng: 5.3235 };
const moved: ErrorReportRecord = { obstacle, answers: { errorKinds: ['wrong-position'], actualHeightM: null, correctedPosition: { lat: 60.4077, lng: 5.3279 }, description: '' } };
const page = (record: ErrorReportRecord, extra: Partial<Props> = {}) => {
  const report = errorReportToReport('e1', record);
  return render(Page, { props: { report, record, onback: noop, onedit: noop, onsent: noop, ...extra } }).body.replace(/<!--[^>]*-->/g, '');
};

test('error report: the title, and only the fields marked wrong in the Reported change table', () => {
  const html = page(moved);
  assert.match(html, /<h1[^>]*>Error report · Sandviken<\/h1>/);
  assert.match(html, /id="view-changes-heading">Reported change<\/h2>/);
  assert.match(html, /<th scope="col" class="reported-field[^"]*">Field<\/th><th scope="col"[^>]*>In NRL today<\/th><th scope="col"[^>]*>Reported<\/th>/);
  const rows = [...html.matchAll(/<th scope="row"[^>]*>([^<]+)<\/th>/g)].map((match) => match[1]);
  assert.deepEqual(rows, ['Position']);
  assert.doesNotMatch(html, /Not reported|class="fields-row|Registered obstacle|What is wrong/);
  assert.match(html, /Reported by [^<]+· Last edited <time/);
});

test('several corrections are rows; "Does not exist" is the single struck-through row', () => {
  const html = page({ obstacle, answers: { errorKinds: ['wrong-height', 'wrong-lighting'], actualHeightM: 12, correctedPosition: null, description: 'Taller now' } });
  assert.match(html, />Reported changes · 2<\/h2>/);
  assert.match(html, /<th scope="row"[^>]*>Height<\/th>\s*<td class="current[^"]*">10 m<\/td>\s*<td class="reported[^"]*"><strong[^>]*>12 m<\/strong>/);
  assert.match(html, /<th scope="row"[^>]*>Lighting<\/th>\s*<td class="current[^"]*">Lit<\/td>\s*<td class="reported[^"]*"><strong[^>]*>Not lit<\/strong>/);
  assert.match(html, /<p class="description[^"]*">Taller now<\/p>/);
  const gone = page({ obstacle, answers: { errorKinds: ['does-not-exist'], actualHeightM: null, correctedPosition: null, description: '' } });
  assert.match(gone, /<th scope="row"[^>]*>Obstacle<\/th>\s*<td class="current[^"]*"><s[^>]*>Building · 10 m · ID DSB-201<\/s>/);
});

test('error report keeps Add photo in its description card, and the footer', () => {
  const html = page(moved);
  assert.match(html, /class="muted empty[^"]*">No description added<\/p>/);
  assert.doesNotMatch(html, /Edit location|Show on map/);
  assert.match(html, /data-variant="secondary"[^>]*>Edit report<\/button>[\s\S]*Goes straight to the NRL reviewer[\s\S]*data-color="brand1"/);
});

test('the move is written out in words', () => {
  assert.equal(describeMoveFromRegistered({ lat: 60.4054, lng: 5.3235 }, { lat: 60.4077, lng: 5.3279 }), 'Moved 352 m northeast of the registered position');
  assert.equal(describeMoveFromRegistered({ lat: 60, lng: 5 }, { lat: 60, lng: 5 }), 'Not moved');
});
