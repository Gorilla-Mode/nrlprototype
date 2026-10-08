import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { createDrawingController } from '../src/lib/reporting/createDrawingController.js';
import { createVertexEditingInteraction, nearestEditableVertex, type EditableVertexHandle } from '../src/lib/map/createVertexEditingInteraction.js';
import type { PlacementEditingVariantId } from '../src/lib/map/placementEditing.js';

function setup(t: TestContext, variant: PlacementEditingVariantId = 'basic') {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const view = new EventTarget();
  let inert = false;
  const canvas = Object.assign(new EventTarget(), {
    ownerDocument: { defaultView: view },
    captures: new Set<number>(),
    closest: () => inert ? {} : null,
    getBoundingClientRect: () => ({ left: 20, top: 30 }),
    setPointerCapture(id: number) { this.captures.add(id); },
    hasPointerCapture(id: number) { return this.captures.has(id); },
    releasePointerCapture(id: number) { this.captures.delete(id); },
  });
  const handler = (enabled = true) => ({
    enabled, isEnabled() { return this.enabled; }, enable() { this.enabled = true; }, disable() { this.enabled = false; },
  });
  const events = new EventTarget();
  let stops = 0;
  const map = {
    getCanvas: () => canvas,
    project: ([lng, lat]: [number, number]) => ({ x: lng * 100, y: lat * 100 }),
    unproject: ([x, y]: [number, number]) => ({ lng: x / 100, lat: y / 100 }),
    stop: () => { stops++; },
    on: events.addEventListener.bind(events), off: events.removeEventListener.bind(events),
    dragPan: handler(), dragRotate: handler(false), touchZoomRotate: handler(), touchPitch: handler(false),
    scrollZoom: handler(), boxZoom: handler(false), doubleClickZoom: handler(false), keyboard: handler(),
  };
  let handles: readonly EditableVertexHandle[] = [];
  const drawing = createDrawingController({ vertexEditing: variant !== 'default', deferPointCompletion: true,
    onChange: (state) => interaction.sync(state), onComplete: () => {} });
  const interaction = createVertexEditingInteraction(map as unknown as MapLibreMap, drawing, {
    variant, onHandlesChange: (value) => { handles = value; },
  });
  drawing.start('LineString', [1, 1.5]);
  t.after(() => interaction.destroy());

  function fire(type: string, init: Record<string, unknown> = {}) {
    const event = new Event(type, { cancelable: true });
    for (const [key, value] of Object.entries({ target: type === 'blur' ? view : canvas, pointerId: 1, pointerType: 'mouse',
      isPrimary: true, button: 0, buttons: 1, clientX: 130, clientY: 180, detail: 1, ...init })) {
      Object.defineProperty(event, key, { value });
    }
    (type === 'lostpointercapture' ? canvas : view).dispatchEvent(event);
    return event;
  }
  function key(key: string, shiftKey = false) { return Object.assign(new Event('keydown', { cancelable: true }), { key, shiftKey }) as KeyboardEvent; }
  return { drawing, interaction, fire, key, map, canvas, events, get handles() { return handles; },
    get stops() { return stops; }, hide: () => { inert = true; }, tick: (ms = 200) => t.mock.timers.tick(ms) };
}

test('nearest vertex uses a 44 px target and stable vertex order for equal distances', () => {
  const handles = [{ index: 0, x: 0, y: 0 }, { index: 1, x: 20, y: 0 }];
  assert.equal(nearestEditableVertex(handles, { x: 10, y: 0 })?.index, 0);
  assert.equal(nearestEditableVertex(handles, { x: 22, y: 0 })?.index, 1);
  assert.equal(nearestEditableVertex([handles[0]], { x: 22, y: 0 })?.index, 0);
  assert.equal(nearestEditableVertex([handles[0]], { x: 22.01, y: 0 }), undefined);
});

for (const variant of ['basic', 'persistent-donut', 'two-finger'] as const) {
  for (const pointerType of ['mouse', 'pen', 'touch']) {
    test(`${variant}/${pointerType}: editing preserves grab offset, consumes clicks and records one move`, (t) => {
      const h = setup(t, variant);
      h.fire('pointerdown', { pointerType });
      assert.equal(h.stops, variant === 'two-finger' ? 1 : 0);
      h.tick();
      assert.equal(h.stops, 1);
      assert.equal(h.map.dragPan.enabled, false);
      h.fire('pointermove', { pointerType, clientX: 180 });
      h.fire('pointermove', { pointerType, clientX: 230 });
      h.fire('pointerup', { pointerType, clientX: 230, buttons: 0 });
      assert.deepEqual(h.drawing.getState().draft?.vertices, [[2, 1.5]], '10 px grab offset stays intact');
      assert.equal(h.fire('click').defaultPrevented, true);
      assert.equal(h.map.dragPan.enabled, true);
      assert.equal(h.map.dragRotate.enabled, false);
      assert.equal(h.map.touchPitch.enabled, false);
      assert.equal(h.map.doubleClickZoom.enabled, false);
      assert.equal(h.canvas.captures.size, 0);
      h.drawing.undo();
      assert.deepEqual(h.drawing.getState().draft?.vertices, [[1, 1.5]]);
      assert.equal(h.drawing.getState().canUndo, false);
    });
  }
}

