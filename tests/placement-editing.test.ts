import assert from 'node:assert/strict';
import { test } from 'node:test';
import { placementEditingSettings, placementEditingVariantUrl, placementEditingVariants } from '../src/lib/map/placementEditing.js';
import { reportingSettings } from '../src/lib/reporting/reporting.js';
import { oneStepKeypad, twoStep } from './helpers/reporting.js';

for (const debug of ['', '0', 'true', '1']) {
  test(`placement selection is gated by debug=${debug}`, () => {
    for (const id of ['', 'invalid', ...placementEditingVariants.map((entry) => entry.id)]) {
      const search = `?debug=${debug}&placementEditing=${id}&reporting=two-step`;
      const valid = placementEditingVariants.find((entry) => entry.id === id);
      assert.equal(placementEditingSettings(search), debug === '1' && valid ? id : 'default');
      assert.equal(reportingSettings(search, [oneStepKeypad, twoStep]).variant, debug === '1' ? twoStep : oneStepKeypad);
    }
  });
}

test('placement URLs preserve reporting, other parameters, deployment path and hash; same and invalid choices do nothing', () => {
  const href = 'https://example.test/prototype/?debug=1&reporting=two-step&x=a%20b#/Report/details';
  assert.equal(placementEditingVariantUrl(href, 'basic'), '/prototype/?debug=1&reporting=two-step&x=a+b&placementEditing=basic#/Report/details');
  assert.equal(placementEditingVariantUrl(href, 'default'), null);
  assert.equal(placementEditingVariantUrl(href, 'unknown'), null);
  assert.equal(placementEditingVariantUrl(href.replace('debug=1', 'debug=0'), 'basic'), null);
  assert.equal(placementEditingVariantUrl(href.replace('x=a%20b', 'placementEditing=basic'), 'basic'), null);
});
