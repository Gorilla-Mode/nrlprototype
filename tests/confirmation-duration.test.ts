import assert from 'node:assert/strict';
import { test } from 'node:test';
import { confirmationDurationMs } from '../src/lib/components/confirmationDuration.js';

test('5 s plus 1 s per started 10 words of title and text', () => {
  assert.equal(confirmationDurationMs(''), 5000);
  assert.equal(confirmationDurationMs('one two three'), 6000);
  assert.equal(confirmationDurationMs('a b c d e f g h i j'), 6000);
  assert.equal(confirmationDurationMs('a b c d e f g h i j k'), 7000);
});

test('the saved and sent confirmations stay 7 s', () => {
  assert.equal(confirmationDurationMs('Report saved Saved as Ready to send. You can find it in Reports.'), 7000);
  assert.equal(confirmationDurationMs("Report sent Kartverket will review it. You'll be notified when it's registered."), 7000);
});
