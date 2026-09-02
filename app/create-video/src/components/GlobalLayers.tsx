/**
 * 全局视觉层 — 每个视频的最外层必须包含
 * KenBurnsContainer + FilmGrade + AnimatedGradientBackground
 */
import React, { useMemo } from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from 'remotion';
import { noise2D } from '@remotion/noise';
import { COLORS } from '../theme';

/* ───────── Ken Burns 摄影机 ───────── */

export const KenBurnsContainer: React.FC<{
  children: React.ReactNode;
  zoomRange?: [number, number];
}> = ({ children, zoomRange = [1.0, 1.06] }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const scale = interpolate(frame, [0, durationInFrames], zoomRange, {
    extrapolateRight: 'clamp',
  });
  const translateX = interpolate(
    Math.sin((frame / durationInFrames) * Math.PI),
    [0, 1],
    [-12, 12],
  );
  const translateY = interpolate(
    Math.cos((frame / durationInFrames) * Math.PI * 0.7),
    [0, 1],
    [-8, 8],
  );

  return (
    <div
      style={{
        position: 'absolute',
        inset: '-5%',
        transform: `scale(${scale}) translate(${translateX}px, ${translateY}px)`,
        transformOrigin: 'center center',
      }}
    >
      {children}
    </div>
  );
};

/* ───────── 电影色彩后期 ───────── */

export const FilmGrade: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const frame = useCurrentFrame();

  const contrast = 1.03 + Math.sin(frame * 0.02) * 0.012;
  const hueShift = Math.sin(frame * 0.015) * 1.5;
  const sepia = 0.02 + Math.sin(frame * 0.01) * 0.008;

  return (
    <AbsoluteFill
      style={{
        filter: `contrast(${contrast}) hue-rotate(${hueShift}deg) sepia(${sepia})`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/* ───────── 动态渐变背景 ───────── */

export const AnimatedGradientBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // 缓慢旋转的渐变角度
  const angle = interpolate(frame, [0, durationInFrames], [135, 225]);

  // 噪声驱动的颜色偏移
  const n1 = noise2D('bg1', frame * 0.003, 0.5) * 0.15;
  const n2 = noise2D('bg2', 0.3, frame * 0.004) * 0.15;

  // 基础色：深蓝 → 暗紫，随噪声微调
  const r1 = Math.round(10 + n1 * 20);
  const g1 = Math.round(14 + n1 * 15);
  const b1 = Math.round(30 + n1 * 25);

  const r2 = Math.round(20 + n2 * 15);
  const g2 = Math.round(10 + n2 * 10);
  const b2 = Math.round(45 + n2 * 20);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${angle}deg, rgb(${r1},${g1},${b1}), rgb(${r2},${g2},${b2}))`,
      }}
    />
  );
};

/* ───────── 居中响应式容器 ───────── */

export const CenteredContainer: React.FC<{
  children: React.ReactNode;
  padding?: number;
  style?: React.CSSProperties;
}> = ({ children, padding = 60, style }) => (
  <AbsoluteFill
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding,
      ...style,
    }}
  >
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        maxWidth: '92%',
        maxHeight: '92%',
      }}
    >
      {children}
    </div>
  </AbsoluteFill>
);

/* ───────── 场景过渡遮罩（圆形揭示） ───────── */

export const CircleRevealMask: React.FC<{
  children: React.ReactNode;
  progress: number; // 0→1
}> = ({ children, progress }) => {
  const r = interpolate(progress, [0, 1], [0, 150], {
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <AbsoluteFill
      style={{
        clipPath: `circle(${r}% at 50% 50%)`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/* ───────── 顶部导航条（章节指示） ───────── */

export const ChapterIndicator: React.FC<{
  chapters: string[];
  currentChapter: number;
}> = ({ chapters, currentChapter }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div
      style={{
        position: 'absolute',
        top: 40,
        left: 60,
        right: 60,
        display: 'flex',
        gap: 8,
        zIndex: 100,
      }}
    >
      {chapters.map((ch, i) => {
        const isActive = i === currentChapter;
        const isPast = i < currentChapter;

        return (
          <div
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              background: isActive
                ? COLORS.accent
                : isPast
                  ? COLORS.accent + '88'
                  : COLORS.textSecondary + '33',
              transition: 'background 0.3s',
            }}
          />
        );
      })}
    </div>
  );
};
