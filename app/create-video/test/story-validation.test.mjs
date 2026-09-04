import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const validStory = {
  id: 'demo',
  title: 'Demo',
  topic: 'topic',
  style: 'style',
  character: { id: 'c', name: 'C', description: 'd', visualTraits: 'v', wardrobe: 'w' },
  scenes: [{ id: 's1', title: 'Scene', narration: 'Say', imagePrompt: 'Prompt', durationInSeconds: 1 }],
};

const runValidation = async (story) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'dsp-story-test-'));
  const file = path.join(directory, 'story.json');
  await fs.writeFile(file, JSON.stringify(story));
  return spawnSync(process.execPath, ['scripts/validate-story.mjs', file], { encoding: 'utf8' });
};

test('validate-story accepts a valid story', async () => {
  const result = await runValidation(validStory);
  assert.equal(result.status, 0);
});

test('validate-story rejects duplicate scene ids and invalid duration', async () => {
  const story = { ...validStory, scenes: [validStory.scenes[0], { ...validStory.scenes[0], durationInSeconds: 0 }] };
  const result = await runValidation(story);
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}${result.stderr}`, /id 重复/);
  assert.match(`${result.stdout}${result.stderr}`, /durationInSeconds 必须是正数/);
});
