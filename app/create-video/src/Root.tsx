import React from 'react';
import { Composition } from 'remotion';
import { STORY_DURATION_IN_FRAMES, StoryVideo } from './compositions/StoryVideo';
import { VIDEO } from './theme';

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="StoryVideo"
        component={StoryVideo}
        durationInFrames={STORY_DURATION_IN_FRAMES}
        fps={VIDEO.fps}
        width={VIDEO.width}
        height={VIDEO.height}
      />
    </>
  );
};
