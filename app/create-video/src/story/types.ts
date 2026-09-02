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

export const validateStory = (story: StoryVideoData): string[] => {
  const errors: string[] = [];

  if (!story.id.trim()) errors.push('故事缺少 id');
  if (!story.title.trim()) errors.push('故事缺少标题');
  if (!story.character?.description.trim()) errors.push('故事缺少固定人物描述');
  if (!story.character?.visualTraits.trim()) errors.push('故事缺少人物视觉特征');
  if (!story.character?.wardrobe.trim()) errors.push('故事缺少人物服装设定');
  if (story.scenes.length === 0) errors.push('故事至少需要一个镜头');

  story.scenes.forEach((scene, index) => {
    if (!scene.id.trim()) errors.push(`第 ${index + 1} 个镜头缺少 id`);
    if (!scene.narration.trim()) errors.push(`第 ${index + 1} 个镜头缺少旁白`);
    if (!scene.imagePrompt.trim()) errors.push(`第 ${index + 1} 个镜头缺少图片提示词`);
    if (scene.durationInSeconds <= 0) errors.push(`第 ${index + 1} 个镜头时长必须大于 0`);
  });

  return errors;
};
