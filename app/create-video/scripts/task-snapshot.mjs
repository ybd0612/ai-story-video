import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { getJobPaths } from './job-paths.mjs';

const now = () => new Date().toISOString();

export const hashFile = async (file) => {
  const content = await fs.readFile(file);
  return crypto.createHash('sha256').update(content).digest('hex');
};

const copyAtomically = async (src, dest) => {
  await fs.mkdir(path.dirname(dest), { recursive: true });
  const temporary = dest + '.' + process.pid + '.' + Date.now() + '.tmp';
  await fs.copyFile(src, temporary);
  await fs.rename(temporary, dest);
};

export const createSnapshot = async ({ paths, sourcePath, approvalPath = null, storyFingerprint = null }) => {
  await fs.mkdir(paths.input, { recursive: true });
  await copyAtomically(sourcePath, paths.inputStory);
  const storyHash = await hashFile(paths.inputStory);

  let approvalHash = null;
  if (approvalPath) {
    const approval = JSON.parse(await fs.readFile(approvalPath, 'utf8'));
    if (storyFingerprint !== null && approval.fingerprint !== storyFingerprint) {
      throw new Error('故事内容已在审核后变更，请重新执行保存和审核流程');
    }
    await copyAtomically(approvalPath, paths.inputApproval);
    approvalHash = await hashFile(paths.inputApproval);
  }

  const manifest = {
    schemaVersion: 1,
    jobId: paths.root.split(path.sep).pop(),
    storyHash,
    approvalHash,
    storyFingerprint,
    createdAt: now(),
  };
  await fs.writeFile(paths.snapshotManifest, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  return manifest;
};

export const readSnapshotManifest = async (paths) => {
  return JSON.parse(await fs.readFile(paths.snapshotManifest, 'utf8'));
};

export const verifySnapshotImmutable = async ({ paths, storyHash, approvalHash = null }) => {
  const currentStoryHash = await hashFile(paths.inputStory);
  if (currentStoryHash !== storyHash) throw new Error('任务输入快照已被修改，拒绝执行');
  if (approvalHash) {
    const currentApprovalHash = await hashFile(paths.inputApproval);
    if (currentApprovalHash !== approvalHash) throw new Error('审核快照已被修改，拒绝执行');
  }
  return true;
};
