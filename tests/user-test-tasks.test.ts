import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sectionStart, userTestTasks } from '../src/lib/usertest/userTestTasks.js';

test('tasks have unique ids and steps numbered continuously across sections', () => {
  assert.equal(new Set(userTestTasks.map((task) => task.id)).size, userTestTasks.length);
  assert.deepEqual(userTestTasks.map((task) => task.sections.map((_, index) => sectionStart(task, index))),
    [[1, 4, 7], [1, 3, 5], [1, 3, 6, 8]]);
  for (const task of userTestTasks) {
    for (const section of task.sections) assert.ok(section.steps.length > 0, `${task.id}: ${section.heading}`);
  }
});
