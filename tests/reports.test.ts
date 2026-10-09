import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isReportsHash, reportsRoute } from '../src/lib/reports/reports.js';
import { settingsSectionFromHash } from '../src/lib/settings/settings.js';
import { countForStatusTab, reportActionLabel, reportSecondaryLine, reports } from '../src/lib/reports/reportsData.js';
import { drafts } from '../src/lib/drafts/mockData.js';
import { lightingOptions, lightingSummary, lightingValueLabel, missingDraftFields } from '../src/lib/drafts/types.js';
import { PHOTO_MAX_EDGE, scaledSize } from '../src/lib/reports/photos.js';
import { ObstacleType, obstacleTypeChoices, obstacleTypeLabel } from '../src/lib/reporting/obstacle.js';

test('the Reports route resolves only for its own hash and never collides with Settings', () => {
  assert.equal(reportsRoute, '#/Reports');
  assert.equal(isReportsHash(reportsRoute), true);
  for (const hash of ['', '#', '#/FAQ', '#/Settings', '#/Settings/profile', '#/Reports/1', '#/reports']) {
    assert.equal(isReportsHash(hash), false);
  }
  assert.equal(settingsSectionFromHash(reportsRoute), null);
});

test('status tab counts are derived from the report data, with Reviewed combining approved and declined', () => {
  assert.equal(reports.length, 10);
  assert.equal(countForStatusTab(reports, 'all'), 10);
  assert.equal(countForStatusTab(reports, 'ready'), 4);
  assert.equal(countForStatusTab(reports, 'pending'), 3);
  assert.equal(countForStatusTab(reports, 'reviewed'), 3);
  assert.equal(
    countForStatusTab(reports, 'ready') + countForStatusTab(reports, 'pending') + countForStatusTab(reports, 'reviewed'),
    countForStatusTab(reports, 'all'),
  );
});

test('each report card follows the status rules for its second line and action label', () => {
  for (const report of reports) {
    const secondary = reportSecondaryLine(report);
    const action = reportActionLabel(report);
    if (report.status === 'ready') {
      assert.equal(secondary, `Edited ${report.secondaryDate}`);
      assert.equal(action, 'Review and send');
    } else if (report.status === 'pending') {
      assert.equal(secondary, `Sent ${report.secondaryDate}`);
      assert.equal(action, 'Open');
    } else {
      assert.equal(secondary, `Reviewer ${report.reviewer}`);
      assert.equal(action, 'Open');
    }
  }
});

test('every report and draft type is one of the shared obstacle type choices, labelled from that list', () => {
  const selectable = new Set<string>(obstacleTypeChoices.map((choice) => choice.type));
  for (const report of reports) assert.ok(selectable.has(report.obstacleType), `${report.name}: ${report.obstacleType}`);
  for (const draft of drafts) assert.ok(selectable.has(draft.category), `${draft.title}: ${draft.category}`);
  for (const choice of obstacleTypeChoices) assert.equal(obstacleTypeLabel(choice.type), choice.label);
  assert.equal(obstacleTypeLabel(ObstacleType.Airspan), 'Aerial Span');
});

test('lighting is optional: yes, no, unknown or not answered, each with its own label', () => {
  assert.deepEqual(lightingOptions.map((option) => option.label), ['Yes', 'No', 'Unknown']);
  assert.deepEqual(([...lightingOptions.map((option) => option.value), null] as const).map(lightingValueLabel), ['Lit', 'Not lit', 'Unknown', 'Not set']);
  assert.equal(lightingSummary('yes'), 'Lit — reported by pilot');
  assert.equal(lightingSummary('unknown'), 'Unknown');
  assert.equal(lightingSummary(null), 'Not set');
});

test('only height blocks sending a draft; any lighting answer, or none, can be sent', () => {
  const base = drafts[0];
  for (const lighting of [...lightingOptions.map((option) => option.value), null]) {
    assert.deepEqual(missingDraftFields({ ...base, heightAboveGround: '95 ft (29 m)', lighting }), [], `lighting ${lighting}`);
    assert.deepEqual(missingDraftFields({ ...base, heightAboveGround: 'Not set', lighting }), ['height above ground']);
  }
});

test('mock reports and drafts only use the supported lighting values', () => {
  const allowed = new Set<string | null>([...lightingOptions.map((option) => option.value), null]);
  for (const item of [...reports, ...drafts]) assert.ok(allowed.has(item.lighting), String(item.lighting));
  assert.ok(drafts.some((draft) => draft.lighting === null));
});

test('photos are downscaled to fit the longest edge, keeping aspect ratio and never upscaling', () => {
  assert.deepEqual(scaledSize(4032, 3024), { width: PHOTO_MAX_EDGE, height: 1200 });
  assert.deepEqual(scaledSize(3024, 4032), { width: 1200, height: PHOTO_MAX_EDGE });
  assert.deepEqual(scaledSize(800, 600), { width: 800, height: 600 });
  assert.deepEqual(scaledSize(5000, 2, 1000), { width: 1000, height: 1 });
});

test('photos are optional: every item starts with a photo list, and photos never block sending', () => {
  for (const item of [...reports, ...drafts]) assert.ok(Array.isArray(item.photos));
  const photo = { id: 'p1', name: 'mast.jpg', url: 'blob:x', width: 1600, height: 1200 };
  const ready = { ...drafts[1], heightAboveGround: '95 ft (29 m)' };
  assert.deepEqual(missingDraftFields({ ...ready, photos: [] }), []);
  assert.deepEqual(missingDraftFields({ ...ready, photos: [photo] }), []);
});
