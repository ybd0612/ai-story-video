import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const storyPath = path.resolve(process.env.STORY_FILE ?? './story.with-audio.json');
const publicDir = path.resolve(process.env.STORY_PUBLIC_ROOT ?? './public');
const tolerance = Number(process.env.AUDIO_DURATION_TOLERANCE ?? '0.05');
const ffprobe = process.env.FFPROBE_BIN ?? 'ffprobe';

const runProbe = (file) => new Promise((resolve, reject) => {
  const child = spawn(ffprobe, [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    file,
  ], { stdio: ['ignore', 'pipe', 'pipe'], shell: false });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  child.on('error', reject);
  child.on('exit', (code) => {
    if (code !== 0) reject(new Error(`ffprobe 退出码 ${code}: ${stderr.trim()}`));
    else resolve(Number.parseFloat(stdout.trim()));
  });
});

const story = JSON.parse(await fs.readFile(storyPath, 'utf8'));
const errors = [];
for (const [index, scene] of story.scenes.entries()) {
  if (!scene.audioPath) {
    errors.push(`第 ${index + 1} 个镜头 ${scene.id} 缺少 audioPath`);
    continue;
  }
  const audioFile = path.resolve(publicDir, scene.audioPath);
  try {
    const duration = await runProbe(audioFile);
    if (!Number.isFinite(duration)) throw new Error('无法读取音频时长');
    const sceneDuration = Number(scene.durationInSeconds);
    if (sceneDuration + tolerance < duration) {
      errors.push(`第 ${index + 1} 个镜头 ${scene.id} 时长不足：镜头 ${sceneDuration.toFixed(3)}s，音频 ${duration.toFixed(3)}s`);
    }
    console.log(`[${index + 1}/${story.scenes.length}] 校验通过：镜头 ${sceneDuration.toFixed(3)}s，音频 ${duration.toFixed(3)}s`);
  } catch (error) {
    errors.push(`第 ${index + 1} 个镜头 ${scene.id} 音频校验失败：${error.message}`);
  }
}

if (errors.length > 0) {
  throw new Error(`旁白时长校验失败：\n${errors.map((error) => `- ${error}`).join('\n')}`);
}
console.log('旁白时长校验通过，允许进入 Remotion 渲染');
