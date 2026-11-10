import assert from 'node:assert/strict';
import { test } from 'node:test';
import { completePayload, missingDetailsFields } from '../src/lib/reporting/createDetailsController.js';
import { ObstacleType } from '../src/lib/reporting/obstacle.js';
import { draft } from './helpers/reporting.js';

test('missing fields name what keeps a draft from Ready to send, in form order', () => {
  assert.deepEqual(missingDetailsFields(draft({ type: null, height: null })), ['obstacle type', 'height']);
  assert.deepEqual(missingDetailsFields(draft({ type: ObstacleType.Bridge, height: null })), ['height']);
  assert.deepEqual(missingDetailsFields(draft({ type: null, height: 30 })), ['obstacle type']);
  assert.deepEqual(missingDetailsFields(draft({ type: ObstacleType.Bridge, height: 30 })), []);
});

test('the missing list and Ready to send agree: complete exactly when nothing is missing', () => {
  for (const values of [{ type: null, height: null }, { type: ObstacleType.Pole, height: null }, { type: null, height: 12 }, { type: ObstacleType.Pole, height: 12 }]) {
    const current = draft(values);
    assert.equal(completePayload(current) !== null, missingDetailsFields(current).length === 0);
  }
});
