import assert from 'node:assert/strict';
import { test } from 'node:test';
import { settingsSectionFromHash, settingsSections } from '../src/lib/settings/settings.js';

test('Settings direct links resolve to the seven supported views with one profile destination', () => {
  assert.equal(settingsSectionFromHash('#/Settings'), 'profile');
  for (const section of settingsSections) assert.equal(settingsSectionFromHash(`#/Settings/${section.id}`), section.id);
  assert.equal(settingsSections.length, 7);
  for (const hash of ['', '#/FAQ', '#/Settings/drawing-guide', '#/Settings/unknown', '#/Settings/profile/extra']) {
    assert.equal(settingsSectionFromHash(hash), null);
  }
});
