import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import type { Component } from 'svelte';
import { compile } from 'svelte/compiler';
import { render } from 'svelte/server';
import { createDrawingController, idleDrawingState, type DrawingState } from '../src/lib/reporting/createDrawingController.js';
import type { PlacementEditingVariantId } from '../src/lib/map/placementEditing.js';
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
  placementEditing?: PlacementEditingVariantId;
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
const buttonLabels = (html: string) => [...html.matchAll(/<button\b[^>]*>([^<]+)<\/button>/g)].map((match) => match[1]);

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
  assert.deepEqual(buttonLabels(initial), ['Undo', 'Delete', 'Complete', 'Add point']);
  assert.match(initial, /<button[^>]*class="button button--primary complete[^>]*>Add point<\/button>/);
  assert.match(initial, /<button[^>]*class="button button--primary[^>]*>Complete<\/button>/);
  assert.match(initial, /<button[^>]*class="button button--danger delete[^>]*>Delete<\/button>/);
  assert.match(initial, /<button[^>]* disabled[^>]*>Undo<\/button>/);
  assert.match(initial, /<button[^>]* disabled[^>]*>Complete<\/button>/);
  assert.ok(initial.indexOf('>Complete</button>') < initial.indexOf('1 point placed'));
  assert.ok(initial.indexOf('1 point placed') < initial.indexOf('>Add point</button>'));
  assert.match(initial, /at least two distinct points/);
  assert.doesNotMatch(initial, /Report obstacle|type="radio"|aria-pressed|aria-checked|Click or tap/);
  assert.match(body(drawing.getState(), { crosshairMode: true }), /<button[^>]* disabled[^>]*>Add point<\/button>/);
  drawing.append([0.001, 0]);
  const valid = body(drawing.getState(), props);
  assert.match(valid, /use Add point/);
  assert.doesNotMatch(valid, / disabled/);
  assert.match(valid, /≈ 111.2 m/);
  drawing.undo();
  assert.match(body(drawing.getState(), props), /<button[^>]* disabled[^>]*>Undo<\/button>/);
  drawing.append([0.001, 0]);
  drawing.complete();
  const completed = body(drawing.getState(), props);
  assert.deepEqual(buttonLabels(completed), ['Delete', 'Resume details']);
  assert.doesNotMatch(completed, /Add point|Undo|Complete selection|Report obstacle/);
  drawing.delete();
  assert.match(body(drawing.getState(), { ...props, onstart: noop }), />Report obstacle<\/button>/);
});

test('crosshair polygon keeps validation between commands and Add point when edges cross', () => {
  const drawing = createDrawingController({ onChange: noop, onComplete: noop });
  drawing.start('Polygon', [0, 0]);
  for (const vertex of [[2, 2], [0, 2], [2, 0]] as const) drawing.append(vertex);
  const html = body(drawing.getState(), { crosshairMode: true, onaddpoint: noop });
  assert.deepEqual(buttonLabels(html), ['Undo', 'Delete', 'Complete', 'Add point']);
  assert.match(html, /<button[^>]* disabled[^>]*aria-describedby="drawing-guidance"[^>]*>Complete<\/button>/);
  assert.match(html, /4 points placed/);
  assert.match(html, /edges must not cross/);
  assert.ok(html.indexOf('>Complete</button>') < html.indexOf('edges must not cross'));
  assert.ok(html.indexOf('edges must not cross') < html.indexOf('>Add point</button>'));
  assert.doesNotMatch(html, /m²|≈/);
  drawing.undo();
  assert.doesNotMatch(body(drawing.getState(), { crosshairMode: true, onaddpoint: noop }), / disabled/);
});

test('switching input modes retains the summary and restores ordinary drawing commands', () => {
  const drawing = createDrawingController({ onChange: noop, onComplete: noop });
  drawing.start('LineString', [0, 0]);
  drawing.append([0.001, 0]);
  for (const crosshairMode of [true, false, true]) {
    const html = body(drawing.getState(), { crosshairMode, onaddpoint: noop });
    assert.deepEqual(buttonLabels(html), crosshairMode
      ? ['Undo', 'Delete', 'Complete', 'Add point']
      : ['Delete', 'Undo', 'Complete selection']);
    assert.match(html, /2 points placed/);
    assert.match(html, /≈ 111.2 m/);
    assert.doesNotMatch(html, / disabled/);
  }
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


test('Basic Point exposes confirmation, omits Add point, and enables Undo after moving the initial vertex', () => {
  const drawing = createDrawingController({ vertexEditing: true, deferPointCompletion: true, onChange: noop, onComplete: noop });
  drawing.start('Point', [0, 0]);
  const props = { placementEditing: 'basic' as const, crosshairMode: true, onaddpoint: noop };
  const initial = body(drawing.getState(), props);
  assert.doesNotMatch(initial, />Add point<\/button>/);
  assert.match(initial, /Complete to open the report form/);
  assert.match(initial, /Hold placed points/);
  drawing.beginVertexMove(0); drawing.updateVertexMove([1, 1]); drawing.commitVertexMove();
  const moved = body(drawing.getState(), props);
  assert.match(moved, /<button[^>]*>Undo<\/button>/);
  assert.doesNotMatch(moved, /<button[^>]* disabled[^>]*>Undo<\/button>/);
  assert.match(body(drawing.getState(), { placementEditing: 'two-finger' }), /Drag placed points to edit/);
});
