import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { createPositionDragInteraction, positionHandleRadius } from '../src/lib/map/createPositionDragInteraction.js';

function setup(t: TestContext, center: { x: number; y: number } | null = { x: 200, y: 200 }) {
  const view = new EventTarget();
  const canvas = Object.assign(new EventTarget(), {
    ownerDocument: { defaultView: view },
    style: { cursor: '' },
    captured: new Set<number>(),
    getBoundingClientRect: () => ({ left: 0, top: 0 }),
    setPointerCapture(id: number) { this.captured.add(id); },
    hasPointerCapture(id: number) { return this.captured.has(id); },
    releasePointerCapture(id: number) { this.captured.delete(id); },
  });
  let panEnabled = true;
  const map = {
    getCanvas: () => canvas,
    stop() {},
    dragPan: { isEnabled: () => panEnabled, enable: () => { panEnabled = true; }, disable: () => { panEnabled = false; } },
  };
  const moves: [number, number][] = [];
  const dragging: boolean[] = [];
  const interaction = createPositionDragInteraction(map as unknown as MapLibreMap, {
    getCenter: () => center,
    onMove: (x, y) => moves.push([x, y]),
    onDragChange: (value) => dragging.push(value),
  });
  t.after(() => interaction.destroy());
  function fire(type: string, init: Record<string, unknown> = {}) {
    const event = new Event(type, { cancelable: true });
    for (const [key, value] of Object.entries({ target: canvas, pointerId: 1, pointerType: 'touch', isPrimary: true, button: 0, clientX: 200, clientY: 200, ...init })) {
      Object.defineProperty(event, key, { value });
    }
    view.dispatchEvent(event);
  }
  return { interaction, fire, moves, dragging, panEnabled: () => panEnabled };
}

test('a press on the handle drags the circle instead of panning the map', (t) => {
  const h = setup(t);
  h.interaction.setEnabled(true);
  h.fire('pointerdown', { clientX: 200 + positionHandleRadius - 1 });
  assert.equal(h.panEnabled(), false);
  h.fire('pointermove', { clientX: 260, clientY: 230 });
  assert.deepEqual(h.moves, [[200 + 260 - (200 + positionHandleRadius - 1), 230]]);
  h.fire('pointerup');
  assert.equal(h.panEnabled(), true);
  assert.deepEqual(h.dragging, [true, false]);
});

test('presses outside the handle, or while disabled, leave the map alone', (t) => {
  const h = setup(t);
  h.fire('pointerdown');
  h.fire('pointermove', { clientX: 260 });
  h.fire('pointerup');
  h.interaction.setEnabled(true);
  h.fire('pointerdown', { clientX: 200 + positionHandleRadius + 1 });
  h.fire('pointermove', { clientX: 300 });
  assert.deepEqual(h.moves, []);
  assert.equal(h.panEnabled(), true);
});

test('a second finger hands the gesture to the map for pinch-zoom', (t) => {
  const h = setup(t);
  h.interaction.setEnabled(true);
  h.fire('pointerdown');
  h.fire('pointerdown', { pointerId: 2, isPrimary: false, clientX: 500 });
  assert.equal(h.panEnabled(), true);
  h.fire('pointermove', { clientX: 260 });
  assert.deepEqual(h.moves, []);
  assert.deepEqual(h.dragging, [true, false]);
});

test('disabling mid-drag ends the drag and restores panning', (t) => {
  const h = setup(t);
  h.interaction.setEnabled(true);
  h.fire('pointerdown');
  h.interaction.setEnabled(false);
  assert.equal(h.panEnabled(), true);
  assert.deepEqual(h.dragging, [true, false]);
});
