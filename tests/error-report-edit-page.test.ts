import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Component } from 'svelte';
import { render } from 'svelte/server';
import type { ErrorReportAnswers, ErrorReportRecord } from '../src/lib/obstacles/errorReport.js';
import { editedErrorReport, errorReportToReport } from '../src/lib/reports/errorReportRecords.js';
import type { Report } from '../src/lib/reports/reportsData.js';
import { compileSvelteComponent } from './helpers/svelte-server.js';
import { compileStatusBadge } from './helpers/statusBadge.js';

const obstacle = { id: 'DSB-201', name: 'Sandviken', type: 'Building' as const, heightM: 10, lit: true, lat: 60.4054, lng: 5.3235 };
const record: ErrorReportRecord = { obstacle, answers: { errorKinds: ['wrong-height'], actualHeightM: 14, correctedPosition: null, description: 'Taller now.' } };
const stored: Report = {
  ...errorReportToReport('e1', record, { existing: { name: 'Roof', createdAt: '2026-10-12T10:00:00.000Z' } }),
  photos: [{ id: 'p1', name: 'IMG_1.jpg', url: 'blob:p1', width: 4, height: 3 }],
};
const answers = (patch: Partial<ErrorReportAnswers>): ErrorReportAnswers => ({ ...record.answers, ...patch });

test('saving complete answers keeps the Ready report, with its name, creation time and photos', () => {
  const moved = { lat: 60.4054, lng: 5.3299 };
  const edited = editedErrorReport(stored, answers({ errorKinds: ['wrong-height', 'wrong-position'], correctedPosition: moved, description: '  Moved east. ' }), stored.photos);
  assert.equal(edited.kind, 'ready');
  if (edited.kind !== 'ready') return;
  const { report } = edited;
  assert.deepEqual([report.id, report.name, report.createdAt, report.status], ['e1', 'Roof', '2026-10-12T10:00:00.000Z', 'ready']);
  assert.deepEqual(report.photos.map(({ id }) => id), ['p1']);
  assert.equal(report.heightMeters, 14);
  assert.deepEqual(report.geometry, { type: 'Point', coordinates: [5.3299, 60.4054] });
  assert.equal(report.pilotReportText, 'Moved east.');
  assert.deepEqual(report.errorReport?.answers.errorKinds, ['wrong-height', 'wrong-position']);
});

test('saving incomplete answers moves it back to Drafts, as on the new obstacle edit page', () => {
  const edited = editedErrorReport(stored, answers({ actualHeightM: null }), []);
  assert.equal(edited.kind, 'draft');
  if (edited.kind !== 'draft') return;
  assert.deepEqual([edited.draft.id, edited.draft.title], ['e1', 'Roof']);
  assert.deepEqual(edited.draft.errorReport?.answers.errorKinds, ['wrong-height']);
  assert.throws(() => editedErrorReport({ ...stored, errorReport: undefined }, record.answers, []));
});

const stub = (name: string) => `data:text/javascript,export default function ${name}() {}`;
const pageUrl = await compileSvelteComponent('src/lib/reports/ErrorReportEditPage.svelte', {
  '../components/PageHeader.svelte': await compileSvelteComponent('src/lib/components/PageHeader.svelte'),
  './StatusBadge.svelte': await compileStatusBadge(),
  '../map/MiniMap.svelte': stub('MiniMap'),
  '../map/LocationEditor.svelte': stub('LocationEditor'),
  './PhotoField.svelte': stub('PhotoField'),
  '../obstacles/errorReport': new URL('../src/lib/obstacles/errorReport.js', import.meta.url).href,
  '../obstacles/position': new URL('../src/lib/obstacles/position.js', import.meta.url).href,
  './reportGeometry': new URL('../src/lib/reports/reportGeometry.js', import.meta.url).href,
  './reportsData': new URL('../src/lib/reports/reportsData.js', import.meta.url).href,
  './reportStore': new URL('../src/lib/reports/reportStore.js', import.meta.url).href,
  './errorReportRecords': new URL('../src/lib/reports/errorReportRecords.js', import.meta.url).href,
});
const { default: Page } = await import(pageUrl) as { default: Component<{ report: Report; onback: () => void; ondone: () => void; onsend: () => void }> };
const noop = () => {};
const page = (report: Report) => render(Page, { props: { report, onback: noop, ondone: noop, onsend: noop } }).body.replace(/<!--[^>]*-->/g, '');

test('the new obstacle edit page layout, with the error form answers', () => {
  const html = page(stored);
  assert.match(html, /<h1[^>]*>Error report · Sandviken<\/h1>/);
  assert.match(html, /aria-label="Back to Reports"/);
  assert.match(html, /data-status="ready"/);
  assert.match(html, /<p class="report-meta[^"]*">\s*Reported by [^<]+· Last edited <time/);
  // Same cards, sections and footer as the new obstacle edit page.
  assert.match(html, /class="fields-row[\s\S]*class="info-card[\s\S]*Description and photo \(optional\)[\s\S]*id="error-description"[\s\S]*class="location-panel[\s\S]*>Location<\/h2>[\s\S]*>Edit location<\/button>[\s\S]*class="bottom-bar[\s\S]*>Save draft<\/button>[\s\S]*Send for Review/);
  const pressed = [...html.matchAll(/aria-pressed="(true|false)"[^>]*>[\s\S]*?<span class="kind-text[^"]*">\s*([^<]+?)\s*</g)].map((match) => [match[2], match[1]]);
  assert.deepEqual(pressed, [['Does not exist', 'false'], ['Wrong position', 'false'], ['Wrong height', 'true'], ['Wrong lighting', 'false']]);
  assert.match(html, /id="error-height"[^>]*value="14"/);
  assert.match(html, /\+4 m higher than registered/);
  assert.match(html, />Building · 10 m · Lit<\/p>/);
  assert.match(html, /Taller now\.<\/textarea>/);
  assert.doesNotMatch(html, /aria-disabled="true"|needed-box/);
});

test('missing answers are named, and Send stays focusable but marked unavailable', () => {
  const html = page({ ...stored, errorReport: { obstacle, answers: answers({ actualHeightM: null }) } });
  assert.match(html, /class="needed-box[\s\S]*Enter the correct height to continue:[\s\S]*>Actual height<\/a>/);
  assert.match(html, /aria-invalid="true"/);
  assert.match(html, /Required to send/);
  assert.match(html, /class="ds-button send-button[^"]*"[^>]*aria-disabled="true"/);
  // Height not reported: no input, and a hint instead.
  const noHeight = page({ ...stored, errorReport: { obstacle, answers: answers({ errorKinds: ['wrong-lighting'], actualHeightM: null }) } });
  assert.doesNotMatch(noHeight, /<input/);
  assert.match(noHeight, /Select Wrong height to correct it/);
  assert.match(noHeight, /Lit → Not lit/);
});
