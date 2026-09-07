import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { DEFAULT_PROVIDERS, getDefaultProvider } from '../scripts/providers/default-providers.mjs';
import { assertProviderDescriptor } from '../scripts/providers/provider-contracts.mjs';

const root = path.resolve(process.cwd(), '../..');

test('default providers preserve existing handlers', () => {
  assert.equal(DEFAULT_PROVIDERS.images.handler, 'scripts/generate-story-images.mjs');
  assert.equal(getDefaultProvider('audio').handler, 'scripts/generate-edge-tts.py');
  assert.throws(() => getDefaultProvider('unknown'), /No default provider/);
});

test('workflow and platform manifests have required E1 fields', async () => {
  const workflow = JSON.parse(await fs.readFile(path.join(root, 'templates/workflows/story-video.workflow.json'), 'utf8'));
  const profile = JSON.parse(await fs.readFile(path.join(root, 'templates/platform/douyin-vertical.profile.json'), 'utf8'));
  assert.deepEqual(workflow.stages.map((stage) => stage.name), ['validate', 'images', 'tts', 'audio-validation', 'prepare', 'render', 'deliver']);
  assert.equal(profile.aspectRatio, '9:16');
  assert.equal(profile.image.size, '1K');
  assertProviderDescriptor(DEFAULT_PROVIDERS.renderer);
});
