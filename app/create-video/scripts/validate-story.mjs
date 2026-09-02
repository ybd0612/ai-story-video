import fs from 'node:fs/promises';
import path from 'node:path';

const storyFile = path.resolve(process.env.STORY_FILE ?? process.argv[2] ?? './story.json');
const story = JSON.parse(await fs.readFile(storyFile, 'utf8'));
const errors = [];

for (const field of ['id', 'title', 'topic', 'style']) {
  if (typeof story[field] !== 'string' || !story[field].trim()) errors.push(`故事缺少有效字段：${field}`);
}
const character = story.character;
for (const field of ['id', 'name', 'description', 'visualTraits', 'wardrobe']) {
  if (typeof character?.[field] !== 'string' || !character[field].trim()) errors.push(`人物缺少有效字段：character.${field}`);
}
if (!Array.isArray(story.scenes) || story.scenes.length === 0) {
  errors.push('故事至少需要一个镜头');
} else {
  const ids = new Set();
  story.scenes.forEach((scene, index) => {
    const label = `第 ${index + 1} 个镜头`;
    for (const field of ['id', 'title', 'narration', 'imagePrompt']) {
      if (typeof scene?.[field] !== 'string' || !scene[field].trim()) errors.push(`${label}缺少有效字段：${field}`);
    }
    if (ids.has(scene.id)) errors.push(`${label} id 重复：${scene.id}`);
    ids.add(scene.id);
    if (!Number.isFinite(scene.durationInSeconds) || scene.durationInSeconds <= 0) {
      errors.push(`${label} durationInSeconds 必须是正数`);
    }
  });
}

if (errors.length) throw new Error(`故事校验失败：\n${errors.map((error) => `- ${error}`).join('\n')}`);
console.log(`故事校验通过：${storyFile}（${story.scenes.length} 个镜头）`);
