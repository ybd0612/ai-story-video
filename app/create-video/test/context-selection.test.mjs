import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { selectContexts } from '../scripts/context-selection.mjs';

test('context selection always loads profile and preferences', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dsp-context-'));
  await fs.writeFile(path.join(root, 'profile.json'), '{}');
  await fs.writeFile(path.join(root, 'preferences.json'), '{}');
  await fs.writeFile(path.join(root, 'knowledge.json'), '{}');
  const result = await selectContexts({ root, requested: ['knowledge'], mode: 'new' });
  assert.deepEqual(result.selected.map((item) => item.name), ['profile', 'preferences', 'knowledge']);
  await fs.rm(root, { recursive: true, force: true });
});

test('context selection rejects non-allowlisted and unsafe paths', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dsp-context-'));
  await fs.writeFile(path.join(root, 'profile.json'), '{}');
  await fs.writeFile(path.join(root, 'preferences.json'), '{}');
  await assert.rejects(() => selectContexts({ root, requested: ['secrets'] }), /not allowlisted/);
  await assert.rejects(() => selectContexts({ root, requested: ['../knowledge'] }), /Invalid context name/);
  await fs.rm(root, { recursive: true, force: true });
});
