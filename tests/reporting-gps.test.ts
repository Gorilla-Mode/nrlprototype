import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createReportController } from '../src/lib/reporting/createReportController.js';
import { createDetailsController, type DetailsHooks, type DetailsPayload, type CompleteReport } from '../src/lib/reporting/createDetailsController.js';
import { createGeolocationController } from '../src/lib/map/createGeolocationController.js';
import { reportingSettings, resolveReportingRoute } from '../src/lib/reporting/reporting.js';
import { ObstacleType, type Obstacle } from '../src/lib/reporting/obstacle.js';
import { oneStep, oneStepKeypad, twoStep, twoStepKeypad, report } from './helpers/reporting.js';
import { position } from './helpers/geolocation.js';

function setup(hooks: DetailsHooks = {}, variant = twoStep) {
  let settle!: (position: Obstacle['gps_position']) => void;
  const ready = new Promise<Obstacle['gps_position']>((resolve) => { settle = resolve; });
  const controller = createDetailsController({ onChange: () => {}, getHooks: () => hooks });
  controller.begin(report, variant, ready);
  return { controller, settle };
}

for (const variant of [oneStep, oneStepKeypad, twoStep, twoStepKeypad]) {
  for (const debug of [false, true]) {
    for (const tracking of [false, true]) {
      test(`${variant.id}, debug=${debug}, tracking=${tracking}: details open before reporter GPS, only Finish waits`, async (t) => {
        let reporterSuccess!: PositionCallback;
        let watchSuccess!: PositionCallback;
        const watched: GeolocationPosition[] = [];
        const finished: CompleteReport[] = [];
        const geo: Geolocation = {
          getCurrentPosition(success) { reporterSuccess = success; },
          watchPosition(success) { watchSuccess = success; return 0; },
          clearWatch() {},
        };
        for (const [key, value] of Object.entries({ window: { isSecureContext: true }, navigator: { geolocation: geo } })) {
          const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
          Object.defineProperty(globalThis, key, { value, configurable: true });
          t.after(() => {
            if (descriptor) Object.defineProperty(globalThis, key, descriptor);
            else Reflect.deleteProperty(globalThis, key);
          });
        }
        const geolocation = createGeolocationController({
          onStateChange() {}, onPosition: (fix) => watched.push(fix), onRecenter() {}, onClear() {},
        });
        t.after(() => geolocation.destroy());
        if (tracking) { geolocation.toggle(); watchSuccess(position(6, 61)); }
        const settings = reportingSettings(`?reporting=${variant.id}${debug ? '&debug=1' : ''}`, [oneStep, oneStepKeypad, twoStep, twoStepKeypad]);
        const details = createDetailsController({
          onChange() {}, getHooks: () => ({ onFinish: (payload) => { finished.push(payload); } }),
        });
        details.start(settings.variant);
        const reporting = createReportController({
          createId: () => report.id,
          onRegister: (obstacle, ready) => details.begin(obstacle, settings.variant, ready),
        });
        t.after(() => reporting.destroy());
        reporting.start();
        reporting.complete(report.obstacle_position);
        assert.equal(details.getState().open, true);
        assert.equal(details.getState().busy, false);
        assert.equal(details.getState().draft?.report.gps_position, null, 'map tracking is not reporter GPS');
        assert.equal(resolveReportingRoute(variant.stepRoutes[0], details.getState().variant, false, false)?.kind, 'details');
        details.setType(ObstacleType.Bridge);
        assert.equal(settings.variant, debug ? variant : oneStepKeypad);
        if (settings.variant.stepRoutes.length > 1) assert.equal(await details.continue(), true);
        const finish = details.finish();
        assert.equal(details.getState().busy, true);
        assert.equal(await details.finish(), false);
        assert.equal(finished.length, 0);
        if (tracking) watchSuccess(position(7, 62));
        assert.equal(finished.length, 0, 'watch updates do not settle reporter GPS');
        reporterSuccess(position(5.31, 60.39));
        assert.equal(await finish, true);
        assert.equal(finished.length, 1);
        assert.deepEqual(finished[0].gps_position, { lat: 60.39, lng: 5.31 });
        assert.equal(finished[0].obstacle_position, report.obstacle_position);
        assert.equal(details.getState().summaryOpen, true);
        if (tracking) {
          watchSuccess(position());
          assert.equal(watched.length, 3, 'report completion leaves map tracking running');
        }
      });
    }
  }
}

