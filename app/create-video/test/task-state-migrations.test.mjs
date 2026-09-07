import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createTaskState } from '../scripts/task-state.mjs';
import { migrateTaskState, migrateV1ToV2 } from '../scripts/task-state-migrations.mjs';
import { readTaskState } from '../scripts/task-state.mjs';

const tmp = async () => fs.mkdtemp(path.join(os.tmpdir(), 'dsp-mig-'));

test('createTaskState keeps stages empty and adds migrationHistory', () => {
  const state = createTaskState({ jobId: 'j', source: 's', storyFingerprint: 'f' });
  assert.deepEqual(state.stages, {});
  assert.deepEqual(state.migrationHistory, []);
});

test('migrateV1ToV2 preserves fields and appends migrationHistory', () => {
  const v1 = {
    schemaVersion: 1, jobId: 'j', source: 's', storyFingerprint: 'f', status: 'running',
    currentStage: 'images', stages: { images: { status: 'completed' } }, scenes: {},
  };
  const v2 = migrateV1ToV2(v1);
  assert.equal(v2.schemaVersion, 2);
  assert.equal(v2.jobId, 'j');
  assert.equal(v2.status, 'running');
  assert.equal(v2.currentStage, 'images');
  assert.deepEqual(v2.stages, { images: { status: 'completed' } });
  assert.equal(v2.migrationHistory.length, 1);
  assert.equal(v2.migrationHistory[0].from, 1);
  assert.equal(v2.migrationHistory[0].to, 2);
});

test('migrateTaskState rejects unsupported schema', () => {
  assert.throws(() => migrateTaskState({ schemaVersion: 3 }), /Unsupported task state schema/);
});

test('readTaskState migrates v1 file in place and records backup', async () => {
  const dir = await tmp();
  const file = path.join(dir, 'status.json');
  await fs.writeFile(file, JSON.stringify({ schemaVersion: 1, jobId: 'j', stages: {}, scenes: {} }));
  const state = await readTaskState(file);
  assert.equal(state.schemaVersion, 2);
  assert.equal(state.migrationHistory.length, 1);
  const backup = state.migrationHistory[0].backup;
  assert.ok(backup, 'migrationHistory should record backup path');
  await assert.doesNotReject(() => fs.access(backup));
  const state2 = await readTaskState(file);
  assert.equal(state2.schemaVersion, 2);
});

test('readTaskState does not overwrite corrupt status', async () => {
  const dir = await tmp();
  const file = path.join(dir, 'status.json');
  const corrupt = '{ this is not json ';
  await fs.writeFile(file, corrupt);
  await assert.rejects(() => readTaskState(file), /Corrupt task state/);
  assert.equal(await fs.readFile(file, 'utf8'), corrupt);
});

test('readTaskState rejects unsupported schema without overwrite', async () => {
  const dir = await tmp();
  const file = path.join(dir, 'status.json');
  await fs.writeFile(file, JSON.stringify({ schemaVersion: 99 }));
  await assert.rejects(() => readTaskState(file), /Unsupported task state schema/);
});
