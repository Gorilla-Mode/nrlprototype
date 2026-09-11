import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import type { Component } from 'svelte';
import { compile } from 'svelte/compiler';
import { render } from 'svelte/server';
import { createDrawingController, idleDrawingState, type DrawingState } from '../src/lib/reporting/createDrawingController.js';

const filename = pathToFileURL(resolve('src/lib/map/DrawingToolbar.svelte'));
const source = await readFile(filename, 'utf8');
let { js: { code } } = compile(source, { filename: filename.pathname, generate: 'server' });
for (const specifier of ['svelte/internal/server', 'svelte/internal/flags/legacy']) {
  code = code.replaceAll(`'${specifier}'`, JSON.stringify(import.meta.resolve(specifier)));
}
for (const file of ['createDrawingController', 'obstacle']) {
  code = code.replaceAll(`'../reporting/${file}.js'`, JSON.stringify(new URL(`../src/lib/reporting/${file}.js`, import.meta.url).href));
}
const { default: DrawingToolbar } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`) as {
  default: Component<{ state: DrawingState; onundo: () => void; ondelete: () => void; oncomplete: () => void }>;
};
const noop = () => {};
const body = (state: DrawingState) => render(DrawingToolbar, { props: { state, onundo: noop, ondelete: noop, oncomplete: noop } }).body;

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
