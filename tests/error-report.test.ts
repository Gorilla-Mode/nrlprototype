import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildErrorReport, describeHeightDifference, describeLightingCorrection, formatCoordinates, isErrorReportValid, toggleErrorKind,
  type ErrorReportInput,
} from '../src/lib/obstacles/errorReport.js';
import type { RegisteredObstacle } from '../src/lib/obstacles/registeredObstacles.js';

const obstacle: RegisteredObstacle = { id: 'NRL-10432', type: 'Mast', heightM: 45, lit: true, lat: 60.409, lng: 5.333 };
const input = (overrides: Partial<ErrorReportInput>): ErrorReportInput =>
  ({ errorKinds: [], actualHeightM: null, description: '', ...overrides });

test('"Does not exist" excludes the other kinds, in both directions', () => {
  assert.deepEqual(toggleErrorKind(['wrong-position', 'wrong-height'], 'does-not-exist'), ['does-not-exist']);
  assert.deepEqual(toggleErrorKind(['does-not-exist'], 'other'), ['other']);
  assert.deepEqual(toggleErrorKind(['wrong-position'], 'wrong-height'), ['wrong-position', 'wrong-height']);
  assert.deepEqual(toggleErrorKind(['wrong-position', 'wrong-height'], 'wrong-position'), ['wrong-height']);
});

test('validation requires a kind, a positive height for wrong height, and a description for other', () => {
  assert.equal(isErrorReportValid(input({})), false);
  assert.equal(isErrorReportValid(input({ errorKinds: ['wrong-position'] })), true);
  for (const height of [null, 0, -5, Number.NaN]) {
    assert.equal(isErrorReportValid(input({ errorKinds: ['wrong-height'], actualHeightM: height })), false, String(height));
  }
  assert.equal(isErrorReportValid(input({ errorKinds: ['wrong-height'], actualHeightM: 60 })), true);
  assert.equal(isErrorReportValid(input({ errorKinds: ['other'], description: '   ' })), false);
  assert.equal(isErrorReportValid(input({ errorKinds: ['other'], description: 'Painted red' })), true);
});

test('height difference is signed relative to the registered height', () => {
  assert.equal(describeHeightDifference(60, 45), '+15 m higher than registered');
  assert.equal(describeHeightDifference(35, 45), '-10 m lower than registered');
  assert.equal(describeHeightDifference(45, 45), 'Same as registered');
});

test('"Wrong lighting" also excludes and is excluded by "Does not exist"', () => {
  assert.deepEqual(toggleErrorKind(['wrong-lighting', 'wrong-height'], 'does-not-exist'), ['does-not-exist']);
  assert.deepEqual(toggleErrorKind(['does-not-exist'], 'wrong-lighting'), ['wrong-lighting']);
  assert.equal(isErrorReportValid(input({ errorKinds: ['wrong-lighting'] })), true);
});

test('the lighting correction is the opposite of the registered value', () => {
  assert.equal(describeLightingCorrection(true), 'Lit → Not lit');
  assert.equal(describeLightingCorrection(false), 'Not lit → Lit');
});

test('the report omits height unless wrong and flags lighting only when chosen', () => {
  const timestamp = new Date('2026-10-01T12:00:00Z');
  assert.deepEqual(
    buildErrorReport(obstacle, input({ errorKinds: ['wrong-position'], actualHeightM: 60, description: ' Moved ' }), timestamp),
    { obstacleId: 'NRL-10432', errorKinds: ['wrong-position'], actualHeightM: null, lightingWrong: false, description: 'Moved', timestamp },
  );
  assert.equal(buildErrorReport(obstacle, input({ errorKinds: ['does-not-exist'] }), timestamp).lightingWrong, false);
  assert.equal(buildErrorReport(obstacle, input({ errorKinds: ['wrong-lighting'] }), timestamp).lightingWrong, true);
  assert.equal(buildErrorReport(obstacle, input({ errorKinds: ['wrong-height'], actualHeightM: 60 }), timestamp).actualHeightM, 60);
});

test('coordinates show hemisphere and four decimals', () => {
  assert.equal(formatCoordinates(obstacle), '60.4090° N, 5.3330° E');
  assert.equal(formatCoordinates({ lat: -1.5, lng: -70.25 }), '1.5000° S, 70.2500° W');
});
