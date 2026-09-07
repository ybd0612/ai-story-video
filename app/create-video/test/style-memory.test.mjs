import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadStyleMemory, resolveStoryStyle, saveStyleRule, selectStyleRule } from '../scripts/style-memory.mjs';

test('project memory selects a matching child-story style', () => {
  const memory = { rules: [{ scope: '儿童故事', keywords: ['儿童', '小兔'], style: '绘本动画', priority: 100 }] };
  assert.equal(selectStyleRule(memory, '小兔找月亮').style, '绘本动画');
});

test('explicit story style overrides project memory', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dsp-style-memory-'));
  const file = path.join(root, 'style-preferences.json');
  await fs.writeFile(file, JSON.stringify({ rules: [{ scope: '儿童故事', style: '绘本动画' }] }));
  const result = await resolveStoryStyle({ topic: '小兔故事', style: '水墨风', memoryFile: file });
  assert.deepEqual(result, { style: '水墨风', source: 'story' });
  await fs.rm(root, { recursive: true, force: true });
});

test('style rules can be persisted independently of WorkBuddy memory', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dsp-style-memory-'));
  const file = path.join(root, 'style-preferences.json');
  await saveStyleRule({ scope: '武侠短片', style: '国风武侠电影感', memoryFile: file });
  const memory = await loadStyleMemory(file);
  assert.equal(memory.rules[0].scope, '武侠短片');
  assert.equal(memory.rules[0].style, '国风武侠电影感');
  await fs.rm(root, { recursive: true, force: true });
});
