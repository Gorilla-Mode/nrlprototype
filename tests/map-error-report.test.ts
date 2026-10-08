import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import type { Map as MapLibreMap, EaseToOptions } from 'maplibre-gl';
import { createMapErrorReportController, type ErrorReportTarget } from '../src/lib/map/createMapErrorReportController.js';
import type { RegisteredObstacle } from '../src/lib/obstacles/registeredObstacles.js';
import type { GeographicVertex } from '../src/lib/reporting/obstacle.js';

const obstacle = (id: string, lng = 2, lat = 3): RegisteredObstacle =>
  ({ id, type: 'Mast', heightM: 40, lit: false, lng, lat });

function setup(t: TestContext) {
  const viewport = { width: 400, height: 600, inert: false };
  const events = new EventTarget();
  const padding = { left: 0, right: 0, top: 0, bottom: 0 };
  const map = {
    camera: [2, 3] as GeographicVertex,
    stops: 0,
    afterStop: () => {},
    getCanvas: () => ({
      closest: () => viewport.inert ? {} : null,
      getBoundingClientRect: () => viewport,
    }),
    getPadding: () => padding,
    project(vertex: number[]) {
      return { x: viewport.width / 2 + (vertex[0] - this.camera[0]) * 100,
        y: viewport.height / 2 + (vertex[1] - this.camera[1]) * 100 };
    },
    unproject([x, y]: number[]) {
      return { lng: this.camera[0] + (x - viewport.width / 2) / 100,
        lat: this.camera[1] + (y - viewport.height / 2) / 100 };
    },
    stop() { this.stops++; this.afterStop(); },
    easeTo(options: EaseToOptions) {
      assert.ok(Array.isArray(options.center));
      assert.ok(Array.isArray(options.offset));
      const [lng, lat] = options.center;
      const [x, y] = options.offset;
      this.camera = [lng + ((padding.right - padding.left) / 2 - x) / 100,
        lat + ((padding.bottom - padding.top) / 2 - y) / 100];
      events.dispatchEvent(new Event('move'));
    },
    on: events.addEventListener.bind(events),
    off: events.removeEventListener.bind(events),
  };
  const updates: ErrorReportTarget[] = [];
  const highlights: (string | null)[] = [];
  const shownObstacles: (readonly RegisteredObstacle[] | null)[] = [];
  const corrections: { origin: GeographicVertex | null; target: GeographicVertex | null }[] = [];
  const gestures: { correcting: boolean; crosshair: boolean }[] = [];
  let cameraChanges = 0;
  const controller = createMapErrorReportController(map as unknown as MapLibreMap, {
    onChange: (target) => updates.push(target),
    onObstaclesChange: (obstacles, id) => { shownObstacles.push(obstacles); highlights.push(id); },
    onCorrectionChange: (origin, target) => corrections.push({ origin, target }),
    onGesturesChange: (correcting, crosshair) => gestures.push({ correcting, crosshair }),
    onCameraChange: () => { cameraChanges++; },
  });
  t.after(() => controller.destroy());
  return { map, viewport, padding, controller, updates, highlights, shownObstacles, corrections, gestures,
    cameraChanges: () => cameraChanges, fire: (name = 'move') => events.dispatchEvent(new Event(name)) };
}

function aim(h: ReturnType<typeof setup>) {
  h.controller.setCrosshairSize(64);
  h.controller.setCrosshairMode(true);
  h.controller.setHoldMode('error-report');
}

test('crosshair picks and highlights the nearest obstacle within its measured radius, including the boundary', (t) => {
  const h = setup(t);
  aim(h);
  assert.equal(h.controller.sample().match, null, 'data has not arrived yet');
  const first = obstacle('first', 2.25);
  h.controller.setRegisteredObstacles([obstacle('far', 2.3), first, obstacle('tie', 1.75), obstacle('outside', 2.4)]);
  assert.equal(h.updates.at(-1)?.match?.id, 'first');
  assert.equal(h.highlights.at(-1), 'first');
  h.controller.setRegisteredObstacles([obstacle('edge', 2.32), obstacle('beyond', 2.3201)]);
  assert.equal(h.controller.sample().match?.id, 'edge');
  h.controller.setRegisteredObstacles([obstacle('beyond', 2.3201)]);
  assert.equal(h.controller.sample().match, null);
  h.controller.setCrosshairSize(96);
  assert.equal(h.updates.at(-1)?.match?.id, 'beyond', 'radius follows rendered size');
  h.controller.setCrosshairSize(0);
  assert.equal(h.updates.at(-1)?.match, null, 'an unmeasured crosshair cannot select');
});

