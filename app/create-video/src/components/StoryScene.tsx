import React from 'react';
import { AbsoluteFill, Audio, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONTS } from '../theme';
import { StoryScene as StorySceneData } from '../story/types';

export const StoryScene: React.FC<{ scene: StorySceneData }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const imageSource = scene.imagePath ? staticFile(scene.imagePath) : scene.imageUrl;
  const { durationInFrames } = useVideoConfig();
  const progress = frame / Math.max(durationInFrames - 1, 1);
  const opacity = interpolate(frame, [0, 12, durationInFrames - 12, durationInFrames], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const scale = interpolate(progress, [0, 1], [1.03, 1.1], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ background: COLORS.bg, opacity }}>
      {scene.audioPath && <Audio src={staticFile(scene.audioPath)} volume={1} />}
      {imageSource ? (
        <Img
          src={imageSource}
          style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${scale})` }}
        />
      ) : (
        <AbsoluteFill
          style={{
            background: 'radial-gradient(circle at 50% 35%, #263451 0%, #101522 45%, #080b12 100%)',
          }}
        />
      )}

      <AbsoluteFill
        style={{
          background: 'linear-gradient(180deg, rgba(5, 8, 15, 0.18) 25%, rgba(5, 8, 15, 0.88) 82%, rgba(5, 8, 15, 0.98) 100%)',
        }}
      />

      <div
        style={{
          position: 'absolute',
          left: 72,
          right: 72,
          bottom: 170,
          color: COLORS.text,
          fontFamily: FONTS.sans,
        }}
      >
        <div style={{ color: COLORS.highlight, fontSize: 30, letterSpacing: 4, marginBottom: 26 }}>
          {scene.title}
        </div>
        <div style={{ fontSize: 52, lineHeight: 1.55, fontWeight: 600, textShadow: '0 3px 18px rgba(0,0,0,0.45)' }}>
          {scene.narration}
        </div>
        {scene.subtitle && (
          <div style={{ marginTop: 30, color: '#d5dbea', fontSize: 34, lineHeight: 1.5 }}>
            {scene.subtitle}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
