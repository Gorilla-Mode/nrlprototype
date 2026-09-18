import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ObstacleType } from '../src/lib/reporting/obstacle.js';
import {
  canFinishReport,
  cycleLighting,
  emptyObstacleReportDraft,
  formatHeightLabel,
  metersToDisplayUnit,
  setHeight,
  setObstacleType,
  setOtherTypeLabel,
  toggleDescription,
  toggleHeightUnit,
  toggleNotPresent,
  type ObstacleReportDraft,
} from '../src/lib/reporting/obstacleReportDraft.js';

test('a fresh draft cannot finish until a type is chosen', () => {
  assert.equal(canFinishReport(emptyObstacleReportDraft), false);
  const withType = setObstacleType(emptyObstacleReportDraft, ObstacleType.Bridge);
  assert.equal(canFinishReport(withType), true, 'default draft already has a height');
});

test('clearing height blocks finishing unless not present is set', () => {
  const draft: ObstacleReportDraft = { ...setObstacleType(emptyObstacleReportDraft, ObstacleType.Building), height: null };
  assert.equal(canFinishReport(draft), false);
  assert.equal(canFinishReport(toggleNotPresent(draft)), true);
});

test('selecting Other clears any previous free-text label; switching away from Other clears it too', () => {
  const withLabel = setOtherTypeLabel(setObstacleType(emptyObstacleReportDraft, ObstacleType.Other), 'Crane');
  assert.equal(withLabel.otherTypeLabel, 'Crane');
  const switched = setObstacleType(withLabel, ObstacleType.Bridge);
  assert.equal(switched.otherTypeLabel, '');
});

test('lighting cycles unknown -> lit -> none -> unknown', () => {
  let draft = emptyObstacleReportDraft;
  assert.equal(draft.lighting, 'unknown');
  draft = cycleLighting(draft);
  assert.equal(draft.lighting, 'lit');
  draft = cycleLighting(draft);
  assert.equal(draft.lighting, 'none');
  draft = cycleLighting(draft);
  assert.equal(draft.lighting, 'unknown');
});

test('toggling description off clears any typed text', () => {
  let draft = toggleDescription(emptyObstacleReportDraft);
  assert.equal(draft.descriptionEnabled, true);
  draft = { ...draft, description: 'Crane boom over the taxiway' };
  draft = toggleDescription(draft);
  assert.equal(draft.descriptionEnabled, false);
  assert.equal(draft.description, '');
});

test('height clamps to the 5-15 metre range', () => {
  assert.equal(setHeight(emptyObstacleReportDraft, 1).height, 5);
  assert.equal(setHeight(emptyObstacleReportDraft, 42).height, 15);
  assert.equal(setHeight(emptyObstacleReportDraft, 9.6).height, 10);
});

test('height unit toggle only changes the display conversion, not the canonical metres', () => {
  let draft = emptyObstacleReportDraft;
  assert.equal(draft.heightUnit, 'm');
  draft = toggleHeightUnit(draft);
  assert.equal(draft.heightUnit, 'ft');
  assert.equal(draft.height, 10);
  assert.equal(metersToDisplayUnit(10, 'ft'), 33);
  assert.equal(formatHeightLabel(10, 'ft'), '33 ft');
  assert.equal(formatHeightLabel(10, 'm'), '10 m');
});