test('camera movement and resize refresh targeting; activation stops and resamples instead of using a stale highlight', (t) => {
  const h = setup(t);
  aim(h);
  h.controller.setRegisteredObstacles([obstacle('old'), obstacle('current', 4, 5)]);
  const old = h.controller.sample();
  assert.equal(old.match?.id, 'old');
  h.map.camera = [4, 5];
  h.fire();
  assert.equal(h.highlights.at(-1), 'current');
  h.viewport.width = 834;
  h.viewport.height = 1194;
  h.fire('resize');
  assert.deepEqual(h.updates.at(-1)?.center, { x: 417, y: 597 });
  h.map.afterStop = () => { h.map.camera = [2, 3]; };
  assert.equal(h.controller.sample().match?.id, 'old');
  assert.deepEqual(old.position, [2, 3], 'delivered snapshots remain unchanged');
  assert.ok(h.map.stops > 0);
});

test('circle input retains its wider radius; closing error reporting retains the crosshair preference', (t) => {
  const h = setup(t);
  h.controller.setHoldMode('error-report');
  h.controller.setRegisteredObstacles([obstacle('circle', 3)]);
  h.controller.placeCircle([2, 3]);
  assert.equal(h.controller.sample().match?.id, 'circle', 'inside the 112 px circle radius');
  h.controller.setCrosshairSize(64);
  h.controller.setCrosshairMode(true);
  assert.equal(h.controller.sample().match, null, 'outside the narrower crosshair radius');
  h.map.camera = [4, 5];
  h.controller.setCrosshairMode(false);
  assert.deepEqual(h.controller.sample(), { center: null, match: null, position: null });
  h.controller.placeCircle([4, 5]);
  h.map.camera = [5, 6];
  h.fire();
  assert.deepEqual(h.controller.sample().position, [4, 5], 'circle is geographically anchored');
  h.controller.setCrosshairMode(true);
  h.controller.setHoldMode('obstacle');
  assert.equal(h.controller.sample().position, null);
  h.map.camera = [6, 7];
  h.controller.setHoldMode('error-report');
  assert.deepEqual(h.controller.sample().position, [6, 7], 'closing error reporting retains crosshair input');
});

test('disabling crosshair clears ordinary targeting until a new hold, including a previously placed circle', (t) => {
  for (const previouslyPlaced of [false, true]) {
    const h = setup(t);
    h.controller.setHoldMode('error-report');
    if (previouslyPlaced) h.controller.placeCircle([2, 3]);
    aim(h);
    h.controller.setRegisteredObstacles([obstacle('target', 4, 5)]);
    h.map.camera = [4, 5];
    h.fire();
    assert.equal(h.controller.sample().match?.id, 'target');
    h.controller.setCrosshairMode(false);
    const empty = { center: null, match: null, position: null };
    assert.deepEqual(h.updates.at(-1), empty);
    assert.equal(h.highlights.at(-1), null);
    h.map.camera = [5, 6];
    h.fire();
    assert.deepEqual(h.updates.at(-1), empty);
    h.viewport.width = 834;
    h.viewport.height = 1194;
    h.fire('resize');
    assert.deepEqual(h.updates.at(-1), empty);
    h.controller.setRegisteredObstacles([obstacle('new', 5, 6)]);
    assert.deepEqual(h.updates.at(-1), empty);
    h.controller.setCrosshairSize(96);
    h.controller.setBottomInset(200);
    assert.deepEqual(h.controller.sync(), empty);
    assert.deepEqual(h.controller.sample(), empty);
    h.controller.setCrosshairMode(false);
    assert.deepEqual(h.updates.at(-1), empty);
    h.controller.placeCircle([5, 6]);
    assert.deepEqual(h.controller.sample().center, { x: 417, y: 597 });
    assert.equal(h.controller.sample().match?.id, 'new');
    assert.deepEqual(h.controller.sample().position, [5, 6]);
  }
});

test('crosshair correction centers the initial candidate despite padding, tracks movement and resamples confirmation', (t) => {
  const h = setup(t);
  aim(h);
  h.padding.left = 100;
  h.padding.bottom = 160;
  h.controller.setRegisteredObstacles([obstacle('chosen')]);
  const selected = h.controller.sample().match;
  h.controller.startPositionCorrection([2, 3], [8, 9]);
  assert.deepEqual(h.controller.sample().position, [8, 9]);
  assert.equal(h.controller.sample().match, null, 'correction does not select another obstacle');
  assert.equal(h.controller.getDragCenter(), null);
  assert.equal(h.shownObstacles.at(-1), null);
  assert.deepEqual(h.gestures.at(-1), { correcting: true, crosshair: true });
  assert.ok(h.cameraChanges() > 0, 'programmatic centering releases GPS following');
  const initialCamera = h.map.camera;
  h.controller.setBottomInset(250);
  assert.deepEqual(h.map.camera, initialCamera, 'the bottom panel does not shift crosshair coordinates');
  h.map.camera = [10, 11];
  h.fire();
  assert.deepEqual(h.corrections.at(-1), { origin: [2, 3], target: [10, 11] });
  h.map.afterStop = () => { h.map.camera = [12, 13]; };
  assert.deepEqual(h.controller.sample().position, [12, 13]);
  assert.equal(selected?.id, 'chosen', 'the selected obstacle snapshot is not replaced by map movement');
  h.map.afterStop = () => {};
  h.controller.endPositionCorrection();
  assert.equal(h.corrections.at(-1)?.origin, null);
  assert.deepEqual(h.gestures.at(-1), { correcting: false, crosshair: true });
});

