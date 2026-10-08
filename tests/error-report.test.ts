import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  applyPositionChoice, buildErrorReport, describeHeightDifference, describeLightingCorrection, describeMissingRequirement, formatCoordinates, isErrorReportValid, toggleErrorKind,
  type ErrorReportInput,
} from '../src/lib/obstacles/errorReport.js';
import type { RegisteredObstacle } from '../src/lib/obstacles/registeredObstacles.js';

const obstacle: RegisteredObstacle = { id: 'NRL-10432', type: 'Mast', heightM: 45, lit: true, lat: 60.409, lng: 5.333 };
const input = (overrides: Partial<ErrorReportInput>): ErrorReportInput =>
  ({ errorKinds: [], actualHeightM: null, description: '', ...overrides });

test('"Does not exist" excludes the other kinds, in both directions', () => {
  assert.deepEqual(toggleErrorKind(['wrong-position', 'wrong-height'], 'does-not-exist'), ['does-not-exist']);
  assert.deepEqual(toggleErrorKind(['does-not-exist'], 'wrong-lighting'), ['wrong-lighting']);
  assert.deepEqual(toggleErrorKind(['wrong-position'], 'wrong-height'), ['wrong-position', 'wrong-height']);
  assert.deepEqual(toggleErrorKind(['wrong-position', 'wrong-height'], 'wrong-position'), ['wrong-height']);
});

test('a description alone is enough; blank descriptions do not count', () => {
  assert.equal(isErrorReportValid(input({ description: 'The mast was removed last summer' })), true);
  assert.equal(isErrorReportValid(input({ description: '   ' })), false);
  assert.equal(describeMissingRequirement(input({ description: '\n ' })), 'Select an error or describe it to continue');
  assert.deepEqual(buildErrorReport(obstacle, input({ description: ' Moved by the owner ' })).errorKinds, []);
});

test('validation requires a kind or description, and a positive height for wrong height; description stays optional', () => {
  assert.equal(isErrorReportValid(input({})), false);
  assert.equal(isErrorReportValid(input({ errorKinds: ['wrong-position'] })), true);
  for (const height of [null, 0, -5, Number.NaN]) {
    assert.equal(isErrorReportValid(input({ errorKinds: ['wrong-height'], actualHeightM: height })), false, String(height));
  }
  assert.equal(isErrorReportValid(input({ errorKinds: ['wrong-height'], actualHeightM: 60 })), true);
  assert.equal(isErrorReportValid(input({ errorKinds: ['wrong-position'], description: '' })), true);
});

test('the missing requirement names the first unmet rule and agrees with validation', () => {
  const cases: [Partial<ErrorReportInput>, string | null][] = [
    [{}, 'Select an error or describe it to continue'],
    [{ description: 'Painted red' }, null],
    [{ errorKinds: ['wrong-height'], description: 'Taller now' }, 'Enter the correct height to continue'],
    [{ errorKinds: ['wrong-height'] }, 'Enter the correct height to continue'],
    [{ errorKinds: ['wrong-height', 'wrong-lighting'], actualHeightM: 0 }, 'Enter the correct height to continue'],
    [{ errorKinds: ['wrong-height', 'wrong-lighting'], actualHeightM: 60 }, null],
    [{ errorKinds: ['wrong-position'] }, null],
  ];
  for (const [overrides, expected] of cases) {
    const value = input(overrides);
    assert.equal(describeMissingRequirement(value), expected, JSON.stringify(overrides));
    assert.equal(isErrorReportValid(value), expected === null);
  }
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

test('position choices select, keep or clear "Wrong position" and its coordinates', () => {
  const position = { lat: 60.41, lng: 5.34 };
  assert.deepEqual(applyPositionChoice(['does-not-exist'], null, { kind: 'set', position }),
    { errorKinds: ['wrong-position'], correctedPosition: position });
  assert.deepEqual(applyPositionChoice(['wrong-height'], null, { kind: 'unknown' }),
    { errorKinds: ['wrong-height', 'wrong-position'], correctedPosition: null });
  assert.deepEqual(applyPositionChoice(['wrong-position', 'wrong-lighting'], position, { kind: 'remove' }),
    { errorKinds: ['wrong-lighting'], correctedPosition: null });
  assert.deepEqual(applyPositionChoice(['wrong-position'], position, { kind: 'cancel' }),
    { errorKinds: ['wrong-position'], correctedPosition: position }, 'cancel keeps an existing answer');
  assert.deepEqual(applyPositionChoice([], null, { kind: 'cancel' }), { errorKinds: [], correctedPosition: null });
});

test('corrected coordinates are reported only with "Wrong position"', () => {
  const correctedPosition = { lat: 60.41, lng: 5.34 };
  const with_ = buildErrorReport(obstacle, input({ errorKinds: ['wrong-position'], correctedPosition }));
  assert.equal(with_.correctedLat, 60.41);
  assert.equal(with_.correctedLng, 5.34);
  const unknown = buildErrorReport(obstacle, input({ errorKinds: ['wrong-position'] }));
  assert.equal('correctedLat' in unknown, false);
  const deselected = buildErrorReport(obstacle, input({ errorKinds: ['wrong-lighting'], correctedPosition }));
  assert.equal('correctedLat' in deselected, false);
});

test('coordinates show hemisphere and four decimals', () => {
  assert.equal(formatCoordinates(obstacle), '60.4090° N, 5.3330° E');
  assert.equal(formatCoordinates({ lat: -1.5, lng: -70.25 }), '1.5000° S, 70.2500° W');
});
