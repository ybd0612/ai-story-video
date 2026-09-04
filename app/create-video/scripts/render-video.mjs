import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const run = (command, args, env = {}) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { stdio: 'inherit', shell: false, cwd: process.cwd(), env: { ...process.env, ...env } });
  child.on('error', reject);
  child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`${command} 退出码 ${code}`)));
});

const currentStory = path.resolve(process.env.STORY_CURRENT_FILE ?? './src/story/sampleStory.json');
const publicRoot = path.resolve(process.env.JOB_PUBLIC_ROOT ?? './public');
const storyProps = JSON.stringify({ story: JSON.parse(await fs.readFile(currentStory, 'utf8')) });
await run(process.execPath, ['scripts/validate-audio-duration.mjs'], {
  STORY_FILE: currentStory,
  STORY_PUBLIC_ROOT: publicRoot,
});
await run(process.execPath, [
  'node_modules/@remotion/cli/remotion-cli.js',
  'render',
  'src/index.ts',
  'StoryVideo',
  path.resolve(process.env.VIDEO_OUTPUT ?? './out/story-video.mp4'),
  '--public-dir',
  publicRoot,
  '--props',
  storyProps,
]);
