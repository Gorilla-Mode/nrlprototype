import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Component } from 'svelte';
import { render } from 'svelte/server';
import type { ErrorReportRecord } from '../src/lib/obstacles/errorReport.js';
import { describeOffsetFromRegistered } from '../src/lib/obstacles/position.js';
import { ObstacleType } from '../src/lib/reporting/obstacle.js';
import { errorReportToReport } from '../src/lib/reports/errorReportRecords.js';
import { isSent, reportActivity, reportProgressLine, type Report } from '../src/lib/reports/reportsData.js';
import { createReportStore, type ReportRepository, type ReportState } from '../src/lib/reports/reportStore.js';
import { reportedChanges, reportedChangesHeading, sentStatusView } from '../src/lib/reports/sentReport.js';
import { reports } from './helpers/reportFixtures.js';
import { compileSvelteComponent } from './helpers/svelte-server.js';

const obstacle = { id: 'DSB-201', name: 'Sandviken', type: 'Building' as const, heightM: 10, lit: true, lat: 60.4054, lng: 5.3235 };
const record = (answers: Partial<ErrorReportRecord['answers']>): ErrorReportRecord => ({
  obstacle, answers: { errorKinds: [], actualHeightM: null, correctedPosition: null, description: '', ...answers },
});
const sentAt = '2026-10-14T10:00:00.000Z';
const reviewedAt = '2026-10-20T10:00:00.000Z';
const errorSent = (status: Report['status'], extra: Partial<Report> = {}): Report => ({
  ...errorReportToReport('e1', record({ errorKinds: ['wrong-height'], actualHeightM: 14 })),
  status, createdAt: '2026-10-12T10:00:00.000Z', sentAt, ...extra,
});
const newSent = (status: Report['status'], extra: Partial<Report> = {}): Report => ({
  ...reports.find((report) => report.status === 'pending')!,
  name: '', obstacleType: ObstacleType.Construction, heightMeters: 20, heightFeet: 66, lighting: 'unknown',
  pilotReportText: '', photos: [], status, sentAt, ...extra,
});