test('correction input switches retain the latest candidate but clear the prior ordinary target', (t) => {
  const h = setup(t);
  h.controller.setHoldMode('error-report');
  h.controller.placeCircle([2, 3]);
  h.controller.startPositionCorrection([2, 3], [2.1, 3.1]);
  const candidate = h.controller.sample().position;
  h.controller.setCrosshairMode(true);
  assert.deepEqual(h.controller.sample().position, candidate);
  h.map.camera = [4, 5];
  h.controller.setCrosshairMode(false);
  assert.deepEqual(h.controller.sample().position, [4, 5]);
  assert.ok(h.controller.getDragCenter());
  assert.deepEqual(h.gestures.at(-1), { correcting: true, crosshair: false });
  assert.deepEqual(h.corrections.at(-1), { origin: [2, 3], target: [4, 5] });
  h.map.camera = [4.1, 5.1];
  h.fire();
  assert.deepEqual(h.controller.sample().position, [4, 5], 'correction circle stays geographically anchored');
  h.controller.startPositionCorrection([2, 3], [4, 5]);
  h.controller.endPositionCorrection();
  assert.deepEqual(h.controller.sample(), { center: null, match: null, position: null });
  assert.equal(h.controller.getDragCenter(), null);
  h.controller.placeCircle([2, 3]);
  assert.deepEqual(h.controller.sample().position, [2, 3]);
});

test('correction started in crosshair input does not restore a sampled midpoint as an ordinary circle', (t) => {
  const h = setup(t);
  aim(h);
  h.controller.startPositionCorrection([2, 3], [2.1, 3.1]);
  h.controller.setCrosshairMode(false);
  assert.deepEqual(h.controller.sample().position, [2.1, 3.1]);
  h.controller.setCrosshairMode(true);
  assert.deepEqual(h.controller.sample().position, [2.1, 3.1]);
  h.controller.setCrosshairMode(false);
  h.controller.endPositionCorrection();
  assert.deepEqual(h.controller.sample(), { center: null, match: null, position: null });
});

test('circle-only correction cancellation restores the prior selection circle', (t) => {
  const h = setup(t);
  h.controller.setHoldMode('error-report');
  h.controller.setRegisteredObstacles([obstacle('chosen')]);
  h.controller.placeCircle([2, 3]);
  h.controller.startPositionCorrection([2, 3], [2.1, 3.1]);
  h.controller.moveCircle(240, 350);
  h.controller.endPositionCorrection();
  assert.deepEqual(h.controller.sample().position, [2, 3]);
  assert.equal(h.controller.sample().match?.id, 'chosen');
});

test('circle correction clamps dragging above the measured panel and abandons correction on mode exit', (t) => {
  const h = setup(t);
  h.controller.setHoldMode('error-report');
  h.controller.startPositionCorrection([2, 3], [2, 3]);
  h.controller.setBottomInset(100);
  h.controller.moveCircle(-100, 1000);
  assert.deepEqual(h.controller.sample().center, { x: 56, y: 388 });
  h.controller.setHoldMode('obstacle');
  assert.equal(h.controller.getDragCenter(), null);
  assert.deepEqual(h.gestures.at(-1), { correcting: false, crosshair: false });
  assert.equal(h.corrections.at(-1)?.origin, null);
});

test('inert, zero-size and destroyed maps cannot select or confirm; teardown removes movement listeners', (t) => {
  const h = setup(t);
  aim(h);
  h.controller.setRegisteredObstacles([obstacle('target')]);
  for (const invalid of ['inert', 'width', 'height'] as const) {
    h.viewport.inert = invalid === 'inert';
    h.viewport.width = invalid === 'width' ? 0 : 400;
    h.viewport.height = invalid === 'height' ? 0 : 600;
    const stops = h.map.stops;
    assert.equal(h.controller.sample().match, null);
    assert.equal(h.controller.sample().position, null);
    h.controller.startPositionCorrection([2, 3], [4, 5]);
    assert.equal(h.map.stops, stops);
  }
  h.viewport.width = 400;
  h.viewport.height = 600;
  h.controller.destroy();
  const count = h.updates.length;
  h.fire();
  h.fire('resize');
  h.controller.setCrosshairMode(false);
  h.controller.setHoldMode('obstacle');
  h.controller.setRegisteredObstacles([]);
  h.controller.moveCircle(200, 300);
  assert.equal(h.controller.sample().position, null);
  assert.equal(h.updates.length, count);
});
