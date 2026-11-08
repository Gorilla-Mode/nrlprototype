import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { buildErrorReport, errorKindsLabel, errorReportHeading, errorReportRows, type ErrorReportRecord } from '../src/lib/obstacles/errorReport.js';
import type { RegisteredObstacle } from '../src/lib/obstacles/registeredObstacles.js';
import { deliverErrorReport, errorReportToDraft, errorReportToReport } from '../src/lib/reports/errorReportRecords.js';
import { createReportStore, type ReportRepository, type ReportState } from '../src/lib/reports/reportStore.js';
import { reportHeading } from '../src/lib/reports/reportsData.js';
import { compileSvelteComponent } from './helpers/svelte-server.js';

const obstacle: RegisteredObstacle = { id: 'NRL-10432', name: 'Bergen mast', type: 'Mast', heightM: 45, lit: true, lat: 60.409, lng: 5.333 };
const record: ErrorReportRecord = {
  obstacle,
  answers: { errorKinds: ['wrong-height', 'wrong-lighting'], actualHeightM: 60, correctedPosition: null, description: ' Taller now ' },
};
const now = new Date('2026-11-06T10:00:00Z');

function memoryStore() {
  let saved: ReportState | null = null;
  const repository: ReportRepository = { load: () => saved, save: (state) => { saved = state; } };
  return createReportStore(repository, () => now);
}

test('an error report is named as one, with what is wrong in choice order', () => {
  assert.equal(errorReportHeading(record), 'Error report · Bergen mast');
  assert.equal(errorReportHeading({ ...record, obstacle: { ...obstacle, name: undefined } }), 'Error report · Mast');
  assert.equal(errorKindsLabel(['wrong-lighting', 'wrong-height']), 'Wrong height, Wrong lighting');
  assert.equal(errorKindsLabel([]), 'Described below');
});

test('summary rows show every answer, unanswered ones as Not reported', () => {
  const rows = Object.fromEntries(errorReportRows(record).map((row) => [row.key, row.value]));
  assert.deepEqual(rows, {
    obstacle: 'Bergen mast · ID NRL-10432',
    kinds: 'Wrong height, Wrong lighting',
    height: '60 m (registered 45 m)',
    lighting: 'Lit → Not lit',
    position: 'Not reported',
    description: 'Taller now',
  });
  const unknownPosition = errorReportRows({ obstacle, answers: { ...record.answers, errorKinds: ['wrong-position'] } });
  assert.equal(unknownPosition.find((row) => row.key === 'position')?.value, 'Position not specified');
});

test('drafts and Ready reports carry the record and describe the obstacle as reported', () => {
  const draft = errorReportToDraft('e1', record, { now });
  assert.equal(draft.errorReport, record);
  assert.equal(draft.heightAboveGround, '60 m (197 ft)');
  assert.equal(draft.lighting, 'no');
  assert.deepEqual(draft.geometry, { type: 'Point', coordinates: [5.333, 60.409] });
  const report = errorReportToReport('e1', record, { existing: { name: '', createdAt: draft.createdAt }, now });
  assert.equal(report.status, 'ready');
  assert.equal(report.heightMeters, 60);
  assert.equal(reportHeading(report), 'Error report · Bergen mast');
});

test('Draft → Ready to send → Sent keeps one record with the error report', () => {
  const store = memoryStore();
  store.saveDraft(errorReportToDraft('e1', record, { now }));
  assert.equal(store.getDrafts()[0].errorReport, record);
  store.markReady(errorReportToReport('e1', record, { now }));
  assert.equal(store.getDrafts().length, 0);
  const sent = store.submitReport('e1');
  assert.equal(sent?.status, 'pending');
  assert.equal(sent?.errorReport, record);
});

test('sending logs the same payload buildErrorReport has always made', () => {
  const sent = { ...errorReportToReport('e1', record, { now }), status: 'pending' as const, sentAt: now.toISOString() };
  const logged: unknown[][] = [];
  const original = console.log;
  console.log = (...args: unknown[]) => { logged.push(args); };
  try {
    deliverErrorReport(sent);
    deliverErrorReport({ ...sent, errorReport: undefined });
  } finally {
    console.log = original;
  }
  assert.deepEqual(logged, [['Error report:', buildErrorReport(obstacle, record.answers, now)]]);
});

const dialogActionsUrl = await compileSvelteComponent('src/lib/components/DialogActions.svelte');
const dialogUrl = await compileSvelteComponent('src/lib/components/Dialog.svelte', { './DialogActions.svelte': dialogActionsUrl });
const summaryUrl = await compileSvelteComponent('src/lib/reporting/ReportSummaryDialog.svelte', { '../components/Dialog.svelte': dialogUrl });
type SummaryProps = { title: string; rows: { key: string; label: string; value: string; edit?: { onclick: () => void } }[]; oncontinue: () => void; onsend: () => void; onclose: () => void };
const { default: ReportSummaryDialog } = await import(summaryUrl) as { default: Component<SummaryProps> };

test('the error summary uses the shared dialog: every answer has a pencil, the obstacle does not', () => {
  const noop = () => {};
  const rows = errorReportRows(record).map((row) => ({ ...row, edit: row.key === 'obstacle' ? undefined : { onclick: noop } }));
  const html = render(ReportSummaryDialog, { props: { title: 'Error report saved – not sent yet', rows, oncontinue: noop, onsend: noop, onclose: noop } }).body;
  assert.match(html, />Error report saved – not sent yet</);
  assert.match(html, /Your report is saved and ready to send\. You can send it now, or continue and finish it later\./);
  assert.match(html, /data-variant="primary"[^>]*>Save and continue<\/button>[\s\S]*data-variant="tertiary"[^>]*>Send report<\/button>/);
  assert.doesNotMatch(html, /aria-label="Edit obstacle"/);
  for (const label of ['what is wrong', 'actual height', 'lighting', 'position', 'description']) assert.match(html, new RegExp(`aria-label="Edit ${label}"`));
});
