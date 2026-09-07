import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { readMetadataManifest } from '../scripts/metadata-manifest.mjs';

test('metadata manifest rejects tampered pinned references', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'dsp-metadata-'));
  const paths = { input: directory, workflowRef: path.join(directory, 'workflow.json'), profileRef: path.join(directory, 'profile.json'), catalogRef: path.join(directory, 'catalog.json') };
  await Promise.all([fs.writeFile(paths.workflowRef, 'workflow'), fs.writeFile(paths.profileRef, 'profile'), fs.writeFile(paths.catalogRef, 'catalog')]);
  const crypto = await import('node:crypto');
  const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
  await fs.writeFile(path.join(directory, 'metadata.manifest.json'), JSON.stringify({ workflow: { sha256: hash('workflow') }, profile: { sha256: hash('profile') }, catalog: { sha256: hash('catalog') } }));
  await assert.doesNotReject(() => readMetadataManifest(paths));
  await fs.writeFile(paths.workflowRef, 'tampered');
  await assert.rejects(() => readMetadataManifest(paths), /固化 workflow 引用已被修改/);
  await fs.rm(directory, { recursive: true, force: true });
});
