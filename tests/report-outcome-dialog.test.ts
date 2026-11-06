import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Component } from 'svelte';
import { render } from 'svelte/server';
import type { Report } from '../src/lib/reports/reportsData.js';
import { reports } from './helpers/reportFixtures.js';
import { compileSvelteComponent } from './helpers/svelte-server.js';

const dialogUrl = await compileSvelteComponent('src/lib/reports/ReportSentDialog.svelte', {
  '../reporting/obstacle': new URL('../src/lib/reporting/obstacle.js', import.meta.url).href,
  './reportsData': new URL('../src/lib/reports/reportsData.js', import.meta.url).href,
  './reportGeometry': new URL('../src/lib/reports/reportGeometry.js', import.meta.url).href,
  '../drafts/types': new URL('../src/lib/drafts/types.js', import.meta.url).href,
  './StatusBadge.svelte': await compileSvelteComponent('src/lib/reports/StatusBadge.svelte'),
  '../components/Dialog.svelte': await compileSvelteComponent('src/lib/components/Dialog.svelte', {
    './DialogActions.svelte': await compileSvelteComponent('src/lib/components/DialogActions.svelte'),
  }),
});
type Props = { report: Report; sentAt: Date; onprimary: () => void; onclose: () => void };
const { default: ReportSentDialog } = await import(dialogUrl) as { default: Component<Props> };

const noop = () => {};
const sent: Report = { ...reports.find((report) => report.status === 'ready')!, status: 'pending', sentAt: '2024-10-15T12:00:00' };

test('sent: the title and tag use the Sent status name and keep the review note', () => {
  const html = render(ReportSentDialog, { props: { report: sent, sentAt: new Date('2024-10-15T12:00:00'), onprimary: noop, onclose: noop } }).body;
  assert.match(html, /<h2[^>]*>Report sent<\/h2>/);
  assert.match(html, /data-status="pending"[^>]*>Sent</);
  assert.doesNotMatch(html, /Sent for review/);
  assert.match(html, /Kartverket will review the report\. You don't need to do anything else, and you'll be notified when the obstacle is registered\./);
  assert.match(html, /data-variant="primary"[^>]*>Back to reports</);
  assert.doesNotMatch(html, /Back to map/);
});