test('the status block: one wording, colour and timeline per state; under review is never green', () => {
  const review = sentStatusView(errorSent('pending'))!;
  assert.deepEqual([review.key, review.tone, review.chipLabel, review.title, review.canWithdraw], ['under_review', 'info', 'Under review', 'Under review at NRL', true]);
  assert.match(review.text, /^Sent 14 October 2026\. You'll be notified when the reviewer has made a decision\.$/);
  assert.deepEqual(review.steps.map((step) => [step.label, step.state]),
    [['Created', 'done'], ['Sent', 'done'], ['Under review', 'current'], ['Decision', 'upcoming']]);
  assert.deepEqual(review.steps.slice(2).map((step) => step.detail), ['Waiting for reviewer', '—']);

  const approved = sentStatusView(errorSent('approved', { reviewedAt }))!;
  assert.deepEqual([approved.tone, approved.chipLabel, approved.title, approved.canWithdraw], ['success', 'Approved', 'Approved and registered', false]);
  assert.equal(approved.text, 'Approved 20 October 2026. The change is now in NRL.');
  assert.deepEqual(approved.steps.map((step) => step.label), ['Created', 'Sent', 'Reviewed', 'Approved']);
  assert.ok(approved.steps.every((step) => step.state === 'done'));

  const rejected = sentStatusView(errorSent('declined', { reviewedAt }))!;
  assert.deepEqual([rejected.tone, rejected.chipLabel, rejected.title, rejected.comment], ['warning', 'Not approved', 'Not approved', null]);
  assert.equal(rejected.text, 'Reviewed 20 October 2026. The obstacle stays as registered in NRL.');
  assert.equal(sentStatusView(errorSent('declined', { reviewerComment: '  Already registered as DSB-202. ' }))!.comment, 'Already registered as DSB-202.');

  const withdrawn = sentStatusView(errorSent('withdrawn', { withdrawnAt: reviewedAt }))!;
  assert.deepEqual([withdrawn.tone, withdrawn.chipLabel, withdrawn.title], ['neutral', 'Withdrawn', 'Withdrawn']);
  assert.equal(withdrawn.text, 'You withdrew this report 20 October 2026. It will not be reviewed.');
  assert.deepEqual(withdrawn.steps.map((step) => step.label), ['Created', 'Sent', 'Withdrawn']);

  assert.equal(sentStatusView(errorSent('ready')), null);
});

test('a new obstacle says it is now registered when approved', () => {
  assert.equal(sentStatusView(newSent('approved', { reviewedAt }))!.text, 'Approved 20 October 2026. The obstacle is now registered in NRL.');
});

test('reported changes: a row only for each field marked wrong; "Does not exist" stands alone', () => {
  assert.deepEqual(reportedChanges(record({ errorKinds: ['wrong-lighting'] })), [{ field: 'Lighting', current: 'Lit', reported: 'Not lit' }]);
  const moved = { lat: 60.4054, lng: 5.3299 };
  const all = reportedChanges(record({ errorKinds: ['wrong-height', 'wrong-lighting', 'wrong-position'], actualHeightM: 14, correctedPosition: moved }));
  assert.deepEqual(all.map((row) => row.field), ['Height', 'Lighting', 'Position']);
  assert.deepEqual([all[0].current, all[0].reported], ['10 m', '14 m']);
  assert.equal(all[2].reported, '60.4054° N, 5.3299° E');
  assert.match(all[2].note ?? '', /^\d+ m east of registered$/);
  assert.equal(all[2].note, describeOffsetFromRegistered(obstacle, moved));
  assert.deepEqual(reportedChanges(record({ errorKinds: ['does-not-exist'] })),
    [{ field: 'Obstacle', current: 'Building · 10 m · ID DSB-201', reported: 'Does not exist', struck: true }]);
  assert.deepEqual(reportedChanges(record({ description: 'Only described' })), []);
  assert.equal(reportedChangesHeading(1), 'Reported change');
  assert.equal(reportedChangesHeading(3), 'Reported changes · 3');
});

function memoryRepository(): ReportRepository {
  let saved: ReportState | null = null;
  return { load: () => saved, save: (state) => { saved = state; } };
}

test('withdrawing: only under review, dated, and still listed under Sent', () => {
  let now = new Date(2026, 10, 9, 9, 0);
  const store = createReportStore(memoryRepository(), () => now);
  const ready = store.markReady(errorSent('ready'))!;
  assert.equal(store.withdrawReport(ready.id), undefined);
  store.submitReport(ready.id);
  now = new Date(2026, 10, 9, 12, 30);
  const withdrawn = store.withdrawReport(ready.id)!;
  assert.equal(withdrawn.status, 'withdrawn');
  assert.equal(withdrawn.withdrawnAt, now.toISOString());
  assert.ok(isSent(withdrawn));
  assert.equal(reportProgressLine(withdrawn), 'Will not be reviewed');
  assert.equal(reportActivity(withdrawn).text, 'Withdrawn 09.11.2026');
  assert.equal(store.updateStatus(ready.id, 'approved'), undefined);
  assert.equal(store.withdrawReport(ready.id), undefined);

  const reviewed = store.markReady(errorSent('ready', { id: 'e2' }))!;
  store.submitReport(reviewed.id);
  assert.equal(store.updateStatus(reviewed.id, 'declined')!.reviewedAt, now.toISOString());
});

const stub = (name: string) => `data:text/javascript,export default function ${name}() {}`;
const pageUrl = await compileSvelteComponent('src/lib/reports/ReportDetailPage.svelte', {
  '../components/PageHeader.svelte': await compileSvelteComponent('src/lib/components/PageHeader.svelte'),
  '../components/Dialog.svelte': stub('Dialog'),
  '../map/MiniMap.svelte': stub('MiniMap'),
  './PhotoField.svelte': stub('PhotoField'),
  '../drafts/types': new URL('../src/lib/drafts/types.js', import.meta.url).href,
  '../reporting/obstacle': new URL('../src/lib/reporting/obstacle.js', import.meta.url).href,
  './reportsData': new URL('../src/lib/reports/reportsData.js', import.meta.url).href,
  './reportStore': new URL('../src/lib/reports/reportStore.js', import.meta.url).href,
  './sentReport': new URL('../src/lib/reports/sentReport.js', import.meta.url).href,
  './reportGeometry': new URL('../src/lib/reports/reportGeometry.js', import.meta.url).href,
});
const { default: Page } = await import(pageUrl) as { default: Component<{ report: Report; onback: () => void }> };
const page = (report: Report) => render(Page, { props: { report, onback: () => {} } }).body.replace(/<!--[^>]*-->/g, '');

test('error report page: status block, a real changes table, no removed cards', () => {
  const html = page(errorSent('pending'));
  assert.match(html, /<h1[^>]*>Error report · Sandviken<\/h1>/);
  assert.match(html, /aria-label="Back to reports"/);
  assert.match(html, /data-tone="info"[^>]*><svg[^>]*aria-hidden="true"[^>]*><circle [^>]*\/?>(<\/circle>)?<path d="M12 7v5l3 2"\s*\/?>(<\/path>)?<\/svg>Under review<\/span>/);
  assert.match(html, /Reported by [^<]+· Sent <time datetime="[^"]+">14\.10\.2026<\/time>/);
  assert.match(html, /<section[^>]*aria-label="Status"/);
  assert.match(html, />Withdraw report<\/button>/);
  assert.match(html, /data-state="current" aria-current="step"/);
  assert.match(html, /<ol class="timeline[^"]*" data-steps="4">/);
  assert.match(html, /<th scope="col"[^>]*>Field<\/th><th scope="col"[^>]*>In NRL today<\/th><th scope="col"[^>]*>Reported<\/th>/);
  assert.match(html, /<th scope="row"[^>]*>Height<\/th>/);
  assert.match(html, />Reported change</);
  // Nothing written and no photos: the card says so.
  assert.match(html, />Description and photos<\/h2>\s*<p class="description muted[^"]*">No description added<\/p>\s*<div class="photo-row[^"]*"><p class="muted[^"]*">No photos added<\/p>/);
  assert.doesNotMatch(html, /Add photo|Not reported|Activity|Sent for review on|Edit location|ID DSB-201|Comment from reviewer/);
});

test('reviewed and withdrawn pages have no Withdraw; a reviewer comment is shown when there is one', () => {
  for (const status of ['approved', 'declined', 'withdrawn'] as const) {
    const html = page(errorSent(status));
    assert.doesNotMatch(html, /Withdraw report/);
    // The clock belongs to Under review only.
    assert.doesNotMatch(html, /sent-chip[^>]*><svg/);
  }
  assert.match(page(errorSent('declined', { reviewerComment: 'Already registered.' })), /Comment from reviewer<\/h3>\s*<p[^>]*>Already registered\.<\/p>/);
});

test('new obstacle page: its type and height as title, the fields the pilot filled in, no NRL column', () => {
  const html = page(newSent('approved', { pilotReportText: 'Crane on the quay.' }));
  assert.match(html, /<h1[^>]*>New obstacle · Construction · 20 m<\/h1>/);
  assert.match(html, />Reported obstacle<\/h2>\s*<table class="changes/);
  assert.match(html, /<thead[^>]*><tr><th scope="col"[^>]*>Field<\/th><th scope="col"[^>]*>Reported<\/th><\/tr><\/thead>/);
  const rows = [...html.matchAll(/<th scope="row"[^>]*>([^<]+)<\/th>\s*<td class="reported[^"]*"><strong[^>]*>([^<]+)<\/strong>/g)].map((match) => [match[1], match[2]]);
  assert.deepEqual(rows, [['Type', 'Construction'], ['Height', '20 m (66 ft)'], ['Lighting', 'Unknown']]);
  assert.match(html, /20 m \(66 ft\)<\/strong><span class="note[^"]*">At the highest point<\/span>/);
  assert.match(html, /The obstacle is now registered in NRL\./);
  assert.match(html, />Description and photos<\/h2>\s*<p class="description[^"]*">Crane on the quay\.<\/p>/);
  assert.doesNotMatch(html, /In NRL today/);
  assert.doesNotMatch(page(newSent('pending', { lighting: null })), /<th scope="row"[^>]*>Lighting<\/th>/);
});
