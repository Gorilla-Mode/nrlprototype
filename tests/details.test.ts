import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createDetailsController, detailsPayload, type DetailsHooks, type DetailsPayload, type DraftSaveReason } from '../src/lib/reporting/createDetailsController.js';
import { ObstacleType, type Obstacle } from '../src/lib/reporting/obstacle.js';

const report: Obstacle = {
  id: 'geometry-report', type: ObstacleType.Other, height: 0, description: '',
  timestamp: new Date('2026-09-18T10:00:00Z'), gps_position: { lat: 60.4, lng: 5.3 },
  obstacle_position: { type: 'LineString', coordinates: [[5.3, 60.4], [5.4, 60.5]] },
};
function setup(hooks: DetailsHooks = {}) {
  const controller = createDetailsController({ onChange: () => {}, getHooks: () => hooks });
  controller.begin(report);
  const draft = () => {
    const value = controller.getState().draft;
    assert.ok(value);
    return value;
  };
  return { controller, draft };
}

test('defaults are unselected and clean; unchanged values and an untouched dismissal do not save', async () => {
  let calls = 0;
  const { controller, draft } = setup({ onSaveDraft: () => { calls++; } });
  assert.equal(draft().type, null);
  assert.equal(draft().height, 30);
  assert.equal(draft().illumination, 'unknown');
  assert.equal(draft().notPresent, false);
  controller.setHeight(30);
  controller.setNotPresent(false);
  assert.equal(draft().dirty, false);
  await controller.dismiss();
  assert.equal(calls, 0);
});

test('all types are selectable; whole-metre height is bounded, optional, and rejects nonfinite input', () => {
  const { controller, draft } = setup();
  for (const type of Object.values(ObstacleType)) {
    controller.setType(type);
    assert.equal(draft().type, type);
  }
  for (const [input, expected] of [[-1, 0], [501, 500], [42.7, 43], [0, 0], [500, 500]]) {
    controller.setHeight(input);
    assert.equal(draft().height, expected);
  }
  controller.setHeight(null);
  controller.setHeight(NaN);
  controller.setHeight(Infinity);
  assert.equal(draft().height, null);
  assert.equal('height' in detailsPayload(draft()), false);
  assert.equal(draft().dirty, true);
});

test('illumination cycles in order; absence blocks edits, omits inactive payload fields, and restores values', () => {
  const { controller, draft } = setup();
  for (const expected of ['illuminated', 'not-illuminated', 'unknown', 'illuminated']) {
    controller.cycleIllumination();
    assert.equal(draft().illumination, expected);
  }
  controller.setHeight(123);
  controller.setNotPresent(true);
  controller.setHeight(400);
  controller.cycleIllumination();
  const absent = detailsPayload(draft());
  assert.equal(absent.notPresent, true);
  assert.equal('height' in absent, false);
  assert.equal('illumination' in absent, false);
  controller.setNotPresent(false);
  assert.equal(draft().height, 123);
  assert.equal(draft().illumination, 'illuminated');
  assert.equal(detailsPayload(draft()).height, 123);
});

test('payload preserves report identity, timestamp, actual geometry and reporter GPS without mutating geometry-stage data', () => {
  const { controller, draft } = setup();
  controller.setType(ObstacleType.Bridge);
  controller.setHeight(75);
  const payload = detailsPayload(draft());
  assert.equal(payload.id, report.id);
  assert.equal(payload.timestamp, report.timestamp);
  assert.equal(payload.obstacle_position, report.obstacle_position);
  assert.equal(payload.gps_position, report.gps_position);
  assert.equal(report.type, ObstacleType.Other);
  assert.equal(report.height, 0);
  controller.begin({ ...report, gps_position: null });
  assert.equal(detailsPayload(draft()).gps_position, null);
});

test('explicit saves allow incomplete drafts and are distinct from dirty dismissals; resuming retains values', async () => {
  const calls: { payload: DetailsPayload; reason: DraftSaveReason }[] = [];
  const { controller, draft } = setup({ onSaveDraft: (payload, reason) => { calls.push({ payload, reason }); } });
  await controller.save();
  assert.equal(calls[0].reason, 'explicit');
  assert.equal(calls[0].payload.type, null);
  controller.setHeight(80);
  await controller.dismiss();
  assert.equal(controller.getState().open, false);
  assert.equal(calls[1].reason, 'dismissal');
  assert.equal(calls[1].payload.height, 80);
  assert.equal(draft().dirty, false);
  controller.resume();
  assert.equal(controller.getState().open, true);
  assert.equal(draft().height, 80);
  await controller.dismiss();
  assert.equal(calls.length, 2);
});

test('missing hooks retain dirty state and session values; deleting clears and prevents resumption', async () => {
  const { controller, draft } = setup();
  controller.setType(ObstacleType.Pole);
  await controller.save();
  await controller.continue();
  await controller.dismiss();
  controller.resume();
  assert.equal(draft().dirty, true);
  assert.equal(draft().type, ObstacleType.Pole);
  controller.clear();
  controller.resume();
  assert.equal(controller.getState().draft, null);
  assert.equal(controller.getState().open, false);
});

test('continue requires a type and uses the active payload without implying a save', async () => {
  const calls: DetailsPayload[] = [];
  const { controller, draft } = setup({ onContinue: (payload) => { calls.push(payload); } });
  await controller.continue();
  assert.equal(calls.length, 0);
  controller.setType(ObstacleType.Airspan);
  controller.setNotPresent(true);
  await controller.continue();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].type, ObstacleType.Airspan);
  assert.equal('height' in calls[0], false);
  assert.equal('illumination' in calls[0], false);
  assert.equal(draft().dirty, true);
});

test('callback failure retains dirty draft and exposes a retryable error, including dismissal', async () => {
  let fail = true;
  const { controller, draft } = setup({ onSaveDraft: () => { if (fail) throw new Error('unavailable'); } });
  controller.setHeight(60);
  await controller.dismiss();
  assert.match(controller.getState().error, /could not be completed/);
  assert.equal(draft().dirty, true);
  assert.equal(controller.getState().busy, false);
  controller.resume();
  fail = false;
  await controller.save();
  assert.equal(controller.getState().error, '');
  assert.equal(draft().dirty, false);
});

test('pending actions block duplicate saves and edits; stale completion cannot change a replacement draft', async () => {
  let resolve: () => void = () => {};
  let calls = 0;
  const { controller, draft } = setup({ onSaveDraft: () => { calls++; return new Promise<void>((done) => { resolve = done; }); } });
  controller.setHeight(45);
  const pending = controller.save();
  await controller.save();
  controller.setHeight(46);
  assert.equal(draft().height, 45);
  assert.equal(calls, 1);
  controller.clear();
  controller.begin({ ...report, id: 'replacement' });
  controller.setHeight(90);
  resolve();
  await pending;
  assert.equal(draft().report.id, 'replacement');
  assert.equal(draft().dirty, true);
  assert.equal(draft().height, 90);
});
