import currentStory from './currentStory.json';
import { StoryVideoData } from './types';

/** 读取 Agent/素材脚本最终写入的当前故事。 */
export const getStory = (): StoryVideoData => currentStory as StoryVideoData;

export const getStoryFromJson = (value: unknown): StoryVideoData => {
  if (!value || typeof value !== 'object') throw new Error('故事 JSON 必须是对象');
  return value as StoryVideoData;
};
