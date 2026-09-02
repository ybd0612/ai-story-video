import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { StoryScene } from '../components/StoryScene';
import { COLORS, VIDEO } from '../theme';
import { getStoryDurationInSeconds, StoryVideoData } from '../story/types';
import { getStory } from '../story/storyRepository';

const toFrames = (seconds: number) => Math.round(seconds * VIDEO.fps);

export const STORY_VIDEO = getStory();
export const STORY_DURATION_IN_FRAMES = toFrames(getStoryDurationInSeconds(STORY_VIDEO));

export const StoryVideo: React.FC<{ story?: StoryVideoData }> = ({ story = STORY_VIDEO }) => {
  let offset = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      {story.scenes.map((scene) => {
        const from = offset;
        const duration = toFrames(scene.durationInSeconds);
        offset += duration;

        return (
          <Sequence key={scene.id} from={from} durationInFrames={duration} name={scene.title}>
            <StoryScene scene={scene} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
