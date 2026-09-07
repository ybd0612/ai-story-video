import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { validateDeliverContract, validateStageContract } from '../scripts/stage-contracts.mjs';

test('deliver contract accepts controlled outputs path and rejects outside path', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dsp-contract-'));
  const jobRoot = path.join(root, 'jobs', 'job-1');
  const outputsRoot = path.join(root, 'outputs');
  const rendered = path.join(jobRoot, 'output', 'story-video.mp4');
  const delivered = path.join(outputsRoot, 'job-1', 'story-video.mp4');
  await fs.mkdir(path.dirname(rendered), { recursive: true });
  await fs.mkdir(path.dirname(delivered), { recursive: true });
  await fs.writeFile(rendered, 'video');
  await fs.copyFile(rendered, delivered);
  const paths = { root: jobRoot };
  await assert.doesNotReject(() => validateDeliverContract({ rendered, delivered, paths, outputsRoot }));
  const outside = path.join(root, 'outside.mp4');
  await fs.copyFile(rendered, outside);
  await assert.rejects(() => validateDeliverContract({ rendered, delivered: outside, paths, outputsRoot }), /controlled outputs root/);
  await fs.rm(root, { recursive: true, force: true });
});

test('stage contract permits only explicit controlled input roots', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dsp-input-'));
  const jobRoot = path.join(root, 'jobs', 'job-1');
  const sourceRoot = path.join(root, 'data');
  const source = path.join(sourceRoot, 'story.json');
  await fs.mkdir(sourceRoot, { recursive: true });
  await fs.mkdir(jobRoot, { recursive: true });
  await fs.writeFile(source, '{}');
  await assert.doesNotReject(() => validateStageContract({ stage: 'validate', paths: { root: jobRoot }, input: source, allowedInputRoots: [sourceRoot] }));
  await assert.rejects(() => validateStageContract({ stage: 'validate', paths: { root: jobRoot }, input: source }), /controlled input roots/);
  await fs.rm(root, { recursive: true, force: true });
});
