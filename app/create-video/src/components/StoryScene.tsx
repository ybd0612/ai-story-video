import React from 'react';
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { COLORS, EASING_BEZIER, FONTS, SCENE_MOTION, SPRING } from '../theme';
import { StoryScene as StorySceneData } from '../story/types';
import { SceneWindow, shouldShowGoldenLine, splitNarrationIntoPhrases } from '../lib/scene-plan';
import { AtmosphereLayer } from './AtmosphereLayer';

type Props = {
  scene: StorySceneData;
  index: number;
  window: SceneWindow;
  /** 旁白实际音频帧数，用于给字幕分配时间窗 */
  phraseFrames: number;
  isFirst: boolean;
  isLast: boolean;
};

/**
 * 单镜头呈现层：带方向的缓动运镜 + 交叉溶解 + 逐句上屏旁白 + 氛围层。
 *
 * 声音不在此处放置——它由 StoryVideo 按绝对时间轴锚定，保证转场不会拖动音频。
 */
export const StoryScene: React.FC<Props> = ({ scene, index, window, phraseFrames, isFirst, isLast }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const total = window.visualDuration;

  // 交叉溶解：入场由下一镜覆盖，出场不回到黑场，避免切点闪黑
  const fadeInFrames = isFirst ? SCENE_MOTION.introFadeFrames : window.audioOffset;
  const incoming = interpolate(frame, [0, Math.max(fadeInFrames, 1)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const outgoing = isLast
    ? interpolate(frame, [total - SCENE_MOTION.outroFadeFrames, total], [1, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 1;

  const camera = SCENE_MOTION.cameraMoves[index % SCENE_MOTION.cameraMoves.length];
  const eased = Easing.bezier(...EASING_BEZIER.breathe)(Math.min(frame / Math.max(total - 1, 1), 1));
  const scale = camera.fromScale + (camera.toScale - camera.fromScale) * eased;
  const translateX = camera.fromX + (camera.toX - camera.fromX) * eased;
  const translateY = camera.fromY + (camera.toY - camera.fromY) * eased;
  const imageSource = scene.imagePath ? staticFile(scene.imagePath) : scene.imageUrl;

  const titleStart = window.audioOffset + 4;
  const titleIn = spring({
    frame: frame - titleStart,
    fps,
    config: SPRING.EMPHASIS,
    durationInFrames: 26,
  });

  const phrases = splitNarrationIntoPhrases(scene.narration, { durationFrames: phraseFrames });
  const subtitleStart = window.audioOffset + Math.round(fps * 0.9);
  const subtitleIn = spring({
    frame: frame - subtitleStart,
    fps,
    config: SPRING.GENTLE,
    durationInFrames: 30,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg, opacity: incoming * outgoing }}>
      {imageSource ? (
        <Img
          src={imageSource}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: `translate(${translateX}%, ${translateY}%) scale(${scale})`,
          }}
        />
      ) : (
        <AbsoluteFill
          style={{ background: 'radial-gradient(circle at 50% 35%, #263451 0%, #101522 45%, #080b12 100%)' }}
        />
      )}

      <AtmosphereLayer seed={`${scene.id}-${index}`} durationInFrames={total} />

      <AbsoluteFill
        style={{
          background:
            'linear-gradient(180deg, rgba(5,8,15,0.10) 18%, rgba(5,8,15,0.30) 52%, rgba(5,8,15,0.86) 78%, rgba(4,6,12,0.96) 100%)',
        }}
      />

      <div
        style={{
          position: 'absolute',
          left: SCENE_MOTION.safeArea.left,
          right: SCENE_MOTION.safeArea.right,
          bottom: SCENE_MOTION.safeArea.bottom,
          fontFamily: FONTS.sans,
        }}
      >
        <div
          style={{
            color: COLORS.highlight,
            fontSize: 28,
            letterSpacing: 6,
            marginBottom: 30,
            opacity: titleIn,
            transform: `translateY(${(1 - titleIn) * 26}px)`,
          }}
        >
          {scene.title}
        </div>

        <div style={{ height: 168, position: 'relative' }}>
          {phrases.map((phrase) => {
            const from = window.audioOffset + phrase.from;
            const until = window.audioOffset + phrase.until;
            if (frame < from - SCENE_MOTION.caption.offsetFrames || frame > until) return null;
            const enter = interpolate(frame, [from, from + SCENE_MOTION.caption.enterFrames], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            const exit = interpolate(
              frame,
              [Math.max(until - SCENE_MOTION.caption.exitFrames, from + 1), until],
              [1, 0],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
            );
            return (
              <div
                key={`${phrase.from}-${phrase.text}`}
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'flex-start',
                  fontSize: 62,
                  lineHeight: 1.42,
                  fontWeight: 600,
                  color: COLORS.text,
                  textShadow: '0 4px 22px rgba(0,0,0,0.62)',
                  opacity: enter * exit,
                  transform: `translateY(${(1 - enter) * 30}px)`,
                }}
              >
                {phrase.text}
              </div>
            );
          })}
        </div>

        {shouldShowGoldenLine(scene.subtitle, scene.narration) ? (
          <div
            style={{
              marginTop: 26,
              color: '#e4e9f4',
              fontSize: 33,
              lineHeight: 1.5,
              letterSpacing: 1,
              opacity: subtitleIn * 0.92,
              transform: `translateY(${(1 - subtitleIn) * 18}px)`,
            }}
          >
            {scene.subtitle}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
