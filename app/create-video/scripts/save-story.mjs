import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { resolveStoryStyle } from './style-memory.mjs';

const inputFile = process.env.STORY_DRAFT_FILE ?? process.argv[2] ?? './story.draft.json';
const outputFile = path.resolve(process.env.STORY_FILE ?? './story.json');
const approvalFile = path.join(path.dirname(outputFile), 'story.approved');
const approvalStateFile = path.join(path.dirname(outputFile), 'story.approval-state.json');
const schemaRequired = ['id', 'title', 'topic', 'style', 'character', 'scenes'];
const draft = JSON.parse(await fs.readFile(path.resolve(inputFile), 'utf8'));
const resolvedStyle = await resolveStoryStyle({
  topic: `${draft.topic ?? ''} ${draft.title ?? ''}`,
  style: draft.style,
  memoryFile: process.env.STYLE_MEMORY_FILE,
});
if (!draft.style && resolvedStyle.style) draft.style = resolvedStyle.style;

for (const key of schemaRequired) {
  if (!draft[key]) throw new Error(`故事缺少必填字段：${key}`);
}
if (!draft.character.description || !draft.character.visualTraits || !draft.character.wardrobe) {
  throw new Error('故事角色设定不完整：需要 description、visualTraits、wardrobe');
}
if (!Array.isArray(draft.scenes) || draft.scenes.length === 0) {
  throw new Error('故事至少需要一个镜头');
}
for (const [index, scene] of draft.scenes.entries()) {
  for (const key of ['id', 'title', 'narration', 'imagePrompt', 'durationInSeconds']) {
    if (!scene[key] && scene[key] !== 0) throw new Error(`第 ${index + 1} 个镜头缺少字段：${key}`);
  }
}

await fs.writeFile(outputFile, `${JSON.stringify(draft, null, 2)}\n`, 'utf8');
await fs.rm(approvalFile, { force: true });
const fingerprint = crypto.createHash('sha256').update(JSON.stringify(draft)).digest('hex');
await fs.writeFile(approvalStateFile, `${JSON.stringify({ status: 'pending', storyFile: outputFile, fingerprint }, null, 2)}\n`, 'utf8');
console.log(`故事草稿已保存：${outputFile}`);
console.log('当前状态：待审核。确认后执行 npm run approve:story。');
