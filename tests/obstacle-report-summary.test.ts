import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { compileSvelteComponent } from './helpers/svelte-server.js';
import { ObstacleType } from '../src/lib/reporting/obstacle.js';
import { completePayload, type CompleteReport, type DetailsDraft } from '../src/lib/reporting/createDetailsController.js';
import { draft } from './helpers/reporting.js';

const dialogActionsUrl = await compileSvelteComponent('src/lib/components/DialogActions.svelte');
const dialogUrl = await compileSvelteComponent('src/lib/components/Dialog.svelte', { './DialogActions.svelte': dialogActionsUrl });
const summaryUrl = await compileSvelteComponent('src/lib/reporting/ObstacleReportSummary.svelte', {
  '../components/Dialog.svelte': dialogUrl,
  './obstacle': new URL('../src/lib/reporting/obstacle.js', import.meta.url).href,
  './createDetailsController': new URL('../src/lib/reporting/createDetailsController.js', import.meta.url).href,
});
type SummaryProps = { report: CompleteReport; totalSteps: number; onedit: (step: number) => void; onreports: () => void; onreportanother: () => void; onclose: () => void };
const { default: Summary } = await import(summaryUrl) as { default: Component<SummaryProps> };
const noop = () => {};
function body(values: Partial<DetailsDraft> = {}, totalSteps = 1) {
  const report = completePayload(draft({ type: ObstacleType.Bridge, ...values }));
  assert.ok(report);
  return render(Summary, { props: { report, totalSteps, onedit: noop, onreports: noop, onreportanother: noop, onclose: noop } }).body;
}

test('summary says the report is saved under Reports and not sent', () => {
  const html = body();
  assert.match(html, />Report saved – not sent yet</);
  assert.match(html, /saved as a draft under Reports\. For safety, reports are not sent automatically\./);
  assert.doesNotMatch(html, /Session-only|Not present|>Close</);
  assert.match(html, /<button[^>]*class="button button--primary[^"]*"[^>]*>Go to Reports<\/button>/);
  assert.match(html, /<button[^>]*class="button dialog-action-secondary[^"]*"[^>]*>Report another obstacle<\/button>/);
});

test('every reporting row except the drawn geometry has an edit action', () => {
  const html = body();
  for (const label of ['obstacle type', 'height', 'lighting', 'description', 'photos']) assert.match(html, new RegExp(`aria-label="Edit ${label}"`));
  assert.doesNotMatch(html, /aria-label="Edit geometry"/);
});

test('summary shows canonical values and optional metadata for either reporting view', () => {
  const html = body();
  for (const value of ['Point', 'Bridge', '30 m', 'Unknown', 'Not added']) assert.ok(html.includes(value));
  const other = body({ type: ObstacleType.Other, customType: 'Crane', description: 'Over the taxiway', photos: [new File([], 'crane.jpg')] });
  assert.ok(other.includes('Crane'));
  assert.ok(other.includes('Over the taxiway'));
  assert.ok(other.includes('crane.jpg'));
});

test('description and filenames render as text', () => {
  const html = body({ description: '<script>alert(1)</script>', photos: [new File([], '<img>.jpg')] });
  assert.ok(html.includes('&lt;script>'));
  assert.ok(html.includes('&lt;img>'));
  assert.ok(!html.includes('<script>'));
});
