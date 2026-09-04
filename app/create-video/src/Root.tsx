import React from 'react';
import { Composition } from 'remotion';
import { STORY_DURATION_IN_FRAMES, StoryVideo } from './compositions/StoryVideo';
import { getStoryDurationInSeconds, StoryVideoData } from './story/types';
import { getStory } from './story/storyRepository';
import { VIDEO } from './theme';

export const Root: React.FC = () => {
  const defaultStory = getStory();
  return (
    <>
      <Composition
        id="StoryVideo"
        component={StoryVideo}
        durationInFrames={STORY_DURATION_IN_FRAMES}
        fps={VIDEO.fps}
        width={VIDEO.width}
        height={VIDEO.height}
        calculateMetadata={({ props }) => {
          const story = (props as { story?: StoryVideoData }).story ?? defaultStory;
          return { durationInFrames: Math.round(getStoryDurationInSeconds(story) * VIDEO.fps) };
        }}
      />
    </>
  );
};
