import fs from 'node:fs/promises';
import path from 'node:path';
import { ttsSave } from './edge-tts-adapter.mjs';

const INPUT = process.env.STORY_FILE ?? './story.json';
const AUDIO_DIR = path.resolve(process.env.STORY_AUDIO_DIR ?? './public/audio');
const VOICE = process.env.EDGE_TTS_VOICE ?? 'zh-CN-YunxiNeural';
const RATE = process.env.EDGE_TTS_RATE ?? '+0%';
const PITCH = process.env.EDGE_TTS_PITCH ?? '+0Hz';
const story = JSON.parse(await fs.readFile(path.resolve(INPUT), 'utf8'));

if (!Array.isArray(story.scenes) || story.scenes.length === 0) throw new Error('story.scenes 不能为空');
await fs.mkdir(AUDIO_DIR, { recursive: true });

for (const [index, scene] of story.scenes.entries()) {
  const outputPath = path.join(AUDIO_DIR, `${String(index + 1).padStart(2, '0')}-${scene.id}.mp3`);
  await ttsSave(scene.narration, outputPath, { voice: VOICE, rate: RATE, pitch: PITCH });
  console.log(`[${index + 1}/${story.scenes.length}] 生成旁白 ${outputPath}`);
}

const scenes = story.scenes.map((scene, index) => ({
  ...scene,
  audioPath: path.join('audio', `${String(index + 1).padStart(2, '0')}-${scene.id}.mp3`).replaceAll('\\', '/'),
}));
await fs.writeFile(path.resolve(process.env.STORY_OUTPUT ?? './story.with-audio.json'), `${JSON.stringify({ ...story, scenes }, null, 2)}\n`, 'utf8');
