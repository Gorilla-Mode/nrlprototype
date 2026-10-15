import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sectionStart, userTestTasks } from '../src/lib/usertest/userTestTasks.js';
import { userTestEnabled } from '../src/lib/usertest/userTestSettings.js';

test('the task guide requires both debug=1 and help=1', () => {
  const values = [undefined, '', '0', 'true', 'invalid', '1'];
  for (const debug of values) {
    for (const help of values) {
      const query = new URLSearchParams();
      if (debug !== undefined) query.set('debug', debug);
      if (help !== undefined) query.set('help', help);
      const search = `?${query}`;
      assert.equal(userTestEnabled(search), debug === '1' && help === '1', search);
    }
  }
  assert.equal(userTestEnabled(''), false);
  assert.equal(userTestEnabled('?help=1'), false);
});

test('task guide eligibility ignores parameter order and unrelated settings', () => {
  assert.equal(userTestEnabled('?help=1&placementEditing=basic&debug=1&reporting=two-step'), true);
  assert.equal(userTestEnabled('?reporting=two-step&help=1'), false);
  assert.equal(userTestEnabled('?debug=1&usertesting=1&reporting=two-step'), false);
});

test('tasks have unique ids and steps numbered continuously across sections', () => {
  assert.equal(new Set(userTestTasks.map((task) => task.id)).size, userTestTasks.length);
  assert.deepEqual(userTestTasks.map((task) => task.sections.map((_, index) => sectionStart(task, index))),
    [[1, 4, 7], [1, 3, 5], [1, 3, 6, 8]]);
  for (const task of userTestTasks) {
    for (const section of task.sections) assert.ok(section.steps.length > 0, `${task.id}: ${section.heading}`);
  }
});
