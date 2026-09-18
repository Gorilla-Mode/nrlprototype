import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isReportsHash, reportsRoute } from '../src/lib/reports/reports.js';
import { settingsSectionFromHash } from '../src/lib/settings/settings.js';
import { countForStatusTab, reportActionLabel, reportSecondaryLine, reports } from '../src/lib/reports/reportsData.js';

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
