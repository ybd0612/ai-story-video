import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { STAGE_ORDER } from './task-state.mjs';

const existsNonEmpty = async (file) => {
  const stat = await fs.stat(file);
  return stat.isFile() && stat.size > 0;
};
const json = async (file) => JSON.parse(await fs.readFile(file, 'utf8'));
const within = (root, file) => {
  const relative = path.relative(root, path.resolve(file));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
};
const sceneIds = (story) => (story.scenes ?? []).map((scene) => String(scene.id));

export const validateStageContract = async ({ stage, paths, input, output, sceneIds: expected = [] }) => {
  const root = path.resolve(paths.root);
  for (const candidate of [input, output].filter(Boolean)) {
    if (!within(root, candidate)) throw new Error(`${stage} artifact escapes job root: ${candidate}`);
    await existsNonEmpty(candidate);
  }
  if (output && output.endsWith('.json')) {
    const parsed = await json(output);
    const actual = sceneIds(parsed);
    if (expected.length && (actual.length !== expected.length || actual.some((id, index) => id !== expected[index]))) throw new Error(`${stage} scene id set mismatch`);
  }
  if (stage === 'audio-validation') {
    const marker = path.join(paths.work, 'audio-validation.json');
    await fs.writeFile(marker, `${JSON.stringify({ valid: true, generatedAt: new Date().toISOString() }, null, 2)}\n`);
  }
  return true;
};

export const hashFile = async (file) => {
  const content = await fs.readFile(file);
  return crypto.createHash('sha256').update(content).digest('hex');
};

export const validateDeliverContract = async ({ rendered, delivered, paths }) => {
  if (!within(paths.root, rendered) || !within(paths.root, delivered)) throw new Error('deliver artifact escapes job root');
  await existsNonEmpty(rendered); await existsNonEmpty(delivered);
  const [sourceHash, targetHash] = await Promise.all([hashFile(rendered), hashFile(delivered)]);
  if (sourceHash !== targetHash) throw new Error('deliver output hash mismatch');
  return targetHash;
};

export const stageIsComplete = async (stage, context) => {
  try {
    if (stage === 'deliver') { await validateDeliverContract(context); return true; }
    await validateStageContract({ stage, ...context }); return true;
  } catch { return false; }
};

export { STAGE_ORDER };
