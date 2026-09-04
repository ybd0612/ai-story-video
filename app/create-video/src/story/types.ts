export type CharacterBible = {
  id: string;
  name: string;
  description: string;
  visualTraits: string;
  wardrobe: string;
  referenceImage?: string;
};

export type StoryScene = {
  id: string;
  title: string;
  narration: string;
  imagePrompt: string;
  durationInSeconds: number;
  subtitle?: string;
  imageUrl?: string;
  imagePath?: string;
  audioPath?: string;
  audioDurationInSeconds?: number;
};

export type StoryVideoData = {
  id: string;
  title: string;
  topic: string;
  style: string;
  author?: string;
  character: CharacterBible;
  scenes: StoryScene[];
};

export const getStoryDurationInSeconds = (story: StoryVideoData): number =>
  story.scenes.reduce((total, scene) => total + scene.durationInSeconds, 0);

export const buildConsistentImagePrompt = (story: StoryVideoData, scene: StoryScene): string => [
  `Character continuity: ${story.character.description}`,
  `Visual traits: ${story.character.visualTraits}`,
  `Wardrobe: ${story.character.wardrobe}`,
  `Scene action: ${scene.imagePrompt}`,
  `Overall style: ${story.style}`,
  'Keep the same character identity, face, hairstyle, body proportions and wardrobe across all scenes. Vertical 9:16 composition. No text, no captions, no watermark.',
].join('\n');

export const validateStory = (value: unknown): string[] => {
  const errors: string[] = [];
  if (!value || typeof value !== 'object') return ['故事 JSON 必须是对象'];
  const story = value as Partial<StoryVideoData>;

  for (const field of ['id', 'title', 'topic', 'style'] as const) {
    if (typeof story[field] !== 'string' || !story[field].trim()) errors.push(`故事缺少有效字段：${field}`);
  }
  const character = story.character;
  for (const field of ['id', 'name', 'description', 'visualTraits', 'wardrobe'] as const) {
    if (typeof character?.[field] !== 'string' || !character[field].trim()) errors.push(`人物缺少有效字段：character.${field}`);
  }
  if (!Array.isArray(story.scenes) || story.scenes.length === 0) return [...errors, '故事至少需要一个镜头'];

  const ids = new Set<string>();
  story.scenes.forEach((scene, index) => {
    const label = `第 ${index + 1} 个镜头`;
    for (const field of ['id', 'title', 'narration', 'imagePrompt'] as const) {
      if (typeof scene?.[field] !== 'string' || !scene[field].trim()) errors.push(`${label}缺少有效字段：${field}`);
    }
    if (typeof scene?.id === 'string' && ids.has(scene.id)) errors.push(`${label} id 重复：${scene.id}`);
    if (typeof scene?.id === 'string') ids.add(scene.id);
    if (!Number.isFinite(scene?.durationInSeconds) || scene.durationInSeconds <= 0) errors.push(`${label} durationInSeconds 必须是正数`);
  });
  return errors;
};