test('late GPS preserves edits, navigation and saved snapshots without triggering hooks', async () => {
  const saved: DetailsPayload[] = [];
  const continued: DetailsPayload[] = [];
  const { controller, settle } = setup({
    onSaveDraft: (payload) => { saved.push(payload); },
    onContinue: (payload) => { continued.push(payload); },
  });
  controller.setType(ObstacleType.Other);
  controller.setHeight(123);
  controller.cycleIllumination();
  controller.setCustomType('Crane');
  controller.setDescription('Keep this');
  controller.addPhotos([new File(['original'], 'photo.jpg')]);
  assert.equal(await controller.continue(), true);
  assert.equal(await controller.saveAndDismiss(), true);
  const before = controller.getState();
  settle({ lat: 60.39, lng: 5.31 });
  await Promise.resolve();
  const after = controller.getState();
  assert.deepEqual(after, {
    ...before, draft: { ...before.draft, report: { ...report, gps_position: { lat: 60.39, lng: 5.31 } } },
  });
  assert.equal(saved.length, 1);
  assert.equal(continued.length, 1);
  assert.equal(saved[0].gps_position, null);
  assert.equal(continued[0].gps_position, null);
  assert.equal(report.gps_position, null);
  controller.resume();
  assert.equal(controller.getState().step, 2);
  assert.equal(controller.getState().draft?.description, 'Keep this');
});

test('GPS arriving during an external save preserves the payload and the dirty state', async () => {
  let resolveSave!: () => void;
  let saved: DetailsPayload | undefined;
  const { controller, settle } = setup({ onSaveDraft: (payload) => {
    saved = payload;
    return new Promise<void>((resolve) => { resolveSave = resolve; });
  } });
  controller.setDescription('Edited');
  const saving = controller.save();
  settle({ lat: 60, lng: 5 });
  await Promise.resolve();
  assert.equal(saved?.gps_position, null);
  assert.equal(controller.getState().draft?.dirty, true);
  assert.equal(controller.getState().busy, true);
  resolveSave();
  assert.equal(await saving, true);
  assert.equal(controller.getState().draft?.dirty, false);
  assert.deepEqual(controller.getState().draft?.report.gps_position, { lat: 60, lng: 5 });
});

for (const interruption of ['dismiss', 'step', 'clear', 'replace'] as const) {
  test(`${interruption} during the GPS wait prevents a stale Finish and summary`, async () => {
    let calls = 0;
    const { controller, settle } = setup({ onFinish: () => { calls++; } });
    controller.setType(ObstacleType.Pole);
    await controller.continue();
    const finish = controller.finish();
    if (interruption === 'dismiss') await controller.dismiss();
    if (interruption === 'step') controller.resume(1);
    if (interruption === 'clear') controller.clear();
    // Reusing the ID exercises the generation guard as well as report identity.
    if (interruption === 'replace') controller.begin(report, oneStep);
    settle({ lat: 60, lng: 5 });
    assert.equal(await finish, false);
    assert.equal(calls, 0);
    assert.equal(controller.getState().summaryOpen, false);
    assert.equal(controller.getState().busy, false);
    if (interruption === 'dismiss') assert.equal(controller.getState().open, false);
    if (interruption === 'step') assert.equal(controller.getState().step, 1);
    if (interruption === 'clear') assert.equal(controller.getState().draft, null);
    if (interruption === 'replace') assert.equal(controller.getState().draft?.report.gps_position, null);
  });
}

test('GPS failure permits Finish, and an external hook failure can be retried with the same draft', async () => {
  let fail = true;
  const payloads: CompleteReport[] = [];
  const { controller, settle } = setup({ onFinish: (payload) => {
    payloads.push(payload);
    if (fail) throw new Error('offline');
  } }, oneStep);
  controller.setType(ObstacleType.Pole);
  controller.setDescription('Keep on retry');
  const finish = controller.finish();
  settle(null);
  assert.equal(await finish, false);
  assert.equal(controller.getState().busy, false);
  assert.equal(controller.getState().draft?.description, 'Keep on retry');
  assert.match(controller.getState().error, /retry/);
  assert.equal(payloads[0].gps_position, null);
  fail = false;
  assert.equal(await controller.finish(), true);
  assert.deepEqual(payloads[1], payloads[0]);
  assert.equal(controller.getState().summaryOpen, true);
});

test('application teardown releases pending GPS without calling Finish', async () => {
  let calls = 0;
  const details = createDetailsController({
    onChange() {}, getHooks: () => ({ onFinish: () => { calls++; } }),
  });
  const reporting = createReportController({
    requestPosition() {}, createId: () => report.id,
    onRegister: (obstacle, ready) => details.begin(obstacle, oneStep, ready),
  });
  reporting.start();
  reporting.complete(report.obstacle_position);
  details.setType(ObstacleType.Pole);
  const finish = details.finish();
  details.clear();
  reporting.destroy();
  assert.equal(await finish, false);
  assert.equal(calls, 0);
  assert.equal(details.getState().draft, null);
  assert.equal(details.getState().summaryOpen, false);
});
