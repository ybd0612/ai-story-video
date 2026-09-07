import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { readTaskState } from '../scripts/task-state.mjs';

test('v1 state migration records history and lifecycle events', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'dsp-migration-'));
  const file = path.join(directory, 'status.json');
  await fs.writeFile(file, `${JSON.stringify({ schemaVersion: 1, jobId: 'job-1', status: 'failed', stages: {} })}\n`);
  const state = await readTaskState(file);
  assert.equal(state.schemaVersion, 2);
  assert.equal(state.migrationHistory.length, 1);
  assert.deepEqual(state.migrationHistory[0], { from: 1, to: 2, migratedAt: state.migrationHistory[0].migratedAt });
  const events = (await fs.readFile(path.join(directory, 'events.jsonl'), 'utf8')).trim().split('\n').map((line) => JSON.parse(line));
  assert.deepEqual(events.map((event) => event.event), ['migration_started', 'migration_completed']);
  assert.ok(await fs.stat(`${file}.v1.bak`));
  await fs.rm(directory, { recursive: true, force: true });
});
