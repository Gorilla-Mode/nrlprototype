import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { createMapDrawingInteraction } from '../src/lib/map/createMapDrawingInteraction.js';
import { createDrawingController } from '../src/lib/reporting/createDrawingController.js';
import type { HoldOrigin } from '../src/lib/map/createMapHoldController.js';
import type { ObstacleGeometry } from '../src/lib/reporting/obstacle.js';

function setup(t: TestContext, zoomEnabled = true) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const view = new EventTarget();
  const canvas = Object.assign(new EventTarget(), {
    ownerDocument: { defaultView: view },
    captured: new Set<number>(),
    getBoundingClientRect: () => ({ left: 20, top: 30 }),
    setPointerCapture(id: number) { this.captured.add(id); },
    hasPointerCapture(id: number) { return this.captured.has(id); },
    releasePointerCapture(id: number) { this.captured.delete(id); },
  });
  const events = new EventTarget();
  const map = {
    scale: 0.01,
    getCanvas: () => canvas,
    unproject([x, y]: [number, number]) { return { lng: x * this.scale, lat: y * this.scale }; },
    stop() {},
    isMoving: () => false,
    on: events.addEventListener.bind(events),
    off: events.removeEventListener.bind(events),
    doubleClickZoom: {
      isEnabled: () => zoomEnabled,
      enable: () => { zoomEnabled = true; },
      disable: () => { zoomEnabled = false; },
    },
  };
  const completed: ObstacleGeometry[] = [];
  const origins: (HoldOrigin | null)[] = [];
  const moves: HoldOrigin[] = [];
  const drawing = createDrawingController({ onChange: (state) => interaction.sync(state), onComplete: (geometry) => completed.push(geometry) });
  const interaction = createMapDrawingInteraction(map as unknown as MapLibreMap, drawing, {
    onHoldChange: (origin) => origins.push(origin),
    onHoldMove: (x, y) => moves.push({ x, y }),
  });
  t.after(() => interaction.destroy());

  function fire(type: string, init: Record<string, unknown> = {}) {
    const event = new Event(type, { cancelable: true });
    for (const [key, value] of Object.entries({
      target: canvas, pointerId: 1, pointerType: 'mouse', isPrimary: true,
      button: 0, buttons: 1, clientX: 120, clientY: 180, detail: 1, ...init,
    })) Object.defineProperty(event, key, { value });
    (type === 'lostpointercapture' ? canvas : view).dispatchEvent(event);
    return event;
  }

  function select(clientX = 220, clientY = 220, pointerType = 'mouse') {
    fire('pointerdown', { pointerType });
    t.mock.timers.tick(200);
    fire('pointerup', { clientX, clientY, pointerType });
    return fire('click', { clientX, clientY, pointerType });
  }
  function click(init: Record<string, unknown> = {}) {
    fire('pointerdown', init);
    fire('pointerup', init);
    return fire('click', init);
  }
  function navigate() {
    events.dispatchEvent(Object.assign(new Event('movestart'), { originalEvent: new Event('wheel') }));
  }
  return { map, drawing, interaction, fire, select, click, navigate, completed, origins, moves,
    state: drawing.getState, tick: () => t.mock.timers.tick(200) };
}

for (const pointerType of ['mouse', 'touch', 'pen']) {
  test(`${pointerType}: selection creates one vertex at pointer-down, consuming the release click`, (t) => {
    const h = setup(t);
    h.fire('pointerdown', { pointerType });
    h.map.scale = 0.02;
    h.tick();
    h.fire('pointermove', { clientX: 120, clientY: 80, pointerType });
    h.fire('pointerup', { clientX: 520, clientY: 380, pointerType });
    assert.equal(h.state().draft?.type, 'LineString', 'final release selects even when hover pointed elsewhere');
    assert.deepEqual(h.state().draft?.vertices, [[1, 1.5]], 'unproject before the delay, using the initial map transform');
    assert.equal(h.fire('click', { clientX: 520, clientY: 380, pointerType }).defaultPrevented, true);
    assert.equal(h.state().draft?.vertices.length, 1);
    assert.equal(h.map.doubleClickZoom.isEnabled(), false);
    h.click({ clientX: 150, clientY: 160, pointerType });
    assert.deepEqual(h.state().draft?.vertices, [[1, 1.5], [2.6, 2.6]]);
  });
}

for (const [name, x, y, type, status] of [
  ['Point', 120, -1000, 'Point', 'completed'],
  ['Line', 1200, 1000, 'LineString', 'drawing'],
  ['Polygon', -1200, 1000, 'Polygon', 'drawing'],
] as const) {
  test(`overshooting directly selects ${name} at the press coordinate`, (t) => {
    const h = setup(t);
    h.select(x, y);
    assert.equal(h.state().status, status);
    assert.equal(h.state().draft?.type, type);
    assert.deepEqual(h.state().draft?.vertices, [[1, 1.5]]);
    assert.equal(h.completed.length, type === 'Point' ? 1 : 0);
  });
}

test('returning from a hovered sector to the safe zone cancels without starting geometry', (t) => {
  const h = setup(t);
  h.fire('pointerdown');
  h.tick();
  h.fire('pointermove', { clientX: 520, clientY: 380 });
  h.fire('pointerup', { clientX: 120, clientY: 134 });
  assert.equal(h.state().status, 'idle');
  assert.equal(h.fire('click').defaultPrevented, true);
  assert.equal(h.completed.length, 0);
});

