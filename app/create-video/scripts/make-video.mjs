import { spawn } from 'node:child_process';
import path from 'node:path';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { createJobId, getJobPaths, OUTPUTS_ROOT } from './job-paths.mjs';

const run = (command, args, env = {}) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { stdio: 'inherit', shell: false, env: { ...process.env, ...env }, cwd: process.cwd() });
  child.on('error', reject);
  child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`${command} 退出码 ${code}`)));
});

const source = process.env.STORY_FILE ? path.resolve(process.env.STORY_FILE) : path.resolve('./story.json');
const sourceStory = JSON.parse(await fs.readFile(source, 'utf8'));
const jobId = process.env.JOB_ID ?? createJobId(sourceStory.title ?? sourceStory.name ?? 'story');
const paths = getJobPaths(jobId);
for (const directory of [paths.input, paths.work, paths.images, paths.audio, paths.output]) {
  await fs.mkdir(directory, { recursive: true });
}
await fs.copyFile(source, path.join(paths.input, 'story.source.json'));

const approvalFile = process.env.STORY_APPROVAL_FILE ? path.resolve(process.env.STORY_APPROVAL_FILE) : path.join(path.dirname(source), 'story.approved');
try {
  await fs.access(approvalFile);
  const approval = JSON.parse(await fs.readFile(approvalFile, 'utf8'));
  const fingerprint = crypto.createHash('sha256').update(JSON.stringify(sourceStory)).digest('hex');
  if (approval.fingerprint !== fingerprint) throw new Error('故事内容已在审核后变更，请重新执行保存和审核流程');
} catch (error) {
  if (error.message.includes('故事内容已在审核后变更')) throw error;
  throw new Error('故事尚未确认：请先执行审核流程，确认后再生成图片、配音和视频');
}

const withImages = path.join(paths.work, 'story.with-images.json');
const withAudio = path.join(paths.work, 'story.with-audio.json');
const currentStory = path.join(paths.work, 'currentStory.json');
const videoOutput = path.join(paths.output, 'story-video.mp4');

await run(process.execPath, ['scripts/validate-story.mjs', source]);
await run(process.execPath, ['scripts/generate-story-images.mjs'], {
  STORY_FILE: source,
  STORY_OUTPUT: withImages,
  STORY_IMAGE_DIR: paths.images,
  STORY_PUBLIC_ROOT: paths.root,
});
const python = process.env.PYTHON_BIN ?? 'C:/Users/ybd06/.workbuddy/binaries/python/envs/default/Scripts/python.exe';
await run(python, ['scripts/generate-edge-tts.py'], {
  STORY_FILE: withImages,
  STORY_OUTPUT: withAudio,
  STORY_AUDIO_DIR: paths.audio,
  STORY_PUBLIC_ROOT: paths.root,
});
await run(process.execPath, ['scripts/validate-audio-duration.mjs', withAudio], {
  STORY_PUBLIC_ROOT: paths.root,
});
await run(process.execPath, ['scripts/prepare-story.mjs'], {
  STORY_SOURCE: withAudio,
  STORY_TARGET: currentStory,
});
await fs.copyFile(currentStory, path.resolve('./src/story/currentStory.json'));
await run(process.execPath, ['scripts/render-video.mjs'], {
  STORY_CURRENT_FILE: currentStory,
  VIDEO_OUTPUT: videoOutput,
  JOB_PUBLIC_ROOT: paths.root,
});

const outputDir = path.join(OUTPUTS_ROOT, jobId);
await fs.mkdir(outputDir, { recursive: true });
await fs.copyFile(videoOutput, path.join(outputDir, 'story-video.mp4'));
await fs.writeFile(paths.metadata, `${JSON.stringify({ jobId, source, createdAt: new Date().toISOString(), output: videoOutput }, null, 2)}\n`);
console.log(`一键生成完成：${videoOutput}`);
console.log(`交付副本：${path.join(outputDir, 'story-video.mp4')}`);
