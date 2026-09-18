import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { compileSvelteComponent } from './helpers/svelte-server.js';
import { ObstacleType, type Obstacle, type ObstacleGeometry } from '../src/lib/reporting/obstacle.js';
import {
  emptyObstacleReportDraft,
  setObstacleType,
  toggleNotPresent,
  type ObstacleReportDraft,
} from '../src/lib/reporting/obstacleReportDraft.js';

const obstacleModuleUrl = new URL('../src/lib/reporting/obstacle.js', import.meta.url).href;
const draftModuleUrl = new URL('../src/lib/reporting/obstacleReportDraft.js', import.meta.url).href;

const iconUrl = await compileSvelteComponent('src/lib/reporting/ObstacleTypeIcon.svelte', {
  './obstacle': obstacleModuleUrl,
});

const panelUrl = await compileSvelteComponent('src/lib/reporting/ObstacleReportPanel.svelte', {
  './obstacle': obstacleModuleUrl,
  './obstacleReportDraft': draftModuleUrl,
  './ObstacleTypeIcon.svelte': iconUrl,
});

type PanelProps = {
  obstacle: Obstacle;
  draft: ObstacleReportDraft;
  onchange: (draft: ObstacleReportDraft) => void;
  oncancel: () => void;
  onsavedraft: () => void;
  onfinish: () => void;
};

const { default: ObstacleReportPanel } = await import(panelUrl) as { default: Component<PanelProps> };

const noop = () => {};

function obstacleWith(geometry: ObstacleGeometry): Obstacle {
  return {
    id: '1', type: ObstacleType.Other, description: '', height: 0,
    gps_position: null, timestamp: new Date('2026-09-11T08:15:00.000Z'), obstacle_position: geometry,
  };
}

const pointObstacle = obstacleWith({ type: 'Point', coordinates: [5.34, 60.4] });
const lineObstacle = obstacleWith({ type: 'LineString', coordinates: [[5.34, 60.4], [5.35, 60.41]] });
const polygonObstacle = obstacleWith({
  type: 'Polygon',
  coordinates: [[[5.34, 60.4], [5.35, 60.4], [5.35, 60.41], [5.34, 60.4]]],
});

function body(obstacle: Obstacle, draft: ObstacleReportDraft): string {
  return render(ObstacleReportPanel, {
    props: { obstacle, draft, onchange: noop, oncancel: noop, onsavedraft: noop, onfinish: noop },
  }).body;
}

/** Scoped to the Finish report button's own opening tag, so an unrelated disabled
 *  placeholder (Attach/Take photo) earlier in the markup can't produce a false match. */
function finishReportDisabled(html: string): boolean {
  const [, attributes] = html.match(/<button type="button" class="button button--primary[^"]*"([^>]*)>/) ?? [];
  return attributes?.includes('disabled') ?? false;
}

test('header names the report, subtitle counts vertices per geometry, and a cancel button is present', () => {
  assert.match(body(pointObstacle, emptyObstacleReportDraft), />New obstacle report</);
  assert.match(body(pointObstacle, emptyObstacleReportDraft), /Point Geometry · 1 point placed/);
  assert.match(body(lineObstacle, emptyObstacleReportDraft), /Line Geometry · 2 points placed/);
  assert.match(body(polygonObstacle, emptyObstacleReportDraft), /Polygon Geometry · 3 points placed/);
  assert.match(body(pointObstacle, emptyObstacleReportDraft), /aria-label="Cancel report"/);
});

test('all six obstacle-type buttons render and the chosen one is marked pressed', () => {
  const html = body(pointObstacle, setObstacleType(emptyObstacleReportDraft, ObstacleType.Bridge));
  for (const label of ['Aerial Span', 'Pole/Tower', 'Building', 'Construction', 'Bridge', 'Other']) {
    assert.match(html, new RegExp(label));
  }
  assert.match(html, /aria-pressed="true"[^>]*>[\s\S]*?Bridge/);
});

test('choosing Other reveals the free-text field; any other type keeps it hidden', () => {
  assert.match(body(pointObstacle, setObstacleType(emptyObstacleReportDraft, ObstacleType.Other)), /placeholder="Specify type"/);
  assert.doesNotMatch(body(pointObstacle, setObstacleType(emptyObstacleReportDraft, ObstacleType.Bridge)), /placeholder="Specify type"/);
});

test('Finish report starts disabled with no type, and enables once one is chosen', () => {
  assert.match(body(pointObstacle, emptyObstacleReportDraft), /Finish report<\/button>/);
  assert.equal(finishReportDisabled(body(pointObstacle, emptyObstacleReportDraft)), true);
  const withType = setObstacleType(emptyObstacleReportDraft, ObstacleType.Building);
  assert.equal(finishReportDisabled(body(pointObstacle, withType)), false);
});

test('Save draft is never disabled, even on an empty draft', () => {
  assert.doesNotMatch(body(pointObstacle, emptyObstacleReportDraft), /disabled[^>]*>Save draft/);
});

test('Not present relabels height as optional, greys out the picker, and shows the warning note', () => {
  const draft = toggleNotPresent(emptyObstacleReportDraft);
  const html = body(pointObstacle, draft);
  assert.match(html, /Obstacle Height \(optional\)/);
  assert.match(html, /aria-disabled="true"/);
  assert.match(html, /This obstacle no longer exists in reality\./);
  assert.doesNotMatch(body(pointObstacle, emptyObstacleReportDraft), /This obstacle no longer exists in reality\./);
});

test('lighting label and state follow the three-stage cycle', () => {
  assert.match(body(pointObstacle, emptyObstacleReportDraft), /data-state="unknown"[\s\S]*?Lighting unknown/);
  assert.match(body(pointObstacle, { ...emptyObstacleReportDraft, lighting: 'lit' }), /data-state="lit"[\s\S]*?>Lighting</);
  assert.match(body(pointObstacle, { ...emptyObstacleReportDraft, lighting: 'none' }), /data-state="none"[\s\S]*?No lighting/);
});

test('description textarea only renders once its toggle is enabled, carrying the current text', () => {
  assert.doesNotMatch(body(pointObstacle, emptyObstacleReportDraft), /<textarea/);
  const draft = { ...emptyObstacleReportDraft, descriptionEnabled: true, description: 'Crane boom over the taxiway' };
  const html = body(pointObstacle, draft);
  assert.match(html, /<textarea/);
  assert.match(html, /Crane boom over the taxiway/);
});
