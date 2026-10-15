import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isReportsHash, reportsRoute } from '../src/lib/reports/reports.js';
import { settingsSectionFromHash } from '../src/lib/settings/settings.js';
import { countForStatusTab, formatLongDate, formatSentAt, isSent, isoDate, relativeDate, reportActionLabel, reportActivity, reportProgressLine, reportSecondaryLine, reports, statusTabs } from '../src/lib/reports/reportsData.js';
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

test('status tab counts are derived from the report data, with Sent covering everything already sent', () => {
  assert.deepEqual(statusTabs.map((tab) => tab.label), ['All', 'Drafts', 'Ready to send', 'Sent']);
  assert.equal(reports.length, 10);
  assert.equal(countForStatusTab(reports, 'all'), 10);
  assert.equal(countForStatusTab(reports, 'ready'), 4);
  assert.equal(countForStatusTab(reports, 'sent'), 6);
  assert.equal(countForStatusTab(reports, 'ready') + countForStatusTab(reports, 'sent'), countForStatusTab(reports, 'all'));
  for (const report of reports) assert.equal(isSent(report), report.status !== 'ready');
});

test('sent dates read as full dates, with the time of sending in the confirmation', () => {
  assert.equal(formatLongDate('14.10.2024'), '14 October 2024');
  assert.equal(formatLongDate(undefined), '');
  assert.equal(formatSentAt(new Date(2026, 9, 9, 14, 32)), '9 Oct 2026, 14:32');
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

test('cards show relative edit times, keeping the exact date available', () => {
  const now = new Date(2026, 9, 9, 15, 30);
  assert.equal(relativeDate('09.10.2026', now), 'today');
  assert.equal(relativeDate('08.10.2026', now), 'yesterday');
  assert.equal(relativeDate('06.10.2026', now), '3 days ago');
  assert.equal(relativeDate('25.09.2026', now), '2 weeks ago');
  assert.equal(relativeDate('09.07.2026', now), '3 months ago');
  assert.equal(relativeDate('14.10.2024', now), '2 years ago');
  assert.equal(relativeDate('not a date', now), 'not a date');
  assert.equal(isoDate('14.10.2024'), '2024-10-14');
  assert.equal(isoDate(undefined), undefined);
});

test('each card shows one activity line: edited or sent with relative time, or the reviewer', () => {
  const now = new Date(2026, 9, 9);
  for (const report of reports) {
    const activity = reportActivity(report, now);
    if (report.status === 'ready') assert.deepEqual(activity, { text: `Edited ${relativeDate(report.secondaryDate!, now)}`, date: report.secondaryDate });
    else if (report.status === 'pending') assert.deepEqual(activity, { text: `Sent ${relativeDate(report.secondaryDate!, now)}`, date: report.secondaryDate });
    else assert.deepEqual(activity, { text: `Reviewer ${report.reviewer}` });
    assert.doesNotMatch(activity.text, /Created/);
  }
});

test('every report card gets a third line for its status, like a draft step line', () => {
  const lines = Object.fromEntries(reports.map((report) => [report.status, reportProgressLine(report)]));
  assert.deepEqual(lines, {
    ready: 'All steps complete',
    pending: 'Awaiting review by Kartverket',
    approved: 'Added to the register',
    declined: 'Not added to the register',
  });
});
