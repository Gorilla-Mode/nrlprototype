import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { compileSvelteComponent } from './helpers/svelte-server.js';
import { ObstacleType, type Obstacle } from '../src/lib/reporting/obstacle.js';
import { emptyObstacleReportDraft, setObstacleType, toggleNotPresent, type ObstacleReportDraft } from '../src/lib/reporting/obstacleReportDraft.js';

const obstacleModuleUrl = new URL('../src/lib/reporting/obstacle.js', import.meta.url).href;
const draftModuleUrl = new URL('../src/lib/reporting/obstacleReportDraft.js', import.meta.url).href;

const summaryUrl = await compileSvelteComponent('src/lib/reporting/ObstacleReportSummary.svelte', {
  './obstacle': obstacleModuleUrl,
  './obstacleReportDraft': draftModuleUrl,
});

type SummaryProps = {
  obstacle: Obstacle;
  draft: ObstacleReportDraft;
  mode: 'draft' | 'finished';
  onclose: () => void;
};

const { default: ObstacleReportSummary } = await import(summaryUrl) as { default: Component<SummaryProps> };

const noop = () => {};

const obstacle: Obstacle = {
  id: '1', type: ObstacleType.Other, description: '', height: 0,
  gps_position: null, timestamp: new Date('2026-09-11T08:15:00.000Z'),
  obstacle_position: { type: 'Point', coordinates: [5.34, 60.4] },
};

function body(draft: ObstacleReportDraft, mode: 'draft' | 'finished' = 'finished'): string {
  return render(ObstacleReportSummary, { props: { obstacle, draft, mode, onclose: noop } }).body;
}

test('heading reflects save-draft vs finish-report, with a prototype disclaimer', () => {
  assert.match(body(emptyObstacleReportDraft, 'draft'), />Draft saved</);
  assert.match(body(emptyObstacleReportDraft, 'finished'), />Report completed</);
  assert.match(body(emptyObstacleReportDraft), /Prototype summary — not sent anywhere yet\./);
});

test('lists every filled category with its value, including a custom Other label', () => {
  const draft = setObstacleType(emptyObstacleReportDraft, ObstacleType.Bridge);
  const html = body(draft);
  assert.match(html, /Geometry<\/th><td[^>]*>Point/);
  assert.match(html, /Obstacle type<\/th><td[^>]*>Bridge/);
  assert.match(html, /Height<\/th><td[^>]*>10 m/);
  assert.match(html, /Lighting<\/th><td[^>]*>Unknown/);
  assert.match(html, /Description<\/th><td[^>]*>Not added/);
  assert.match(html, /Not present<\/th><td[^>]*>No/);

  const other = { ...setObstacleType(emptyObstacleReportDraft, ObstacleType.Other), otherTypeLabel: 'Crane' };
  assert.match(body(other), /Obstacle type<\/th><td[^>]*>Crane/);
});

test('not present hides the height value even though the draft still carries a default height', () => {
  const draft = toggleNotPresent(setObstacleType(emptyObstacleReportDraft, ObstacleType.Building));
  assert.match(body(draft), /Height<\/th><td[^>]*>—/);
  assert.match(body(draft), /Not present<\/th><td[^>]*>Yes/);
});

test('an enabled description with typed text is shown verbatim', () => {
  const draft = { ...emptyObstacleReportDraft, descriptionEnabled: true, description: 'Crane boom over the taxiway' };
  assert.match(body(draft), /Description<\/th><td[^>]*>Crane boom over the taxiway/);
});
