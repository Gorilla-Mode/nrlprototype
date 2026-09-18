import assert from 'node:assert/strict';
import { test } from 'node:test';
import { displayUnitToMeters, formatHeightLabel, metersToDisplayUnit } from '../src/lib/reporting/obstacleReportDraft.js';
import { createDetailsController } from '../src/lib/reporting/createDetailsController.js';
import { oneStep, report } from './helpers/reporting.js';

test('unit conversion keeps canonical metres, including the 500 m / 1640 ft boundary', () => {
  for (const metres of [0, 1, 30, 50, 300, 500]) {
    assert.equal(Math.round(displayUnitToMeters(metersToDisplayUnit(metres, 'ft'), 'ft')), metres);
    assert.equal(displayUnitToMeters(metres, 'm'), metres);
  }
  assert.equal(formatHeightLabel(500, 'ft'), '1640 ft');
  assert.equal(formatHeightLabel(30, 'm'), '30 m');
});

test('typed display values use the shared height validation without changing the draft contract', () => {
  const controller = createDetailsController({ onChange: () => {} });
  controller.begin(report, oneStep);
  assert.equal(controller.getState().draft?.height, 30);
  controller.setHeight(displayUnitToMeters(1640, 'ft'));
  assert.equal(controller.getState().draft?.height, 500);
  controller.setHeight(displayUnitToMeters(0, 'ft'));
  assert.equal(controller.getState().draft?.height, 0);
  controller.setHeight(displayUnitToMeters(9999, 'ft'));
  assert.equal(controller.getState().draft?.height, 500);
  controller.setHeight(Number.NaN);
  assert.equal(controller.getState().draft?.height, 500);
});
