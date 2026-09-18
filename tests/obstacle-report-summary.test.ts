import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { compileSvelteComponent } from './helpers/svelte-server.js';
import { ObstacleType } from '../src/lib/reporting/obstacle.js';
import { detailsPayload, type CompleteReport, type DetailsDraft } from '../src/lib/reporting/createDetailsController.js';
import { draft } from './helpers/reporting.js';

const summaryUrl = await compileSvelteComponent('src/lib/reporting/ObstacleReportSummary.svelte', {
  './obstacle': new URL('../src/lib/reporting/obstacle.js', import.meta.url).href,
  './createDetailsController': new URL('../src/lib/reporting/createDetailsController.js', import.meta.url).href,
});
const { default: Summary } = await import(summaryUrl) as { default: Component<{ report: CompleteReport; onclose: () => void }> };
function body(values: Partial<DetailsDraft> = {}) {
  const value = draft({ type: ObstacleType.Bridge, ...values });
  const report: CompleteReport = { ...detailsPayload(value), type: value.type ?? ObstacleType.Other };
  return render(Summary, { props: { report, onclose: () => {} } }).body;
}

test('shared completion summary clearly describes its session-only lifecycle', () => {
  assert.match(body(), />Report completed</);
  assert.match(body(), /Session-only summary — not saved or submitted/);
  assert.doesNotMatch(body(), /Draft saved/);
});

test('summary shows canonical values and optional metadata for either reporting view', () => {
  const html = body();
  for (const value of ['Point', 'Bridge', '30 m', 'Unknown', 'Not added']) assert.ok(html.includes(value));
  const other = body({ type: ObstacleType.Other, customType: 'Crane', description: 'Over the taxiway', photos: [new File([], 'crane.jpg')] });
  assert.ok(other.includes('Crane'));
  assert.ok(other.includes('Over the taxiway'));
  assert.ok(other.includes('crane.jpg'));
});

test('absent obstacles omit height and illumination even when the draft retained values', () => {
  const html = body({ notPresent: true, height: 123, illumination: 'illuminated' });
  assert.doesNotMatch(html, /123 m|Illuminated/);
  assert.match(html, new RegExp('Height</th><td[^>]*>—'));
  assert.match(html, new RegExp('Lighting</th><td[^>]*>—'));
});

test('description and filenames render as text', () => {
  const html = body({ description: '<script>alert(1)</script>', photos: [new File([], '<img>.jpg')] });
  assert.ok(html.includes('&lt;script>'));
  assert.ok(html.includes('&lt;img>'));
  assert.ok(!html.includes('<script>'));
});
