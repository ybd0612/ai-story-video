import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createSnapshot, readSnapshotManifest, verifySnapshotImmutable, hashFile } from '../scripts/task-snapshot.mjs';

const makePaths = (root) => ({
  root,
  input: path.join(root, 'input'),
  inputStory: path.join(root, 'input', 'story.source.json'),
  inputApproval: path.join(root, 'input', 'story.approved'),
  snapshotManifest: path.join(root, 'input', 'snapshot.manifest.json'),
});

const writeTemp = async (name, content) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'dsp-snap-'));
  const file = path.join(directory, name);
  await fs.writeFile(file, content);
  return file;
};

test('createSnapshot copies story + approval and records hashes', async () => {
  const src = await writeTemp('story.json', JSON.stringify({ title: 'T', scenes: [] }));
  const app = await writeTemp('story.approved', JSON.stringify({ fingerprint: 'fp' }));
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dsp-job-'));
  const paths = makePaths(root);
  const manifest = await createSnapshot({ paths, sourcePath: src, approvalPath: app, storyFingerprint: 'fp' });
  assert.equal(manifest.storyHash, await hashFile(paths.inputStory));
  assert.equal(manifest.approvalHash, await hashFile(paths.inputApproval));
  assert.equal(manifest.storyFingerprint, 'fp');
  assert.ok((await fs.readFile(paths.snapshotManifest, 'utf8')).includes('storyHash'));
  const saved = await readSnapshotManifest(paths);
  assert.equal(saved.storyHash, manifest.storyHash);
});

test('createSnapshot rejects approval fingerprint mismatch', async () => {
  const src = await writeTemp('story.json', JSON.stringify({ title: 'T' }));
  const app = await writeTemp('story.approved', JSON.stringify({ fingerprint: 'other' }));
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dsp-job-'));
  const paths = makePaths(root);
  await assert.rejects(
    () => createSnapshot({ paths, sourcePath: src, approvalPath: app, storyFingerprint: 'fp' }),
    /审核后变更/,
  );
});

test('verifySnapshotImmutable passes then detects tampered input', async () => {
  const src = await writeTemp('story.json', JSON.stringify({ title: 'T' }));
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dsp-job-'));
  const paths = makePaths(root);
  const manifest = await createSnapshot({ paths, sourcePath: src });
  await assert.doesNotReject(() => verifySnapshotImmutable({ paths, storyHash: manifest.storyHash }));
  await fs.writeFile(paths.inputStory, JSON.stringify({ title: 'Tampered' }));
  await assert.rejects(
    () => verifySnapshotImmutable({ paths, storyHash: manifest.storyHash }),
    /已被修改/,
  );
});
