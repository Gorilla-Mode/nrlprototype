import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { createMapHoldController, type HoldOrigin } from '../src/lib/map/createMapHoldController.js';

function setup(t: TestContext) {
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
  const origins: HoldOrigin[] = [];
  const moves: { x: number; y: number }[] = [];
  let closes = 0;
  let activations = 0;
  const controller = createMapHoldController(canvas as unknown as HTMLCanvasElement, {
    onActivate: () => activations++,
    onOpen: (origin) => origins.push(origin),
    onClose: () => closes++,
    onMove: (x, y) => moves.push({ x, y }),
  });
  t.after(() => controller.destroy());

  function fire(type: string, init: Record<string, unknown> = {}) {
    const event = new Event(type, { cancelable: true });
    const properties = {
      target: canvas, pointerId: 1, pointerType: 'mouse', isPrimary: true,
      button: 0, buttons: 1, clientX: 120, clientY: 180, detail: 1, ...init,
    };
    for (const [key, value] of Object.entries(properties)) {
      Object.defineProperty(event, key, { value });
    }
    (type === 'lostpointercapture' ? canvas : view).dispatchEvent(event);
    return event;
  }

  return {
    view, canvas, controller, fire, origins, moves,
    tick: (ms = 200) => t.mock.timers.tick(ms),
    get closes() { return closes; },
    get activations() { return activations; },
  };
}

for (const pointerType of ['mouse', 'touch', 'pen']) {
  test(`${pointerType}: opens after 200ms at initial press, drag/release never select or add points`, (t) => {
    const h = setup(t);
    h.fire('pointerdown', { pointerType });
    h.tick(199);
    assert.equal(h.origins.length, 0);
    h.tick(1);
    assert.deepEqual(h.origins, [{ x: 100, y: 150 }]);
    assert.equal(h.activations, 1);
    assert.ok(h.canvas.captured.has(1));
    h.fire('pointermove', { clientX: 190, clientY: 225, pointerType });
    assert.deepEqual(h.origins, [{ x: 100, y: 150 }]);
    h.fire('pointerup', { clientX: 190, clientY: 225, pointerType });
    assert.equal(h.closes, 1);
    assert.equal(h.canvas.captured.size, 0);
    h.tick();
    assert.equal(h.origins.length, 1);
  });
}

test('release in the safe zone closes the preview', (t) => {
  const h = setup(t);
  h.fire('pointerdown');
  h.tick();
  h.fire('pointerup');
  assert.equal(h.closes, 1);
});

test('only the held pointer supplies hover offsets, and movement stops being reported on release', (t) => {
  const h = setup(t);
  h.fire('pointerdown');
  h.fire('pointermove', { clientX: 123 });
  assert.deepEqual(h.moves, [], 'pending hold has no hover feedback');
  h.tick();
  h.fire('pointermove', { pointerId: 2, clientX: 190, clientY: 225 });
  assert.deepEqual(h.moves, [], 'unrelated pointers do not change hover');
  h.fire('pointermove', { clientX: 190, clientY: 225 });
  h.fire('pointermove');
  assert.deepEqual(h.moves, [{ x: 70, y: 45 }, { x: 0, y: 0 }]);
  assert.deepEqual(h.origins, [{ x: 100, y: 150 }], 'origin stays at the initial press');
  h.fire('pointerup');
  h.fire('pointermove', { clientX: 190, clientY: 225 });
  assert.equal(h.moves.length, 2);
});

test('short taps and movement over 8px cancel pending holds without blocking navigation', (t) => {
  const h = setup(t);
  h.fire('pointerdown');
  h.tick(100);
  h.fire('pointerup');
  h.tick();
  assert.equal(h.origins.length, 0);
  assert.equal(h.fire('click').defaultPrevented, false);
  h.fire('pointerdown');
  h.fire('pointermove', { clientX: 129 });
  assert.equal(h.fire('mousemove').defaultPrevented, false);
  h.tick();
  assert.equal(h.origins.length, 0);
});

