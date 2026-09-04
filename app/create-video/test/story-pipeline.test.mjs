import test from 'node:test';
import assert from 'node:assert/strict';
import { createJobId, slugify } from '../scripts/job-paths.mjs';
import { createTaskState } from '../scripts/task-state.mjs';

test('slugify creates a bounded stable job name', () => {
  assert.equal(slugify(' 月亮兔 / 晚安邮差 '), '月亮兔-晚安邮差');
  assert.ok(slugify('x'.repeat(100)).length <= 48);
});

test('createJobId includes a readable story slug', () => {
  assert.match(createJobId('Demo Story'), /^\d{8}-\d{6}-demo-story$/);
});

test('task state starts in created status', () => {
  const state = createTaskState({ jobId: 'job-1', source: '/tmp/story.json', storyFingerprint: 'abc' });
  assert.equal(state.status, 'created');
  assert.equal(state.storyFingerprint, 'abc');
  assert.deepEqual(state.stages, {});
});
