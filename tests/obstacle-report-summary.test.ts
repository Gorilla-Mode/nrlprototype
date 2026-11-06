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
  // The location editor renders only after its pencil is pressed, which SSR cannot do.
  '../map/LocationEditor.svelte': 'data:text/javascript,export default function LocationEditor() {}',
  './obstacle': new URL('../src/lib/reporting/obstacle.js', import.meta.url).href,
  './createDetailsController': new URL('../src/lib/reporting/createDetailsController.js', import.meta.url).href,
});
type SummaryProps = { report: CompleteReport; totalSteps: number; onedit: (step: number) => void; ongeometry: () => void; onreports: () => void; onreportanother: () => void; onclose: () => void };
const { default: Summary } = await import(summaryUrl) as { default: Component<SummaryProps> };
const noop = () => {};
function body(values: Partial<DetailsDraft> = {}, totalSteps = 1) {
  const report = completePayload(draft({ type: ObstacleType.Bridge, ...values }));
  assert.ok(report);
  return render(Summary, { props: { report, totalSteps, onedit: noop, ongeometry: noop, onreports: noop, onreportanother: noop, onclose: noop } }).body;
}

test('summary says the report is a draft that needs security approval in Reports', () => {
  const html = body();
  assert.match(html, />Report saved – not sent yet</);
  assert.match(html, /Your report is saved as a draft\. To send it, open it in Reports and complete the security approval\./);
  assert.doesNotMatch(html, /Session-only|Not present|>Close<|Go to Reports/);
});

test('actions are stacked in full width, Review and send above Report another obstacle', () => {
  const html = body();
  assert.match(html, /class="dialog-actions[^"]*stacked/);
  assert.match(html, /<button[^>]*class="button button--primary summary-action[^"]*"[^>]*>Review and send<\/button>[\s\S]*<button[^>]*class="button dialog-action-secondary summary-action[^"]*"[^>]*>Report another obstacle<\/button>/);
});

test('every row, including the drawn geometry, has an edit action', () => {
  const html = body();
  for (const label of ['geometry', 'obstacle type', 'height', 'lighting', 'description', 'photos']) assert.match(html, new RegExp(`aria-label="Edit ${label}"`));
  assert.match(html, /aria-label="Edit geometry" aria-haspopup="dialog"/);
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
