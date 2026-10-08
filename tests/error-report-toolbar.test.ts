import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { compileSvelteComponent } from './helpers/svelte-server.js';
import { idleDrawingState, type DrawingState } from '../src/lib/reporting/createDrawingController.js';
import type { RegisteredObstacle } from '../src/lib/obstacles/registeredObstacles.js';

const noop = () => {};
const match: RegisteredObstacle = { id: 'one', name: 'Test mast', type: 'Mast', heightM: 40, lit: true, lat: 60, lng: 5 };
const { default: ErrorReportToolbar } = await import(await compileSvelteComponent('src/lib/map/ErrorReportToolbar.svelte')) as {
  default: Component<{ crosshairMode?: boolean; placed: boolean; match: RegisteredObstacle | null; oncancel: () => void; onselect: () => void }>;
};
const { default: PositionCorrectionToolbar } = await import(await compileSvelteComponent('src/lib/map/PositionCorrectionToolbar.svelte', {
  '../obstacles/errorReport': new URL('../src/lib/obstacles/errorReport.js', import.meta.url).href,
})) as { default: Component<{
  crosshairMode?: boolean; newPosition: { lat: number; lng: number } | null; registered: { lat: number; lng: number };
  move: { distance: string; direction: string } | null; canConfirm: boolean; editing: boolean;
  oncancel: () => void; onconfirm: () => void; onunknown: () => void; onremove: () => void;
}> };

const geometryIcon = await compileSvelteComponent('src/lib/map/GeometryIcon.svelte');
const drawingToolbar = await compileSvelteComponent('src/lib/map/DrawingToolbar.svelte', {
  './GeometryIcon.svelte': geometryIcon,
  '../reporting/createDrawingController.js': new URL('../src/lib/reporting/createDrawingController.js', import.meta.url).href,
  '../reporting/obstacle.js': new URL('../src/lib/reporting/obstacle.js', import.meta.url).href,
});
const searchBar = await compileSvelteComponent('src/lib/map/SearchBar.svelte', {
  './createLocationSearchController.js': new URL('../src/lib/map/createLocationSearchController.js', import.meta.url).href,
});
const { default: MapToolbar } = await import(await compileSvelteComponent('src/lib/map/MapToolbar.svelte', {
  './DrawingToolbar.svelte': drawingToolbar,
  './MapButton.svelte': await compileSvelteComponent('src/lib/map/MapButton.svelte'),
  './SearchBar.svelte': searchBar,
})) as { default: Component<{
  drawing: DrawingState; crosshairMode: boolean; showSelectionControls: boolean; selectionControlsCovered?: boolean;
  menuOpen: boolean; helpOpen: boolean; onstart: () => void; onaddpoint: () => void; onundo: () => void;
  ondelete: () => void; oncomplete: () => void; onmenu: () => void; onreports: () => void; onhelp: () => void; onsearchselect: () => void;
}> };

function errorToolbar(crosshairMode: boolean, obstacle: RegisteredObstacle | null, placed = false) {
  return render(ErrorReportToolbar, { props: { crosshairMode, placed, match: obstacle, oncancel: noop, onselect: noop } }).body;
}

test('crosshair error toolbar exposes the matched identity and Report error without geometry controls', () => {
  const html = errorToolbar(true, match);
  assert.match(html, /Test mast \(40 m\)/);
  assert.match(html, /data-report-error[^>]*>Report error<\/button>/);
  assert.doesNotMatch(html, /disabled|type="radio"|Report obstacle|Hold the map/);
  const empty = errorToolbar(true, null);
  assert.match(empty, /No registered obstacle within the crosshair/);
  assert.match(empty, /data-report-error[^>]*disabled[^>]*>Report error<\/button>/);
});

test('circle error toolbar retains hold guidance, selection identity and disabled no-match state', () => {
  assert.match(errorToolbar(false, null), /Hold the map to place the circle/);
  assert.match(errorToolbar(false, null), /data-report-error[^>]*disabled[^>]*>Select<\/button>/);
  assert.match(errorToolbar(false, null, true), /No registered obstacles here/);
  assert.match(errorToolbar(false, match, true), />Select Test mast \(40 m\)<\/button>/);
});

test('error reporting removes the geometry workflow while preserving map navigation controls', () => {
  const props = { drawing: idleDrawingState, crosshairMode: true, showSelectionControls: false, menuOpen: false, helpOpen: false,
    onstart: noop, onaddpoint: noop, onundo: noop, ondelete: noop, oncomplete: noop, onmenu: noop, onreports: noop, onhelp: noop, onsearchselect: noop };
  const html = render(MapToolbar, { props }).body;
  assert.doesNotMatch(html, /type="radio"|Report obstacle|drawing-toolbar/);
  assert.match(html, /aria-label="Menu"/);
  assert.match(html, /aria-label="Reports"/);
  const normal = render(MapToolbar, { props: { ...props, showSelectionControls: true, selectionControlsCovered: true } }).body;
  assert.match(normal, /type="radio"/);
  assert.match(normal, />Report obstacle<\/button>/);
  assert.match(normal, /<div(?=[^>]*\binert)(?=[^>]*class="[^"]*\bcovered\b)[^>]*>/);
});

test('position guidance follows the input mode while preserving validation and correction alternatives', () => {
  const props = { newPosition: null, registered: match, move: null, canConfirm: false, editing: true,
    oncancel: noop, onconfirm: noop, onunknown: noop, onremove: noop };
  const crosshair = render(PositionCorrectionToolbar, { props: { ...props, crosshairMode: true } }).body;
  assert.match(crosshair, /Aim the crosshair at the correct position/);
  assert.match(crosshair, /Move the map to where the obstacle actually is/);
  assert.match(crosshair, /disabled[^>]*>Confirm position<\/button>/);
  assert.match(crosshair, /Remove “Wrong position”/);
  assert.match(crosshair, /I don't know the exact position/);
  const circle = render(PositionCorrectionToolbar, { props }).body;
  assert.match(circle, /Move the circle to the correct position/);
  assert.match(circle, /Drag the circle to where the obstacle actually is/);
});
