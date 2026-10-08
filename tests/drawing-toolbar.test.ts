import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import type { Component } from 'svelte';
import { compile } from 'svelte/compiler';
import { render } from 'svelte/server';
import { createDrawingController, idleDrawingState, type DrawingState } from '../src/lib/reporting/createDrawingController.js';
import type { ObstacleGeometryType } from '../src/lib/reporting/obstacle.js';
import { compileSvelteComponent } from './helpers/svelte-server.js';

const filename = pathToFileURL(resolve('src/lib/map/DrawingToolbar.svelte'));
const source = await readFile(filename, 'utf8');
let { js: { code } } = compile(source, { filename: filename.pathname, generate: 'server' });
for (const specifier of ['svelte', 'svelte/internal/server', 'svelte/internal/flags/legacy']) {
  code = code.replaceAll(`'${specifier}'`, JSON.stringify(import.meta.resolve(specifier)));
}
for (const file of ['createDrawingController', 'obstacle']) {
  code = code.replaceAll(`'../reporting/${file}.js'`, JSON.stringify(new URL(`../src/lib/reporting/${file}.js`, import.meta.url).href));
}
code = code.replaceAll("'./GeometryIcon.svelte'", JSON.stringify(await compileSvelteComponent('src/lib/map/GeometryIcon.svelte')));
interface ToolbarProps {
  state: DrawingState;
  onundo: () => void;
  ondelete: () => void;
  oncomplete: () => void;
  crosshairMode?: boolean;
  geometryType?: ObstacleGeometryType;
  onstart?: (type: ObstacleGeometryType) => void;
  onaddpoint?: () => void;
  onresumedetails?: () => void;
}
const { default: DrawingToolbar } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`) as {
  default: Component<ToolbarProps>;
};
const noop = () => {};
const body = (state: DrawingState, props: Partial<ToolbarProps> = {}) => render(DrawingToolbar, {
  props: { state, onundo: noop, ondelete: noop, oncomplete: noop, ...props },
}).body;

test('crosshair idle exposes labeled geometry radios and Report obstacle with Point selected by default', () => {
  const html = body(idleDrawingState, { crosshairMode: true, onstart: noop });
  assert.match(html, /aria-label="Crosshair reporting"/);
  assert.match(html, /<legend[^>]*>Obstacle geometry<\/legend>/);
  for (const type of ['Point', 'LineString', 'Polygon']) {
    assert.match(html, new RegExp(`type="radio"[^>]*value="${type}"`));
  }
  assert.match(html, /value="Point"[^>]*checked/);
  assert.match(html, />Report obstacle<\/button>/);
  assert.doesNotMatch(html, /disabled|Add point|Complete selection|Resume details/);
  const polygon = body(idleDrawingState, { crosshairMode: true, geometryType: 'Polygon', onstart: noop });
  assert.match(polygon, /value="Polygon"[^>]*checked/);
});

test('crosshair drawing exposes Add point and validation; completed selections retain resume without editing', () => {
  const drawing = createDrawingController({ onChange: noop, onComplete: noop });
  drawing.start('LineString', [0, 0]);
  const props = { crosshairMode: true, onaddpoint: noop, onresumedetails: noop };
  const initial = body(drawing.getState(), props);
  assert.match(initial, />Add point<\/button>/);
  assert.match(initial, /at least two distinct points/);
  assert.doesNotMatch(initial, /Report obstacle|type="radio"|Click or tap/);
  drawing.append([0.001, 0]);
  assert.match(body(drawing.getState(), props), /use Add point/);
  drawing.complete();
  const completed = body(drawing.getState(), props);
  assert.match(completed, />Resume details<\/button>/);
  assert.doesNotMatch(completed, /Add point|Undo|Complete selection|Report obstacle/);
  drawing.delete();
  assert.match(body(drawing.getState(), { ...props, onstart: noop }), />Report obstacle<\/button>/);
});

test('idle hides toolbar; initial line shows count, measurement, Delete and disabled Undo/Complete', () => {
  assert.doesNotMatch(body(idleDrawingState), /<section/);
  const drawing = createDrawingController({ onChange: noop, onComplete: noop });
  drawing.start('LineString', [0, 0]);
  const html = body(drawing.getState());
  assert.match(html, />Line<\/strong>/);
  assert.match(html, /1 point placed/);
  assert.match(html, /≈ 0 m/);
  assert.match(html, /<button[^>]*>Delete<\/button>/);
  assert.match(html, /<button[^>]* disabled[^>]*>Undo<\/button>/);
  assert.match(html, /<button[^>]* disabled[^>]*>Complete selection<\/button>/);
});

test('invalid polygon explains disabled completion without displaying a misleading area', () => {
  const drawing = createDrawingController({ onChange: noop, onComplete: noop });
  drawing.start('Polygon', [0, 0]);
  for (const vertex of [[2, 2], [0, 2], [2, 0]] as const) drawing.append(vertex);
  const html = body(drawing.getState());
  assert.match(html, /4 points placed/);
  assert.match(html, /edges must not cross/);
  assert.match(html, /aria-describedby="drawing-guidance"/);
  assert.match(html, /<button[^>]* disabled[^>]*>Complete selection<\/button>/);
  assert.doesNotMatch(html, /m²|≈/);
});

test('valid drawing enables completion; completed summary retains Delete and hides editing commands', () => {
  const drawing = createDrawingController({ onChange: noop, onComplete: noop });
  drawing.start('LineString', [0, 0]);
  drawing.append([0.001, 0]);
  assert.doesNotMatch(body(drawing.getState()), / disabled/);
  drawing.complete();
  const html = body(drawing.getState());
  assert.match(html, /Selection complete/);
  assert.match(html, /2 points placed/);
  assert.match(html, /≈ 111.2 m/);
  assert.match(html, />Delete<\/button>/);
  assert.doesNotMatch(html, /Undo|Complete selection|drawing-guidance/);
});
