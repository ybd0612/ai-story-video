import fs from 'node:fs/promises';
import path from 'node:path';

const source = path.resolve(process.env.STORY_SOURCE ?? './story.json');
const target = path.resolve(process.env.STORY_TARGET ?? './src/story/currentStory.json');
const story = JSON.parse(await fs.readFile(source, 'utf8'));

if (!story.character || !Array.isArray(story.scenes) || story.scenes.length === 0) {
  throw new Error('故事必须包含 character 和至少一个 scenes');
}

await fs.mkdir(path.dirname(target), { recursive: true });
await fs.writeFile(target, `${JSON.stringify(story, null, 2)}\n`, 'utf8');
console.log(`已更新 Remotion 当前故事：${target}`);
