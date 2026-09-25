import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { compileSvelteComponent } from './helpers/svelte-server.js';
import { ObstacleType, type Obstacle, type ObstacleGeometry } from '../src/lib/reporting/obstacle.js';
import type { DetailsDraft } from '../src/lib/reporting/createDetailsController.js';
import type { ReportingVariantProps } from '../src/lib/reporting/reportingVariantProps.js';
import { draft as makeDraft, viewProps } from './helpers/reporting.js';
const emptyDetailsDraft = makeDraft();
const setObstacleType = (draft: DetailsDraft, type: ObstacleType): DetailsDraft => ({ ...draft, type });
const toggleNotPresent = (draft: DetailsDraft): DetailsDraft => ({ ...draft, notPresent: !draft.notPresent });

const obstacleModuleUrl = new URL('../src/lib/reporting/obstacle.js', import.meta.url).href;
const draftModuleUrl = new URL('../src/lib/reporting/obstacleReportDraft.js', import.meta.url).href;

const iconUrl = await compileSvelteComponent('src/lib/reporting/ObstacleTypeIcon.svelte', {
  './obstacle': obstacleModuleUrl,
});

const keypad = await compileSvelteComponent('src/lib/reporting/HeightKeypad.svelte');
const panelUrl = await compileSvelteComponent('src/lib/reporting/ObstacleReportPanel.svelte', {
  './obstacle': obstacleModuleUrl,
  './HeightKeypad.svelte': keypad,
  './obstacleReportDraft': draftModuleUrl,
  './ObstacleTypeIcon.svelte': iconUrl,
  './createDetailsController': new URL('../src/lib/reporting/createDetailsController.js', import.meta.url).href,
  './reporting': new URL('../src/lib/reporting/reporting.js', import.meta.url).href,
  './createHeightPickerController': new URL('../src/lib/reporting/createHeightPickerController.js', import.meta.url).href,
});

type PanelProps = ReportingVariantProps;

const { default: ObstacleReportPanel } = await import(panelUrl) as { default: Component<PanelProps> };

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

function body(obstacle: Obstacle, draft: DetailsDraft): string {
  return render(ObstacleReportPanel, {
    props: viewProps({ ...draft, report: obstacle }),
  }).body;
}

/** Scoped to the Finish report button's own opening tag, so an unrelated disabled
 *  placeholder (Attach/Take photo) earlier in the markup can't produce a false match. */
function finishReportDisabled(html: string): boolean {
  const [, attributes] = html.match(/<button type="button" class="button button--primary[^"]*"([^>]*)>/) ?? [];
  return attributes?.includes('disabled') ?? false;
}

test('header names the report, subtitle counts vertices per geometry, and a cancel button is present', () => {
  assert.match(body(pointObstacle, emptyDetailsDraft), />New obstacle report</);
  assert.match(body(pointObstacle, emptyDetailsDraft), /Point Geometry · 1 point placed/);
  assert.match(body(lineObstacle, emptyDetailsDraft), /Line Geometry · 2 points placed/);
  assert.match(body(polygonObstacle, emptyDetailsDraft), /Polygon Geometry · 3 points placed/);
  assert.match(body(pointObstacle, emptyDetailsDraft), /aria-label="Close report"/);
});

test('all six obstacle-type buttons render and the chosen one is marked pressed', () => {
  const html = body(pointObstacle, setObstacleType(emptyDetailsDraft, ObstacleType.Bridge));
  for (const label of ['Aerial Span', 'Pole/Tower', 'Building', 'Construction', 'Bridge', 'Other']) {
    assert.match(html, new RegExp(label));
  }
  assert.match(html, /aria-pressed="true"[^>]*>[\s\S]*?Bridge/);
});

test('choosing Other reveals the free-text field; any other type keeps it hidden', () => {
  assert.match(body(pointObstacle, setObstacleType(emptyDetailsDraft, ObstacleType.Other)), /placeholder="Specify type"/);
  assert.doesNotMatch(body(pointObstacle, setObstacleType(emptyDetailsDraft, ObstacleType.Bridge)), /placeholder="Specify type"/);
});

test('Finish report starts disabled with no type, and enables once one is chosen', () => {
  assert.match(body(pointObstacle, emptyDetailsDraft), /Finish report<\/button>/);
  assert.equal(finishReportDisabled(body(pointObstacle, emptyDetailsDraft)), true);
  const withType = setObstacleType(emptyDetailsDraft, ObstacleType.Building);
  assert.equal(finishReportDisabled(body(pointObstacle, withType)), false);
});

test('Save draft is never disabled, even on an empty draft', () => {
  assert.doesNotMatch(body(pointObstacle, emptyDetailsDraft), /disabled[^>]*>Save draft/);
});

test('Not present relabels required height as disabled, greys out the picker, and shows the warning note', () => {
  const draft = toggleNotPresent(emptyDetailsDraft);
  const html = body(pointObstacle, draft);
  assert.match(html, /Obstacle Height - Disabled/);
  assert.match(html, /aria-disabled="true"/);
  assert.match(html, /This obstacle no longer exists in reality\./);
  assert.match(body(pointObstacle, emptyDetailsDraft), /Obstacle Height - Required/);
  assert.doesNotMatch(body(pointObstacle, emptyDetailsDraft), /This obstacle no longer exists in reality\./);
});

test('lighting label and state follow the three-stage cycle', () => {
  assert.match(body(pointObstacle, emptyDetailsDraft), /data-state="unknown"[\s\S]*?Lighting unknown/);
  assert.match(body(pointObstacle, { ...emptyDetailsDraft, illumination: 'illuminated' }), /data-state="illuminated"[\s\S]*?>Lighting</);
  assert.match(body(pointObstacle, { ...emptyDetailsDraft, illumination: 'not-illuminated' }), /data-state="not-illuminated"[\s\S]*?No lighting/);
});

test('the numeric height keypad is not rendered until requested', () => {
  assert.doesNotMatch(body(pointObstacle, emptyDetailsDraft), /height-keypad/);
});

test('description textarea only renders once its toggle is enabled, carrying the current text', () => {
  assert.doesNotMatch(body(pointObstacle, emptyDetailsDraft), /<textarea/);
  const draft = { ...emptyDetailsDraft, description: 'Crane boom over the taxiway' };
  const html = body(pointObstacle, draft);
  assert.match(html, /<textarea/);
  assert.match(html, /Crane boom over the taxiway/);
});

test('photo attachment and camera controls are connected, files can be removed, and errors are announced', () => {
  const props = viewProps(makeDraft({ photos: [new File(['image'], 'crane.jpg')] }), { error: 'Choose up to 2 more photos.' });
  const html = render(ObstacleReportPanel, { props }).body;
  assert.ok(html.includes('type="file" accept="image/*" multiple'));
  assert.match(html, /capture="environment"/);
  assert.match(html, /Remove photo 1: crane.jpg/);
  assert.match(html, /role="alert"[^>]*>Choose up to 2 more photos/);
});

test('busy state blocks Finish and Save; not-present blocks height and illumination', () => {
  const html = render(ObstacleReportPanel, { props: viewProps(makeDraft({ type: ObstacleType.Pole }), { busy: true }) }).body;
  assert.equal(finishReportDisabled(html), true);
  assert.match(html, /disabled[^>]*>Save draft/);
  const absent = body(pointObstacle, makeDraft({ notPresent: true }));
  assert.match(absent, /data-state="unknown" disabled/);
});
