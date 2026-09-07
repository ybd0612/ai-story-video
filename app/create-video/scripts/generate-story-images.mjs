import fs from 'node:fs/promises';
import path from 'node:path';

const ENDPOINT = 'https://api.agnes-ai.cn/v1/images/generations';
const MODEL = 'agnes-image-2.5-flash';
const SIZE = process.env.AGNES_IMAGE_SIZE ?? '1K';
const RATIO = process.env.AGNES_IMAGE_RATIO ?? '9:16';
const USER_TYPE = process.env.AGNES_USER_TYPE ?? 'default';
const INPUT = process.env.STORY_FILE ?? './story.json';
const OUTPUT = process.env.STORY_OUTPUT ?? './story.with-images.json';
const IMAGE_DIR = process.env.STORY_IMAGE_DIR ?? './public/images';
const PUBLIC_ROOT = path.resolve(process.env.STORY_PUBLIC_ROOT ?? './');
const API_KEY = process.env.AGNES_API_KEY;

const ACTUAL_RPM = {
  default: { '1K': 20, '2K': 10, '3K': 1, '4K': 1 },
  enterprise: { '1K': 40, '2K': 20, '3K': 1, '4K': 1 },
  TokenPlan: { '1K': 100, '2K': 80, '3K': 1, '4K': 1 },
};

if (!API_KEY) throw new Error('缺少 AGNES_API_KEY 环境变量，拒绝继续请求');
if (!ACTUAL_RPM[USER_TYPE]?.[SIZE]) throw new Error(`不支持的用户类型或尺寸：${USER_TYPE}/${SIZE}`);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const intervalMs = Math.ceil(60_000 / ACTUAL_RPM[USER_TYPE][SIZE]);
const REQUEST_TIMEOUT_MS = Number(process.env.AGNES_REQUEST_TIMEOUT_MS ?? '60000');
const MAX_RETRIES = Number(process.env.AGNES_MAX_RETRIES ?? '3');

const fetchWithRetry = async (url, options = {}) => {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      if (response.ok || (response.status < 500 && response.status !== 429) || attempt === MAX_RETRIES) return response;
      const retryAfter = Number(response.headers.get('retry-after'));
      const delay = Number.isFinite(retryAfter) ? retryAfter * 1000 : 2 ** attempt * 1000;
      await wait(delay);
    } catch (error) {
      if (attempt === MAX_RETRIES) throw new Error(`请求失败（重试 ${MAX_RETRIES} 次）：${error.message}`);
      await wait(2 ** attempt * 1000);
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error('请求失败：超过最大重试次数');
};

const writeAtomically = async (file, content) => {
  const temporary = `${file}.tmp-${process.pid}`;
  await fs.writeFile(temporary, content);
  await fs.rename(temporary, file);
};
const inputPath = path.resolve(INPUT);
const outputPath = path.resolve(OUTPUT);
const imageDir = path.resolve(IMAGE_DIR);
const story = JSON.parse(await fs.readFile(inputPath, 'utf8'));

if (!story.character?.description || !story.character?.visualTraits || !story.character?.wardrobe) {
  throw new Error('故事缺少 character.description、visualTraits 或 wardrobe，无法保证人物一致性');
}
if (!Array.isArray(story.scenes) || story.scenes.length === 0) throw new Error('story.scenes 不能为空');

await fs.mkdir(imageDir, { recursive: true });
const scenes = [];

const buildPrompt = (scene) => [
  `Character continuity: ${story.character.description}`,
  `Visual traits: ${story.character.visualTraits}`,
  `Wardrobe: ${story.character.wardrobe}`,
  `Scene action: ${scene.imagePrompt}`,
  `Overall style: ${story.style}`,
  'Keep the same character identity, face, hairstyle, body proportions and wardrobe across all scenes. Vertical 9:16 composition. No text, no captions, no watermark.',
].join('\n');

for (const [index, scene] of story.scenes.entries()) {
  if (process.env.TARGET_SCENE_ID && String(scene.id) !== String(process.env.TARGET_SCENE_ID)) {
    const imagePath = path.join(imageDir, `${String(index + 1).padStart(2, '0')}-${scene.id}.png`);
    const existing = await fs.access(imagePath).then(() => true).catch(() => false);
    if (!existing) throw new Error(`目标镜头补偿时发现缺失图片：${scene.id}`);
    scenes.push({ ...scene, imagePath: path.relative(PUBLIC_ROOT, imagePath).replaceAll('\\\\', '/') });
    continue;
  }
  const imagePath = path.join(imageDir, `${String(index + 1).padStart(2, '0')}-${scene.id}.png`);
  const existing = await fs.access(imagePath).then(() => true).catch(() => false);

  if (existing) {
    console.log(`[${index + 1}/${story.scenes.length}] 复用本地图片 ${imagePath}`);
    scenes.push({ ...scene, imagePath: path.relative(PUBLIC_ROOT, imagePath).replaceAll('\\', '/') });
    continue;
  }

  if (index > 0) await wait(intervalMs);
  console.log(`[${index + 1}/${story.scenes.length}] 生成 ${scene.id}，档位 ${SIZE}，比例 ${RATIO}`);
  const response = await fetchWithRetry(ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      prompt: buildPrompt(scene),
      size: SIZE,
      ratio: RATIO,
      ...(story.character.referenceImage
        ? { extra_body: { image: [story.character.referenceImage], response_format: 'url' } }
        : { extra_body: { response_format: 'url' } }),
    }),
  });

  if (!response.ok) throw new Error(`第 ${scene.id} 个镜头失败：HTTP ${response.status} ${await response.text()}`);
  const payload = await response.json();
  const url = payload.data?.[0]?.url;
  if (!url) throw new Error(`第 ${scene.id} 个镜头响应缺少 data[0].url`);

  const imageResponse = await fetchWithRetry(url);
  if (!imageResponse.ok) throw new Error(`第 ${scene.id} 个镜头图片下载失败：HTTP ${imageResponse.status}`);
  await writeAtomically(imagePath, Buffer.from(await imageResponse.arrayBuffer()));
  scenes.push({ ...scene, imagePath: path.relative(PUBLIC_ROOT, imagePath).replaceAll('\\', '/') });
}

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify({ ...story, scenes }, null, 2)}\n`, 'utf8');
console.log(`完成：${outputPath}`);
