import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { createMapDrawingInteraction } from '../src/lib/map/createMapDrawingInteraction.js';
import { createDrawingController } from '../src/lib/reporting/createDrawingController.js';
import type { PlacementEditingVariantId } from '../src/lib/map/placementEditing.js';
import type { HoldOrigin } from '../src/lib/map/createMapHoldController.js';
import type { ObstacleGeometry } from '../src/lib/reporting/obstacle.js';

function setup(t: TestContext, zoomEnabled = true, variant: PlacementEditingVariantId = 'default') {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const view = new EventTarget();
  const viewport = { width: 400, height: 600, inert: false };
  const canvas = Object.assign(new EventTarget(), {
    ownerDocument: { defaultView: view },
    captured: new Set<number>(),
    getBoundingClientRect: () => ({ left: 20, top: 30, width: viewport.width, height: viewport.height }),
    closest: () => viewport.inert ? {} : null,
    setPointerCapture(id: number) { this.captured.add(id); },
    hasPointerCapture(id: number) { return this.captured.has(id); },
    releasePointerCapture(id: number) { this.captured.delete(id); },
  });
  const events = new EventTarget();
  const map = {
    scale: 0.01,
    pan: [0, 0],
    zoom: 9, bearing: 17, pitch: 30,
    panBy([x, y]: [number, number]) {
      this.pan[0] += x; this.pan[1] += y;
      events.dispatchEvent(Object.assign(new Event('movestart'), { originalEvent: undefined }));
    },
    getCanvas: () => canvas,
    unproject([x, y]: [number, number]) { return { lng: (x + this.pan[0]) * this.scale, lat: (y + this.pan[1]) * this.scale }; },
    stop() {},
    isMoving: () => map.pan.some((value) => value !== 0),
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
  const placed: (readonly [number, number])[] = [];
  const drawing = createDrawingController({ vertexEditing: variant !== 'default', deferPointCompletion: variant === 'basic', onChange: (state) => interaction.sync(state), onComplete: (geometry) => completed.push(geometry) });
  const interaction = createMapDrawingInteraction(map as unknown as MapLibreMap, drawing, {
    variant,
    onHoldChange: (origin) => origins.push(origin),
    onHoldMove: (x, y) => moves.push({ x, y }),
    onErrorReportPlace: (center) => placed.push(center),
  });
  t.after(() => interaction.destroy());

  function fire(type: string, init: Record<string, unknown> = {}) {
    const event = new Event(type, { cancelable: true });
    for (const [key, value] of Object.entries({
      target: type === 'blur' ? view : canvas, pointerId: 1, pointerType: 'mouse', isPrimary: true,
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
  return { map, viewport, drawing, interaction, fire, select, click, navigate, completed, origins, moves, placed,
    state: drawing.getState, tick: () => t.mock.timers.tick(200) };
}

test('crosshair Point samples the CSS midpoint at activation and completes exactly once', (t) => {
  const h = setup(t);
  h.interaction.startAtCrosshair('Point');
  assert.equal(h.state().status, 'idle', 'disabled mode cannot place geometry');
  h.interaction.setCrosshairMode(true);
  let stops = 0;
  h.map.stop = () => { stops++; h.map.scale = 0.02; };
  h.interaction.startAtCrosshair('Point');
  assert.equal(stops, 1, 'camera stops before unprojecting');
  assert.deepEqual(h.completed, [{ type: 'Point', coordinates: [4, 6] }]);
  h.interaction.startAtCrosshair('LineString');
  h.interaction.appendAtCrosshair();
  assert.equal(h.completed.length, 1);
  assert.equal(stops, 1, 'completed selections reject further placement');
});

for (const type of ['LineString', 'Polygon'] as const) {
  test(`crosshair ${type} appends at the current camera/viewport midpoint and retains validation`, (t) => {
    const h = setup(t);
    h.interaction.setCrosshairMode(true);
    h.interaction.startAtCrosshair(type);
    assert.deepEqual(h.state().draft?.vertices, [[2, 3]]);
    assert.equal(h.state().canComplete, false);
    h.interaction.appendAtCrosshair();
    assert.equal(h.state().canComplete, false, 'coincident vertices cannot complete');
    h.drawing.undo();
    h.navigate();
    h.map.scale = 0.02;
    h.viewport.width = 834;
    h.viewport.height = 1194;
    h.interaction.appendAtCrosshair();
    assert.deepEqual(h.state().draft?.vertices, [[2, 3], [8.34, 11.94]]);
    assert.equal(h.state().canComplete, type === 'LineString');
    if (type === 'Polygon') {
      h.viewport.width = 600;
      h.interaction.appendAtCrosshair();
      assert.equal(h.state().canComplete, true);
    }
    h.drawing.complete();
    assert.equal(h.completed.length, 1);
    assert.equal(h.completed[0].type, type);
    h.drawing.delete();
    h.interaction.startAtCrosshair('Point');
    assert.equal(h.completed.length, 2, 'mode remains enabled after deletion');
  });
}

test('crosshair mode preserves geometry and navigation while suppressing holds and map taps', (t) => {
  const h = setup(t);
  h.interaction.setCrosshairMode(true);
  h.select();
  assert.equal(h.origins.length, 0);
  assert.equal(h.state().status, 'idle');
  h.interaction.startAtCrosshair('LineString');
  const before = h.state();
  h.click();
  h.navigate();
  assert.equal(h.state(), before);
  assert.equal(h.map.doubleClickZoom.isEnabled(), true);
  h.interaction.setCrosshairMode(false);
  assert.equal(h.state(), before);
  assert.equal(h.map.doubleClickZoom.isEnabled(), false);
  h.interaction.appendAtCrosshair();
  assert.equal(h.state(), before, 'disabled mode cannot append');
  h.click({ clientX: 150 });
  assert.equal(h.state().draft?.vertices.length, 2, 'ordinary tap drawing is restored');
  h.interaction.setCrosshairMode(true);
  assert.equal(h.map.doubleClickZoom.isEnabled(), true);
  h.drawing.delete();
  h.interaction.setCrosshairMode(false);
  h.select(120, 50);
  assert.equal(h.state().status, 'completed', 'ordinary radial selection is restored');
});

test('switching modes cancels pending holds and taps without creating vertices', (t) => {
  const h = setup(t);
  h.fire('pointerdown');
  h.interaction.setCrosshairMode(true);
  h.tick();
  h.fire('pointerup', { clientX: 220, clientY: 220 });
  h.fire('click');
  assert.equal(h.state().status, 'idle');
  assert.equal(h.origins.length, 0);
  h.interaction.setCrosshairMode(false);
  h.select();
  h.fire('pointerdown');
  h.interaction.setCrosshairMode(true);
  h.interaction.setCrosshairMode(false);
  h.fire('pointerup');
  h.fire('click');
  assert.equal(h.state().draft?.vertices.length, 1);
});

test('crosshair commands reject inert, zero-size and destroyed maps', (t) => {
  const h = setup(t);
  h.interaction.setCrosshairMode(true);
  h.viewport.inert = true;
  h.interaction.startAtCrosshair('Point');
  h.viewport.inert = false;
  h.viewport.width = 0;
  h.interaction.startAtCrosshair('Point');
  assert.equal(h.state().status, 'idle');
  h.viewport.width = 400;
  h.interaction.startAtCrosshair('LineString');
  const before = h.state();
  h.viewport.inert = true;
  h.interaction.appendAtCrosshair();
  assert.equal(h.state(), before);
  h.viewport.inert = false;
  h.interaction.destroy();
  h.interaction.appendAtCrosshair();
  h.interaction.setCrosshairMode(false);
  assert.equal(h.state(), before);
  h.drawing.delete();
  h.interaction.startAtCrosshair('Point');
  assert.equal(h.state().status, 'idle');
});

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

test('error-report hold opens the menu at the press but never starts geometry; obstacle mode restores selection', (t) => {
  const h = setup(t);
  h.interaction.setHoldMode('error-report');
  assert.equal(h.select().defaultPrevented, true, 'the release click is still consumed');
  assert.deepEqual(h.origins, [{ x: 100, y: 150 }, null]);
  assert.equal(h.state().status, 'idle');
  assert.deepEqual(h.placed, [[1, 1.5]], 'the circle is placed at the press coordinate, not the release');
  h.interaction.setHoldMode('obstacle');
  h.select();
  assert.equal(h.placed.length, 1);
  assert.equal(h.state().draft?.type, 'LineString');
});

test('a suspended hold opens nothing and places nothing; resuming restores it', (t) => {
  const h = setup(t);
  h.interaction.setHoldMode('error-report');
  h.fire('pointerdown');
  h.tick();
  assert.deepEqual(h.origins, [{ x: 100, y: 150 }]);
  h.interaction.setHoldSuspended(true);
  assert.deepEqual(h.origins, [{ x: 100, y: 150 }, null], 'suspending closes an open hold');
  h.fire('pointerup');
  h.select();
  assert.equal(h.origins.length, 2);
  assert.deepEqual(h.placed, []);
  h.interaction.setHoldSuspended(false);
  h.select();
  assert.deepEqual(h.placed, [[1, 1.5]]);
});

test('error-report hold released in the centre, without a drag into the ring, places nothing', (t) => {
  const h = setup(t);
  h.interaction.setHoldMode('error-report');
  h.fire('pointerdown');
  h.tick();
  assert.deepEqual(h.origins, [{ x: 100, y: 150 }], 'the ring shows while held');
  h.fire('pointermove', { clientX: 130, clientY: 160 });
  h.fire('pointerup', { clientX: 130, clientY: 160 });
  assert.deepEqual(h.origins, [{ x: 100, y: 150 }, null], 'the ring closes on release');
  assert.deepEqual(h.placed, []);
  assert.equal(h.fire('click', { clientX: 130, clientY: 160 }).defaultPrevented, true, 'the release never reaches the map as a tap');
});

test('changing hold mode closes an open menu without selection', (t) => {
  const h = setup(t);
  h.fire('pointerdown');
  h.tick();
  assert.deepEqual(h.origins, [{ x: 100, y: 150 }]);
  h.interaction.setHoldMode('error-report');
  assert.deepEqual(h.origins, [{ x: 100, y: 150 }, null]);
  h.fire('pointerup', { clientX: 220, clientY: 220 });
  assert.equal(h.state().status, 'idle');
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

test('crosshair error-report input suppresses radial selection and geometry commands; leaving restores crosshair drawing', (t) => {
  const h = setup(t);
  h.interaction.setCrosshairMode(true);
  h.interaction.setHoldMode('error-report');
  h.select();
  h.click();
  h.interaction.startAtCrosshair('Point');
  assert.equal(h.state().status, 'idle');
  assert.deepEqual(h.placed, []);
  assert.deepEqual(h.origins, []);
  h.interaction.setHoldMode('obstacle');
  h.interaction.setHoldSuspended(true);
  h.interaction.startAtCrosshair('Point');
  assert.equal(h.state().status, 'idle', 'position correction owns the input');
  h.interaction.setHoldSuspended(false);
  h.interaction.startAtCrosshair('LineString');
  h.interaction.setHoldMode('error-report');
  h.interaction.appendAtCrosshair();
  h.interaction.setCrosshairMode(false);
  h.click();
  assert.equal(h.state().draft?.vertices.length, 1);
  h.interaction.setHoldMode('obstacle');
  h.interaction.setCrosshairMode(true);
  h.map.scale = 0.02;
  h.interaction.appendAtCrosshair();
  assert.equal(h.state().draft?.vertices.length, 2);
});

for (const pointerType of ['mouse', 'pen', 'touch']) {
  test(`persistent donut ${pointerType}: opening release ignores sectors; center drag keeps it open and moves geographic placement`, (t) => {
    const h = setup(t, true, 'persistent-donut');
    h.select(520, 380, pointerType);
    assert.equal(h.state().status, 'idle');
    assert.deepEqual(h.origins, [{ x: 100, y: 150 }]);
    h.fire('pointerdown', { pointerType });
    h.fire('pointermove', { clientX: 127, pointerType });
    assert.equal(h.origins.length, 1, 'below 8 px remains a tap');
    h.fire('pointermove', { clientX: 220, clientY: 280, pointerType });
    h.fire('pointerup', { clientX: 520, clientY: 380, pointerType });
    assert.equal(h.state().status, 'idle', 'release outside the original hole cannot select after center drag');
    assert.deepEqual(h.origins.at(-1), { x: 500, y: 350 });
    assert.deepEqual(h.map.pan, [0, 0], 'the map stays stationary');
    assert.equal(h.fire('click', { clientX: 520, clientY: 380 }).defaultPrevented, true);
    h.click({ clientX: 1000, clientY: 900, pointerType });
    assert.equal(h.state().draft?.type, 'LineString');
    assert.deepEqual(h.state().draft?.vertices, [[5, 3.5]]);
  });
}

test('persistent center tap cancels; keyboard center movement and selection use the same placement', (t) => {
  const h = setup(t, true, 'persistent-donut');
  h.select();
  h.click({ clientX: 127 });
  assert.equal(h.origins.at(-1), null);
  assert.equal(h.state().status, 'idle');
  h.select();
  h.interaction.movePersistentCenter(116, 214);
  h.interaction.selectPersistentGeometry('Point');
  assert.deepEqual(h.completed, [{ type: 'Point', coordinates: [1.16, 2.14] }]);
  h.interaction.selectPersistentGeometry('Point');
  assert.equal(h.completed.length, 1);
});

for (const originalFirst of [true, false]) {
  test(`two-finger pans update placement under the fixed donut; original finger lifts ${originalFirst ? 'first' : 'last'}`, (t) => {
    const h = setup(t, true, 'two-finger');
    h.fire('pointerdown', { pointerType: 'touch' });
    h.tick();
    h.fire('pointerdown', { pointerType: 'touch', pointerId: 2, isPrimary: false, clientX: 220 });
    h.fire('pointermove', { pointerType: 'touch', pointerId: 2, isPrimary: false, clientX: 260 });
    h.fire('pointermove', { pointerType: 'touch', clientX: 160 });
    assert.deepEqual(h.map.pan, [-40, 0], 'both fingers contribute half their motion');
    assert.deepEqual(h.origins, [{ x: 100, y: 150 }], 'screen center remains fixed despite camera events');
    assert.deepEqual([h.map.zoom, h.map.bearing, h.map.pitch], [9, 17, 30]);
    assert.equal(h.state().status, 'idle');
    const first = originalFirst ? 1 : 2;
    h.fire('pointerup', { pointerType: 'touch', pointerId: first, clientX: 260 });
    if (!originalFirst) h.fire('pointermove', { pointerType: 'touch', clientX: 520, clientY: 380 });
    h.fire('pointerup', { pointerType: 'touch', pointerId: originalFirst ? 2 : 1, clientX: 520, clientY: 380 });
    assert.equal(h.state().status, originalFirst ? 'idle' : 'drawing');
    if (!originalFirst) assert.deepEqual(h.state().draft?.vertices, [[0.6, 1.5]]);
    assert.equal(h.fire('click').defaultPrevented, true);
    assert.equal(h.fire('touchstart').defaultPrevented, false, 'ordinary navigation is restored');
  });
}

for (const variant of ['basic', 'persistent-donut', 'two-finger'] as const) {
  test(`${variant}: crosshair Point and error-report release retain their variant-specific completion paths`, (t) => {
    const h = setup(t, true, variant);
    h.interaction.setHoldMode('error-report');
    h.select();
    assert.deepEqual(h.placed, [[1, 1.5]]);
    assert.equal(h.origins.at(-1), null, 'error ring never persists');
    h.interaction.setHoldMode('obstacle');
    h.interaction.setCrosshairMode(true);
    h.interaction.startAtCrosshair('Point');
    h.interaction.appendAtCrosshair();
    h.click();
    assert.equal(h.state().draft?.vertices.length, 1);
    assert.equal(h.completed.length, variant === 'basic' ? 0 : 1);
    h.drawing.complete();
    h.drawing.complete();
    assert.equal(h.completed.length, 1);
  });
}
