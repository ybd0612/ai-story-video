import fs from 'node:fs/promises';
import path from 'node:path';

const storyFile = path.resolve(process.env.STORY_FILE ?? process.argv[2] ?? './story.json');
const story = JSON.parse(await fs.readFile(storyFile, 'utf8'));
if (!story.character || !Array.isArray(story.scenes) || story.scenes.length === 0) throw new Error('故事结构不完整');
console.log(`Dry-run 通过：${storyFile}`);
console.log(`将处理 ${story.scenes.length} 个镜头，预计生成图片、旁白并渲染视频。`);
console.log('未调用外部服务，未写入媒体或视频文件。');
