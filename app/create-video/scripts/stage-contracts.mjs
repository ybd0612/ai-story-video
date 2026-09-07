import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { STAGE_ORDER } from './task-state.mjs';
import { OUTPUTS_ROOT } from './job-paths.mjs';

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

export const validateStageContract = async ({ stage, paths, input, output, sceneIds: expected = [], allowedInputRoots = [] }) => {
  const root = path.resolve(paths.root);
  const inputRoots = [root, ...allowedInputRoots.map((value) => path.resolve(value))];
  if (input) {
    if (!inputRoots.some((candidateRoot) => within(candidateRoot, input))) throw new Error(`${stage} artifact escapes controlled input roots: ${input}`);
    await existsNonEmpty(input);
  }
  if (output) {
    if (!within(root, output)) throw new Error(`${stage} artifact escapes job root: ${output}`);
    await existsNonEmpty(output);
  }
  if (output && output.endsWith('.json')) {
    const parsed = await json(output);
    const actual = sceneIds(parsed);
    if (expected.length && (actual.length !== expected.length || actual.some((id, index) => id !== expected[index]))) throw new Error(`${stage} scene id set mismatch`);
    for (const scene of parsed.scenes ?? []) {
      for (const field of ['imagePath', 'audioPath']) {
        if (!scene[field]) continue;
        const artifact = path.resolve(root, scene[field]);
        if (!within(root, artifact)) throw new Error(`${stage} ${field} escapes job root for scene ${scene.id}`);
        await existsNonEmpty(artifact);
      }
    }
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

export const validateDeliverContract = async ({ rendered, delivered, paths, outputsRoot = OUTPUTS_ROOT }) => {
  const allowedOutputRoot = path.join(path.resolve(outputsRoot), paths.root.split(path.sep).pop());
  if (!within(paths.root, rendered)) throw new Error('rendered artifact escapes job root');
  if (!within(allowedOutputRoot, delivered)) throw new Error('delivered artifact escapes controlled outputs root');
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
