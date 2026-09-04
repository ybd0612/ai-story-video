import { SAMPLE_STORY } from './sampleStory';
import { StoryVideoData, validateStory } from './types';

/** 返回可用于 Remotion 默认预览的公开示例故事。 */
export const getStory = (): StoryVideoData => SAMPLE_STORY;

export const getStoryFromJson = (value: unknown): StoryVideoData => {
  if (!value || typeof value !== 'object') throw new Error('故事 JSON 必须是对象');
  const story = value as StoryVideoData;
  const errors = validateStory(story);
  if (errors.length > 0) throw new Error(`故事运行时校验失败：${errors.join('；')}`);
  return story;
};