for (const cause of ['pointercancel', 'lostpointercapture', 'blur', 'Escape', 'navigation', 'resize', 'second touch', 'destroy']) {
  test(`${cause} cancels a hold without selection`, (t) => {
    const h = setup(t);
    h.fire('pointerdown');
    h.tick();
    h.fire('pointermove', { clientX: 220, clientY: 220 });
    if (cause === 'Escape') h.fire('keydown', { key: 'Escape' });
    else if (cause === 'navigation') h.navigate();
    else if (cause === 'resize') h.interaction.cancel();
    else if (cause === 'second touch') h.fire('pointerdown', { pointerId: 2, isPrimary: false });
    else if (cause === 'destroy') h.interaction.destroy();
    else h.fire(cause);
    h.fire('pointerup', { clientX: 220, clientY: 220 });
    h.fire('click', { clientX: 220, clientY: 220 });
    assert.equal(h.state().status, 'idle');
  });
}

test('no menu during drawing or completion; Delete permits a fresh held object', (t) => {
  const h = setup(t);
  h.select();
  const menus = h.origins.length;
  h.fire('pointerdown');
  h.tick();
  assert.equal(h.origins.length, menus);
  h.fire('pointerup');
  h.fire('click');
  h.click({ clientX: 150 });
  h.drawing.complete();
  const count = h.state().draft?.vertices.length;
  h.select();
  assert.equal(h.origins.length, menus);
  assert.equal(h.state().draft?.vertices.length, count);
  assert.equal(h.map.doubleClickZoom.isEnabled(), true);
  h.drawing.delete();
  h.select(120, 50);
  assert.equal(h.state().draft?.type, 'Point');
  assert.deepEqual(h.state().draft?.vertices, [[1, 1.5]]);
});

for (const gesture of ['drag', 'drag returning to start', 'pinch', 'wheel', 'navigation', 'pointercancel', 'blur', 'control', 'modified click', 'no physical press']) {
  test(`${gesture} never adds a drawing vertex`, (t) => {
    const h = setup(t);
    h.select();
    if (gesture === 'control') h.fire('pointerdown', { target: new EventTarget() });
    else if (gesture === 'modified click') h.fire('pointerdown', { shiftKey: true });
    else if (gesture !== 'no physical press') h.fire('pointerdown');
    if (gesture.startsWith('drag')) h.fire('pointermove', { clientX: 160 });
    if (gesture === 'drag returning to start') h.fire('pointermove');
    if (gesture === 'pinch') {
      h.fire('pointerdown', { pointerId: 2, isPrimary: false });
      h.fire('pointerup', { pointerId: 2 });
    }
    if (gesture === 'navigation') h.navigate();
    if (['wheel', 'pointercancel', 'blur'].includes(gesture)) h.fire(gesture);
    h.fire('pointerup', gesture === 'drag' ? { clientX: 160 } : {});
    h.fire('click');
    assert.equal(h.state().draft?.vertices.length, 1);
    h.click({ clientX: 150 });
    assert.equal(h.state().draft?.vertices.length, 2, 'next deliberate click works');
  });
}

test('pointer movement alone never extends geometry; camera navigation leaves vertices fixed', (t) => {
  const h = setup(t);
  h.select();
  const before = h.state();
  h.fire('pointermove', { clientX: 400, clientY: 500, buttons: 0 });
  h.navigate();
  h.map.scale = 0.02;
  assert.equal(h.state(), before);
  h.click({ clientX: 150, clientY: 160 });
  assert.deepEqual(h.state().draft?.vertices, [[1, 1.5], [2.6, 2.6]]);
});

test('mouse double-click and emulated touch double-tap append only their first click', (t) => {
  const h = setup(t);
  h.select();
  h.click({ clientX: 150, detail: 1 });
  h.click({ clientX: 150, detail: 2 });
  h.fire('dblclick', { clientX: 150, detail: 2 });
  assert.equal(h.state().draft?.vertices.length, 2);
  h.click({ clientX: 180, pointerType: 'touch', detail: 1, timeStamp: 1000 });
  h.click({ clientX: 182, pointerType: 'touch', detail: 1, timeStamp: 1100 });
  assert.equal(h.state().draft?.vertices.length, 3);
  h.click({ clientX: 182, pointerType: 'touch', detail: 1, timeStamp: 1700 });
  assert.equal(h.state().draft?.vertices.length, 4);
});

for (const enabled of [true, false]) {
  test(`Delete and teardown restore the initial double-click zoom setting (${enabled})`, (t) => {
    const h = setup(t, enabled);
    h.select();
    h.drawing.delete();
    assert.equal(h.map.doubleClickZoom.isEnabled(), enabled);
    h.select();
    h.interaction.destroy();
    h.interaction.destroy();
    assert.equal(h.map.doubleClickZoom.isEnabled(), enabled);
    h.click({ clientX: 150 });
    assert.equal(h.state().draft?.vertices.length, 1);
    assert.equal(h.fire('click').defaultPrevented, false, 'all suppression listeners are removed');
  });
}
