import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion';
import { StoryScene } from '../components/StoryScene';
import { COLORS, SCENE_MOTION, VIDEO } from '../theme';
import { getStoryDurationInSeconds, StoryVideoData } from '../story/types';
import { getStory, getStoryFromJson } from '../story/storyRepository';
import { planSceneWindows } from '../lib/scene-plan';

const toFrames = (seconds: number) => Math.max(1, Math.round(seconds * VIDEO.fps));

export const STORY_VIDEO = getStory();
export const STORY_DURATION_IN_FRAMES = toFrames(getStoryDurationInSeconds(STORY_VIDEO));

/**
 * 故事成片时间轴。
 *
 * 画面层按 planSceneWindows 的结果互相重叠 xfade 帧形成交叉溶解；
 * 音频始终放在 `window.audioFrom` 这个绝对帧上，因此转场不会让旁白提前或滞后。
 */
export const StoryVideo: React.FC<{ story?: StoryVideoData }> = ({ story = STORY_VIDEO }) => {
  const validatedStory = getStoryFromJson(story);
  const windows = planSceneWindows(validatedStory.scenes, {
    fps: VIDEO.fps,
    xfadeFrames: SCENE_MOTION.xfadeFrames,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      {validatedStory.scenes.map((scene, index) => {
        const window = windows[index];
        const phraseFrames = Math.min(
          window.audioDuration,
          toFrames(scene.audioDurationInSeconds ?? scene.durationInSeconds),
        );

        return (
          <Sequence
            key={scene.id}
            from={window.visualFrom}
            durationInFrames={window.visualDuration}
            name={scene.title}
          >
            {scene.audioPath ? (
              <Sequence
                from={window.audioOffset}
                durationInFrames={window.audioDuration}
                name={`${scene.title} · 旁白`}
              >
                <Audio src={staticFile(scene.audioPath)} volume={1} />
              </Sequence>
            ) : null}
            <StoryScene
              scene={scene}
              index={index}
              window={window}
              phraseFrames={phraseFrames}
              isFirst={index === 0}
              isLast={index === validatedStory.scenes.length - 1}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
