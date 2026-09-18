import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createDetailsController, detailsPayload, detailsStepFromHash, type DetailsHooks, type DetailsPayload, type DraftSaveReason } from '../src/lib/reporting/createDetailsController.js';
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

test('all types are selectable; required whole-metre height is bounded and rejects nonfinite input', () => {
  const { controller, draft } = setup();
  for (const type of Object.values(ObstacleType)) {
    controller.setType(type);
    assert.equal(draft().type, type);
  }
  for (const [input, expected] of [[-1, 0], [501, 500], [42.7, 43], [0, 0], [500, 500]]) {
    controller.setHeight(input);
    assert.equal(draft().height, expected);
  }
  controller.setHeight(NaN);
  controller.setHeight(Infinity);
  assert.equal(draft().height, 500);
  assert.equal(detailsPayload(draft()).height, 500);
  controller.setHeight(0);
  const payload = detailsPayload(draft());
  assert.equal(payload.notPresent, false);
  if (!payload.notPresent) {
    const requiredHeight: number = payload.height;
    assert.equal(requiredHeight, 0);
  }
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
  assert.equal(calls[0].payload.height, 30);
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

test('Continue navigates without a hook; resume restores the last step and incomplete drafts stay on step 1', async () => {
  const { controller, draft } = setup();
  assert.equal(detailsStepFromHash('#/Report/additional-information'), 2);
  assert.equal(detailsStepFromHash('#/Report/details'), 1);
  assert.equal(detailsStepFromHash('#/Reports'), null);
  controller.resume(2);
  assert.equal(controller.getState().step, 1);
  assert.equal(await controller.continue(), false);
  controller.setType(ObstacleType.Other);
  assert.equal(await controller.continue(), true);
  controller.setCustomType('Crane');
  controller.setDescription('Near the bridge');
  await controller.dismiss();
  controller.resume();
  assert.equal(controller.getState().step, 2);
  controller.resume(1);
  assert.equal(draft().customType, 'Crane');
  assert.equal(draft().description, 'Near the bridge');
  await controller.dismiss();
  controller.resume();
  assert.equal(controller.getState().step, 1);
  controller.clear();
  controller.resume(2);
  assert.equal(controller.getState().open, false);
});

test('Continue waits for its hook, retries failures, and never reopens a dismissed draft', async () => {
  let reject: (error: Error) => void = () => {};
  let resolve: () => void = () => {};
  const { controller } = setup({ onContinue: () => new Promise<void>((done, fail) => { resolve = done; reject = fail; }) });
  controller.setType(ObstacleType.Pole);
  const first = controller.continue();
  assert.equal(controller.getState().step, 1);
  assert.equal(controller.getState().busy, true);
  reject(new Error('offline'));
  assert.equal(await first, false);
  assert.match(controller.getState().error, /retry/);
  const second = controller.continue();
  resolve();
  assert.equal(await second, true);
  controller.resume(1);
  const third = controller.continue();
  await controller.dismiss();
  resolve();
  assert.equal(await third, false);
  assert.equal(controller.getState().open, false);
  assert.equal(controller.getState().step, 1);
});

test('custom type survives type changes but only enters active payloads for Other; fields are optional', async () => {
  const calls: DetailsPayload[] = [];
  const { controller, draft } = setup({ onFinish: (payload) => { calls.push(payload); } });
  controller.setType(ObstacleType.Other);
  controller.setCustomType('Crane');
  assert.equal(detailsPayload(draft()).customType, 'Crane');
  controller.setType(ObstacleType.Bridge);
  assert.equal('customType' in detailsPayload(draft()), false);
  assert.equal(draft().customType, 'Crane');
  controller.setType(ObstacleType.Other);
  controller.setCustomType('');
  await controller.continue();
  assert.equal(await controller.finish(), true);
  assert.equal(calls[0].customType, '');
  assert.equal(calls[0].description, '');
  assert.deepEqual(calls[0].photos, []);
});

test('photos keep original files, reject an entire excess selection, support removal and ignore cancellation', async () => {
  const { controller, draft } = setup();
  const files = ['one.jpg', 'two.jpg', 'three.jpg', 'four.jpg'].map((name) => new File(['original'], name, { type: 'image/jpeg' }));
  const untouched = draft();
  controller.addPhotos([]);
  assert.equal(draft(), untouched);
  controller.addPhotos(files.slice(0, 2));
  assert.equal(draft().photos[0], files[0]);
  controller.addPhotos(files.slice(2));
  assert.equal(draft().photos.length, 2);
  assert.match(controller.getState().error, /1 more photo/);
  controller.addPhotos([files[2]]);
  controller.addPhotos([files[3]]);
  assert.equal(draft().photos.length, 3);
  assert.match(controller.getState().error, /Remove one/);
  const full = draft();
  controller.addPhotos([]);
  controller.removePhoto(-1);
  controller.removePhoto(0.5);
  controller.removePhoto(3);
  assert.equal(draft(), full);
  controller.removePhoto(0);
  controller.addPhotos([files[0]]);
  assert.deepEqual(draft().photos, [files[1], files[2], files[0]]);
  const payload = detailsPayload(draft());
  assert.notEqual(payload.photos, draft().photos);
  assert.equal(payload.photos[2], files[0]);
  assert.equal(await payload.photos[2].text(), 'original');
  await controller.dismiss();
  controller.resume();
  assert.equal(draft().photos[2], files[0]);
});

test('explicit and dismissal saves include additional information and preserve metadata and absence', async () => {
  const calls: { payload: DetailsPayload; reason: DraftSaveReason }[] = [];
  const { controller } = setup({ onSaveDraft: (payload, reason) => { calls.push({ payload, reason }); } });
  controller.setType(ObstacleType.Other);
  await controller.continue();
  controller.setCustomType('Crane');
  controller.setDescription('Original description');
  const photo = new File(['original'], 'crane.jpg');
  controller.addPhotos([photo]);
  controller.setNotPresent(true);
  await controller.save();
  controller.setDescription('Updated description');
  await controller.dismiss();
  assert.deepEqual(calls.map(({ reason }) => reason), ['explicit', 'dismissal']);
  assert.equal(calls[0].payload.description, 'Original description');
  assert.equal(calls[1].payload.description, 'Updated description');
  for (const { payload } of calls) {
    assert.equal(payload.customType, 'Crane');
    assert.equal(payload.photos[0], photo);
    assert.equal(payload.id, report.id);
    assert.equal(payload.timestamp, report.timestamp);
    assert.equal(payload.obstacle_position, report.obstacle_position);
    assert.equal(payload.gps_position, report.gps_position);
    assert.equal('height' in payload, false);
    assert.equal('illumination' in payload, false);
  }
});

test('Finish requires a hook and step 2; failure retains edits and retry success clears the draft', async () => {
  let fail = true;
  let calls = 0;
  const hooks: DetailsHooks = {};
  const { controller, draft } = setup(hooks);
  controller.setType(ObstacleType.Pole);
  assert.equal(await controller.finish(), false);
  await controller.continue();
  assert.equal(await controller.finish(), false);
  hooks.onFinish = (payload) => {
    calls++;
    assert.equal(payload.description, 'Keep this');
    if (fail) throw new Error('offline');
  };
  controller.setDescription('Keep this');
  const before = draft();
  assert.equal(await controller.finish(), false);
  assert.equal(draft(), before);
  assert.equal(controller.getState().open, true);
  assert.match(controller.getState().error, /retry/);
  fail = false;
  assert.equal(await controller.finish(), true);
  assert.equal(calls, 2);
  assert.equal(controller.getState().draft, null);
  assert.equal(controller.getState().open, false);
});

test('pending Finish prevents duplicate actions and edits; stale completion cannot clear a new report', async () => {
  let resolve: () => void = () => {};
  let calls = 0;
  const { controller, draft } = setup({ onFinish: () => { calls++; return new Promise<void>((done) => { resolve = done; }); } });
  controller.setType(ObstacleType.Other);
  await controller.continue();
  const pending = controller.finish();
  assert.equal(await controller.finish(), false);
  controller.setDescription('blocked');
  controller.setCustomType('blocked');
  controller.addPhotos([new File([], 'blocked.jpg')]);
  assert.equal(draft().description, '');
  assert.equal(draft().customType, '');
  assert.equal(draft().photos.length, 0);
  controller.clear();
  controller.begin({ ...report, id: 'replacement' });
  resolve();
  assert.equal(await pending, false);
  assert.equal(calls, 1);
  assert.equal(draft().report.id, 'replacement');
});