test('small pointer jitter retains the original center; edge positions are not clamped', (t) => {
  const h = setup(t);
  h.fire('pointerdown', { clientX: 22, clientY: 33 });
  h.fire('pointermove', { clientX: 25, clientY: 37 });
  h.tick();
  assert.deepEqual(h.origins, [{ x: 2, y: 3 }]);
});

for (const input of [{ button: 2 }, { shiftKey: true }, { ctrlKey: true }, { isPrimary: false }, { target: new EventTarget() }]) {
  test(`controls and non-primary/modified inputs do not open the menu: ${JSON.stringify(input)}`, (t) => {
    const h = setup(t);
    h.fire('pointerdown', input);
    h.tick();
    assert.equal(h.origins.length, 0);
  });
}

for (const activated of [false, true]) {
  test(`a second touch cancels ${activated ? 'an open' : 'a pending'} hold and leaves pinch events available`, (t) => {
    const h = setup(t);
    h.fire('pointerdown', { pointerType: 'touch' });
    if (activated) h.tick();
    h.fire('pointerdown', { pointerId: 2, pointerType: 'touch', isPrimary: false });
    assert.equal(h.fire('touchstart').defaultPrevented, false);
    assert.equal(h.fire('touchmove').defaultPrevented, false);
    h.tick();
    assert.equal(h.origins.length, activated ? 1 : 0);
    assert.equal(h.closes, activated ? 1 : 0);
  });
}

test('navigation is blocked only while open, and the trailing click/contextmenu is consumed', (t) => {
  const h = setup(t);
  let navigationEvents = 0;
  h.view.addEventListener('mousemove', () => navigationEvents++);
  h.fire('pointerdown');
  assert.equal(h.fire('mousemove').defaultPrevented, false);
  h.tick();
  for (const type of ['mousemove', 'touchmove', 'wheel', 'keydown', 'contextmenu']) {
    assert.equal(h.fire(type).defaultPrevented, true, type);
  }
  assert.equal(navigationEvents, 1, 'MapLibre-style listeners never receive blocked events');
  h.fire('pointerup');
  assert.equal(h.fire('click').defaultPrevented, true);
  assert.equal(h.fire('contextmenu').defaultPrevented, true);
  for (const type of ['mousemove', 'touchmove', 'wheel', 'keydown']) {
    assert.equal(h.fire(type).defaultPrevented, false, type);
  }
  h.fire('pointerdown');
  h.fire('pointerup');
  assert.equal(h.fire('click').defaultPrevented, false, 'the next ordinary click works');
  assert.equal(h.fire('contextmenu').defaultPrevented, false, 'normal context menus work');
});

for (const cause of ['pointercancel', 'lostpointercapture', 'blur', 'Escape', 'map movement/resize', 'destroy']) {
  for (const activated of [false, true]) {
    test(`${cause} cleans up ${activated ? 'an open' : 'a pending'} hold and permits subsequent navigation`, (t) => {
      const h = setup(t);
      h.fire('pointerdown');
      if (activated) h.tick();
      if (cause === 'Escape') h.fire('keydown', { key: 'Escape' });
      else if (cause === 'map movement/resize') h.controller.cancel();
      else if (cause === 'destroy') { h.controller.destroy(); h.controller.destroy(); }
      else h.fire(cause);
      h.tick();
      assert.equal(h.origins.length, activated ? 1 : 0);
      assert.equal(h.closes, activated ? 1 : 0);
      assert.equal(h.canvas.captured.size, 0);
      assert.equal(h.fire('mousemove').defaultPrevented, false);
      assert.equal(h.fire('wheel').defaultPrevented, false);
      if (cause === 'destroy') {
        h.fire('pointerdown');
        h.tick();
        assert.equal(h.origins.length, activated ? 1 : 0);
        assert.equal(h.fire('click').defaultPrevented, false);
      }
    });
  }
}
