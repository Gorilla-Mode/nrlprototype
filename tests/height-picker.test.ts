import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHeightPickerController } from '../src/lib/reporting/createHeightPickerController.js';

function harness() {
  let value = 30;
  let enabled = true;
  let reducedMotion = false;
  let pitch = 64;
  let frameId = 0;
  const frames = new Map<number, FrameRequestCallback>();
  const changes: number[] = [];
  const scrolls: ScrollToOptions[] = [];
  function rect(left: number, width: number): DOMRect {
    return { left, width, right: left + width, top: 0, bottom: 44, height: 44, x: left, y: 0, toJSON: () => ({}) };
  }
  const track = {
    scrollLeft: value * pitch, scrollWidth: 32300, clientWidth: 300,
    getBoundingClientRect: () => rect(20, track.clientWidth),
    scrollTo(options: ScrollToOptions) {
      scrolls.push(options);
      if (options.behavior === 'instant') track.scrollLeft = options.left ?? track.scrollLeft;
    },
  };
  const items = new Map(Array.from({ length: 501 }, (_, meters) => [meters, {
    getBoundingClientRect: () => rect(20 + track.clientWidth / 2 + meters * pitch - track.scrollLeft - 30, 60),
  }]));
  const controller = createHeightPickerController({
    track, items, getValue: () => value, enabled: () => enabled,
    onchange(next) { value = next; changes.push(next); controller.sync(next); },
    reducedMotion: () => reducedMotion,
    requestFrame(callback) { frames.set(++frameId, callback); return frameId; },
    cancelFrame(id) { frames.delete(id); },
  });
  return {
    controller, track, changes, scrolls, frames,
    get value() { return value; },
    set enabled(next: boolean) { enabled = next; },
    set reducedMotion(next: boolean) { reducedMotion = next; },
    set pitch(next: number) { pitch = next; },
    flush() { const queued = [...frames.values()]; frames.clear(); queued.forEach((callback) => callback(0)); },
  };
}

test('touch and momentum scrolling select the nearest center once per frame without recentering', () => {
  const h = harness();
  for (const position of [33.2, 36.7, 35.1]) {
    h.track.scrollLeft = position * 64;
    h.controller.scroll();
    h.controller.scroll();
    assert.equal(h.frames.size, 1);
    h.flush();
  }
  assert.deepEqual(h.changes, [33, 37, 35]);
  assert.deepEqual(h.scrolls, [], 'parent echoes must not fight native scrolling');
});

test('explicit selections retain their target throughout smooth centering', () => {
  const h = harness();
  h.controller.select(40);
  h.track.scrollLeft = 35 * 64;
  h.controller.scroll(); h.flush();
  assert.equal(h.value, 40);
  h.track.scrollLeft = 40 * 64;
  h.controller.scroll(); h.flush();
  assert.deepEqual(h.changes, [40]);
  assert.equal(h.scrolls.at(-1)?.left, 40 * 64);
});

test('touch interrupts an explicit animation and resumes live selection', () => {
  const h = harness();
  h.controller.select(40);
  h.track.scrollLeft = 35 * 64;
  h.controller.stop();
  h.track.scrollLeft = 34 * 64;
  h.controller.scroll(); h.flush();
  assert.equal(h.value, 34);
  assert.equal(h.scrolls.at(-1)?.behavior, 'instant');
  assert.equal(h.scrolls.at(-1)?.left, 35 * 64);
});

test('endpoints clamp and reduced motion centers immediately using measured geometry', () => {
  const h = harness();
  h.reducedMotion = true;
  h.controller.select(-1);
  assert.equal(h.value, 0);
  assert.equal(h.track.scrollLeft, 0);
  h.controller.select(501);
  assert.equal(h.value, 500);
  assert.equal(h.track.scrollLeft, 32000);
  assert.ok(h.scrolls.every(({ behavior }) => behavior === 'instant'));
});

test('resizing or changing units realigns the current value after a scroll-driven update', () => {
  const h = harness();
  h.track.scrollLeft = 33 * 64;
  h.controller.scroll(); h.flush();
  h.pitch = 60;
  h.track.clientWidth = 500;
  h.controller.sync(h.value, true);
  assert.equal(h.track.scrollLeft, 33 * 60);
  assert.deepEqual(h.changes, [33]);
});

test('disabled or closed pickers ignore pending scrolls and explicit selections; teardown cancels frames', () => {
  const h = harness();
  h.track.scrollLeft = 40 * 64;
  h.controller.scroll();
  h.enabled = false;
  h.flush();
  h.controller.select(50);
  assert.deepEqual(h.changes, []);
  h.enabled = true;
  h.controller.scroll();
  h.controller.stop();
  assert.equal(h.frames.size, 0);
});