for (const variant of ['basic', 'persistent-donut'] as const) {
  test(`${variant}: movement before 200 ms remains map navigation, while a vertex tap cannot append`, (t) => {
    const h = setup(t, variant);
    h.fire('pointerdown');
    h.tick(199);
    h.fire('pointermove', { clientX: 139 });
    h.tick();
    assert.equal(h.stops, 0);
    assert.equal(h.fire('touchmove').defaultPrevented, false);
    h.fire('pointerup', { clientX: 139 });
    assert.equal(h.fire('click').defaultPrevented, true);
    h.fire('pointerdown'); h.fire('pointerup');
    assert.equal(h.fire('click').defaultPrevented, true);
    assert.equal(h.drawing.getState().canUndo, false);
    h.fire('pointerdown', { clientX: 300 });
    h.fire('pointerup', { clientX: 300 });
    assert.equal(h.fire('click', { clientX: 300 }).defaultPrevented, false, 'empty map taps are available to append listener');
  });
}

for (const cause of ['pointercancel', 'lostpointercapture', 'blur', 'resize', 'second touch', 'Escape', 'hidden', 'mode', 'delete', 'destroy']) {
  test(`${cause} restores an activated move and original gesture settings`, (t) => {
    const h = setup(t);
    h.fire('pointerdown'); h.tick();
    h.fire('pointermove', { clientX: 230 });
    assert.deepEqual(h.drawing.getState().draft?.vertices, [[2, 1.5]]);
    if (cause === 'second touch') h.fire('pointerdown', { pointerId: 2, pointerType: 'touch', isPrimary: false });
    else if (cause === 'Escape') h.fire('keydown', { key: 'Escape' });
    else if (cause === 'hidden') { h.hide(); h.interaction.setEnabled(false); }
    else if (cause === 'mode') h.interaction.cancel();
    else if (cause === 'delete') { h.interaction.cancel(); h.drawing.delete(); }
    else if (cause === 'destroy') h.interaction.destroy();
    else h.fire(cause);
    if (cause !== 'delete') assert.deepEqual(h.drawing.getState().draft?.vertices, [[1, 1.5]]);
    assert.equal(h.drawing.getState().canUndo, false);
    assert.equal(h.map.dragPan.enabled, true);
    assert.equal(h.map.dragRotate.enabled, false);
    assert.equal(h.canvas.captures.size, 0);
  });
}

test('arrow keys use 16 px and Shift multiplier; Escape rolls back a key gesture; completed geometry has no handles', (t) => {
  const h = setup(t);
  assert.deepEqual(h.handles, [{ index: 0, x: 100, y: 150 }]);
  h.interaction.keyDown(0, h.key('ArrowRight'));
  h.interaction.keyDown(0, h.key('ArrowDown', true));
  assert.deepEqual(h.drawing.getState().draft?.vertices, [[1.16, 2.14]]);
  h.interaction.keyDown(0, h.key('Escape'));
  assert.deepEqual(h.drawing.getState().draft?.vertices, [[1, 1.5]]);
  assert.equal(h.drawing.getState().canUndo, false);
  h.interaction.keyDown(0, h.key('ArrowRight', true));
  h.interaction.keyUp(h.key('ArrowRight'));
  assert.deepEqual(h.drawing.getState().draft?.vertices, [[1.64, 1.5]]);
  h.drawing.undo();
  h.drawing.append([2, 2]);
  h.drawing.complete();
  assert.deepEqual(h.handles, []);
  h.interaction.keyDown(0, h.key('ArrowRight'));
  assert.deepEqual(h.drawing.getState().draft?.vertices, [[1, 1.5], [2, 2]]);
});

test('default and inert maps cannot start vertex editing', (t) => {
  const h = setup(t, 'default');
  h.fire('pointerdown'); h.tick();
  assert.equal(h.stops, 0);
  assert.deepEqual(h.handles, []);
  h.hide();
  h.interaction.keyDown(0, h.key('ArrowRight'));
  assert.equal(h.drawing.getState().canUndo, false);
});


test('element focus changes during pointer-down do not cancel pending editing; window blur still cancels', (t) => {
  const h = setup(t);
  h.fire('pointerdown');
  h.fire('blur', { target: h.canvas });
  h.tick();
  assert.equal(h.stops, 1);
  h.fire('pointermove', { clientX: 230 });
  h.fire('blur');
  assert.deepEqual(h.drawing.getState().draft?.vertices, [[1, 1.5]]);
});


test('unchanged holds and a drag returning to its start do not add Undo entries despite projection roundoff', (t) => {
  const h = setup(t);
  h.map.unproject = ([x, y]) => ({ lng: x / 100 + Number.EPSILON, lat: y / 100 });
  h.fire('pointerdown'); h.tick(); h.fire('pointerup', { buttons: 0 });
  assert.equal(h.drawing.getState().canUndo, false);
  h.fire('pointerdown'); h.tick(); h.fire('pointermove', { clientX: 230 }); h.fire('pointerup', { buttons: 0 });
  assert.deepEqual(h.drawing.getState().draft?.vertices, [[1, 1.5]]);
  assert.equal(h.drawing.getState().canUndo, false);
});
