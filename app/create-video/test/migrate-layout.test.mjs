import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { mirror, check } from '../scripts/migrate-layout.mjs';

test('layout migration is idempotent and rejects target drift', async () => {
  const root = path.resolve(process.cwd(), '../..');
  const targets = ['data/context/profile.md', 'data/context/preferences.md', 'data/knowledge/legacy.md', 'data/analytics/history.md', 'data/operations/tasks.md', 'templates/story/title-template.md', 'templates/story/script-template.md'];
  await mirror();
  await assert.doesNotReject(() => check());
  const original = await fs.readFile(path.join(root, targets[0]), 'utf8');
  await fs.writeFile(path.join(root, targets[0]), `${original}\nchanged`);
  await assert.rejects(() => mirror(), /Migration target differs/);
  await fs.writeFile(path.join(root, targets[0]), original);
  await assert.doesNotReject(() => check());
  await Promise.all(targets.map((target) => fs.rm(path.join(root, target), { force: true })));
  await fs.rm(path.join(root, 'data/.migration/layout-map.json'), { force: true });
});
