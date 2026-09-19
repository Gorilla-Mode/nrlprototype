import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createDetailsController, type DetailsHooks, type CompleteReport, type ReportingContext } from '../src/lib/reporting/createDetailsController.js';
import { ObstacleType } from '../src/lib/reporting/obstacle.js';
import { reportingSettings, reportingVariantUrl, resolveReportingRoute, detailsRoute, additionalInformationRoute, summaryRoute, type ReportingVariant } from '../src/lib/reporting/reporting.js';
import { oneStep, twoStep, report } from './helpers/reporting.js';

const variants = [oneStep, twoStep];

test('one-step is the default; explicit variants work independently of the debug UI', () => {
  for (const search of ['', '?reporting=', '?reporting=unregistered', '?debug=true']) {
    assert.deepEqual(reportingSettings(search, variants), { variant: oneStep, debug: false });
  }
  assert.deepEqual(reportingSettings('?reporting=two-step', variants), { variant: twoStep, debug: false });
  assert.deepEqual(reportingSettings('?debug=1&reporting=two-step&unrelated=kept', variants), { variant: twoStep, debug: true });
});

test('switching updates only the variant parameter and preserves deployment paths, other parameters and the route', () => {
  assert.equal(reportingVariantUrl('https://example.test/prototype/?debug=1&x=a%20b&reporting=two-step#/Settings', oneStep),
    '/prototype/?debug=1&x=a+b&reporting=one-step#/Settings');
});

test('routes respect the active variant and required type; absent session data cannot be resurrected', () => {
  assert.deepEqual(resolveReportingRoute(additionalInformationRoute, oneStep, true, false), { kind: 'details', step: 1, hash: detailsRoute });
  assert.deepEqual(resolveReportingRoute(additionalInformationRoute, twoStep, false, false), { kind: 'details', step: 1, hash: detailsRoute });
  assert.deepEqual(resolveReportingRoute(additionalInformationRoute, twoStep, true, false), { kind: 'details', step: 2, hash: additionalInformationRoute });
  for (const hash of [detailsRoute, additionalInformationRoute, summaryRoute]) {
    assert.deepEqual(resolveReportingRoute(hash, null, false, false), { kind: 'map' });
  }
  assert.deepEqual(resolveReportingRoute(summaryRoute, null, false, true), { kind: 'summary' });
  assert.equal(resolveReportingRoute('#/Reports', null, false, false), null);
  assert.equal(resolveReportingRoute('#/Settings', twoStep, true, false), null);
});

test('a report captures its variant before geometry and GPS finish; later preferences do not change it', async () => {
  const controller = createDetailsController({ onChange: () => {} });
  let selected = oneStep;
  controller.start(selected);
  selected = twoStep;
  const pinned = controller.getState().variant;
  assert.equal(pinned, oneStep);
  assert.ok(pinned);
  controller.begin(report, pinned);
  await controller.dismiss();
  controller.resume();
  assert.equal(controller.getState().variant, oneStep);
  controller.clear();
  controller.start(selected);
  assert.equal(controller.getState().variant, twoStep);
});

for (const variant of variants) {
  test(`${variant.id}: complete uses the common payload and variant context, then releases its result on close`, async () => {
    const calls: { payload: CompleteReport; context: ReportingContext }[] = [];
    const controller = createDetailsController({ onChange: () => {}, getHooks: () => ({ onFinish: (payload, context) => { calls.push({ payload, context }); } }) });
    controller.begin(report, variant);
    assert.equal(await controller.finish(), false);
    controller.setType(ObstacleType.Construction);
    controller.setHeight(500);
    controller.setDescription('A crane');
    const photo = new File(['original'], 'crane.jpg', { type: 'image/jpeg' });
    controller.addPhotos([photo]);
    for (let step = 1; step < variant.stepRoutes.length; step++) {
      assert.equal(await controller.finish(), false);
      assert.equal(await controller.continue(), true);
    }
    assert.equal(await controller.continue(), false);
    assert.equal(await controller.finish(), true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].payload.height, 500);
    assert.equal(calls[0].payload.photos[0], photo);
    assert.equal(calls[0].payload.obstacle_position, report.obstacle_position);
    assert.equal(calls[0].payload.gps_position, null);
    assert.deepEqual(calls[0].context, { variantId: variant.id });
    assert.equal(controller.getState().draft, null);
    assert.equal(controller.getState().summaryOpen, true);
    assert.equal(controller.getState().result?.report, calls[0].payload);
    controller.closeSummary();
    controller.resume();
    assert.equal(controller.getState().result, null);
    assert.equal(controller.getState().open, false);
  });

  test(`${variant.id}: session save closes without losing a draft; failure remains editable and can be retried`, async () => {
    let fail = true;
    const hooks: DetailsHooks = { onSaveDraft: () => { if (fail) throw new Error('failed'); } };
    const controller = createDetailsController({ onChange: () => {}, getHooks: () => hooks });
    controller.begin(report, variant);
    controller.setHeight(99);
    assert.equal(await controller.saveAndDismiss(), false);
    assert.equal(controller.getState().open, true);
    fail = false;
    assert.equal(await controller.saveAndDismiss(), true);
    assert.equal(controller.getState().open, false);
    assert.equal(controller.getState().draft?.dirty, false);
    controller.resume();
    assert.equal(controller.getState().draft?.height, 99);
    assert.equal(controller.getState().variant, variant);
  });
}

test('a registered third flow can navigate and finish at its own final step', async () => {
  const third: ReportingVariant = { id: 'three-step', label: 'Three steps', stepRoutes: [detailsRoute, additionalInformationRoute, '#/Report/review'] };
  assert.equal(reportingSettings('?reporting=three-step', [...variants, third]).variant, third);
  const controller = createDetailsController({ onChange: () => {}, getHooks: () => ({ onFinish: () => {} }) });
  controller.begin(report, third);
  controller.setType(ObstacleType.Bridge);
  controller.resume(100);
  assert.equal(controller.getState().step, 1);
  assert.equal(await controller.continue(), true);
  assert.equal(await controller.finish(), false);
  assert.equal(await controller.continue(), true);
  assert.equal(controller.getState().step, 3);
  assert.deepEqual(resolveReportingRoute('#/Report/review', third, true, false), { kind: 'details', step: 3, hash: '#/Report/review' });
  assert.equal(await controller.finish(), true);
});

test('finishing after dismissal never reopens a modal; a replacement report survives stale completion', async () => {
  let resolve: () => void = () => {};
  const controller = createDetailsController({ onChange: () => {}, getHooks: () => ({ onFinish: () => new Promise<void>((done) => { resolve = done; }) }) });
  controller.begin(report, oneStep);
  controller.setType(ObstacleType.Bridge);
  const pending = controller.finish();
  await controller.dismiss();
  resolve();
  assert.equal(await pending, true);
  assert.equal(controller.getState().summaryOpen, false);
  assert.equal(controller.getState().result, null);
  controller.begin(report, oneStep);
  controller.setType(ObstacleType.Other);
  const stale = controller.finish();
  controller.start(twoStep);
  controller.begin({ ...report, id: 'replacement' }, twoStep);
  resolve();
  assert.equal(await stale, false);
  assert.equal(controller.getState().draft?.report.id, 'replacement');
  assert.equal(controller.getState().variant, twoStep);
});
