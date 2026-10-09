import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { bulkSendAnnouncement, bulkSendTitle, markSent, mergeRetry, reportCount, sendReports, sendToKartverket, type ReportSender } from '../src/lib/reports/bulkSend.js';
import { countForStatusTab, reports, type Report } from '../src/lib/reports/reportsData.js';
import { obstacleTypeLabel } from '../src/lib/reporting/obstacle.js';
import { compileSvelteComponent } from './helpers/svelte-server.js';

const ready = () => reports.filter((report) => report.status === 'ready').map((report) => ({ ...report }));

test('the prototype sender delivers every selected report, keeping list order', async () => {
  const selected = ready();
  const result = await sendReports(selected, sendToKartverket);
  assert.deepEqual(result.sent.map(({ id }) => id), selected.map(({ id }) => id));
  assert.deepEqual(result.failed, []);
  assert.equal(bulkSendTitle(result), '4 reports sent for review');
  assert.equal(bulkSendAnnouncement(result), '4 reports sent');
});

test('one failure never blocks the others; failures keep their reason and a fallback', async () => {
  const selected = ready();
  const send: ReportSender = async (report) => {
    if (report.id === selected[1].id) throw new Error('Kartverket did not respond');
    if (report.id === selected[3].id) throw 'unexpected';
  };
  const result = await sendReports(selected, send);
  assert.deepEqual(result.sent.map(({ id }) => id), [selected[0].id, selected[2].id]);
  assert.deepEqual(result.failed.map(({ report, reason }) => [report.id, reason]), [
    [selected[1].id, 'Kartverket did not respond'],
    [selected[3].id, 'Could not be sent. Try again.'],
  ]);
  assert.equal(bulkSendTitle(result), '2 of 4 reports sent');
  assert.equal(bulkSendAnnouncement(result), '2 of 4 reports sent. 2 reports failed');

  // Try again sends only the failed reports and merges the outcome.
  const attempted: string[] = [];
  const retry = await sendReports(result.failed.map(({ report }) => report), async (report) => {
    attempted.push(report.id);
    if (report.id === selected[3].id) throw new Error('Still offline');
  });
  assert.deepEqual(attempted, [selected[1].id, selected[3].id]);
  const merged = mergeRetry(result, retry);
  assert.deepEqual(merged.sent.map(({ id }) => id), [selected[0].id, selected[2].id, selected[1].id]);
  assert.deepEqual(merged.failed.map(({ report }) => report.id), [selected[3].id]);
  assert.equal(bulkSendTitle(merged), '3 of 4 reports sent');
});

test('only delivered reports move to Sent for review; failed ones stay Ready and the tab counts follow', () => {
  const copies: Report[] = reports.map((report) => ({ ...report }));
  const [first, second] = copies.filter((report) => report.status === 'ready');
  markSent(first, '09.10.2026');
  assert.equal(first.status, 'pending');
  assert.equal(first.secondaryDate, '09.10.2026');
  assert.equal(second.status, 'ready');
  assert.equal(countForStatusTab(copies, 'ready'), 3);
  assert.equal(countForStatusTab(copies, 'sent'), 7);
});

test('counts read naturally for one report or several', () => {
  assert.equal(reportCount(1), '1 report');
  assert.equal(reportCount(3), '3 reports');
  assert.equal(bulkSendTitle({ sent: [reports[0]], failed: [] }), '1 report sent for review');
  assert.equal(bulkSendTitle({ sent: [], failed: [{ report: reports[0], reason: 'x' }] }), '0 of 1 report sent');
});

const dialogUrl = await compileSvelteComponent('src/lib/reports/BulkSendDialog.svelte', {
  '../reporting/obstacle': new URL('../src/lib/reporting/obstacle.js', import.meta.url).href,
  './reportsData': new URL('../src/lib/reports/reportsData.js', import.meta.url).href,
  './bulkSend': new URL('../src/lib/reports/bulkSend.js', import.meta.url).href,
  '../components/Dialog.svelte': await compileSvelteComponent('src/lib/components/Dialog.svelte', {
    './DialogActions.svelte': await compileSvelteComponent('src/lib/components/DialogActions.svelte'),
  }),
});
const { default: BulkSendDialog } = await import(dialogUrl) as {
  default: Component<{ reports: readonly Report[]; send: ReportSender; onsent: () => void; onclose: () => void; onviewsent: () => void }>;
};

test('the confirmation asks before sending and lists name, type and height of each selected report', () => {
  const selected = ready().slice(0, 2);
  const html = render(BulkSendDialog, { props: { reports: selected, send: sendToKartverket, onsent() {}, onclose() {}, onviewsent() {} } }).body;
  assert.match(html, /<dialog[^>]*role="alertdialog"[^>]*aria-labelledby="([^"]+)"/);
  const titleId = html.match(/aria-labelledby="([^"]+)"/)![1];
  assert.match(html, new RegExp(`<h2 id="${titleId}"[^>]*>Send 2 reports to Kartverket\\?</h2>`));
  // The muted subtitle sits under the title and describes the dialog.
  const subtitleId = html.match(/aria-describedby="([^"]+)"/)![1];
  assert.match(html, new RegExp(`id="${subtitleId}"[^>]*><p[^>]*>Sent reports can't be edited.</p>`));
  assert.ok(html.indexOf(`id="${titleId}"`) < html.indexOf('aria-label="Close"'));
  assert.doesNotMatch(html, /app-dialog-icon/);
  for (const report of selected) {
    assert.ok(html.includes(`>${report.name}<`));
    assert.ok(html.includes(`${obstacleTypeLabel(report.obstacleType)} · ${report.heightFeet} ft (${report.heightMeters} m)`));
  }
  assert.match(html, /class="button dialog-action-primary"[^>]*>\s*Send 2 reports\s*<\/button>/);
  assert.match(html, /class="button dialog-action-secondary"[^>]*>Cancel<\/button>/);
  // Side by side, the DOM (and so Tab) order is the visual order: Cancel left, Send right.
  const actions = html.slice(html.indexOf('class="dialog-actions'));
  assert.ok(actions.indexOf('>Cancel</button>') > -1);
  assert.ok(actions.indexOf('>Cancel</button>') < actions.indexOf('Send 2 reports'));
  assert.match(actions, /data-dialog-action="secondary"[^]*data-dialog-action="primary"/);
  assert.match(html, /role="status" aria-live="polite"/);
  assert.doesNotMatch(html, /sent for review|View sent reports/);
});
