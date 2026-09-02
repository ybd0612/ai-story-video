/**
 * 文字动画组件 — 逐字弹出 + 金句高亮
 */
import React, { useMemo } from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from 'remotion';
import { COLORS, FONTS, SPRING } from '../theme';

/* ───────── 逐字弹出文字 ───────── */

export const CharByCharText: React.FC<{
  text: string;
  fontSize?: number;
  color?: string;
  delay?: number;
  staggerFrames?: number;
  fontWeight?: number;
  style?: React.CSSProperties;
}> = ({
  text,
  fontSize = 48,
  color = COLORS.text,
  delay = 0,
  staggerFrames = 3,
  fontWeight = 700,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const chars = useMemo(() => text.split(''), [text]);

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 2,
        ...style,
      }}
    >
      {chars.map((char, i) => {
        const charDelay = delay + i * staggerFrames;
        const p = spring({
          frame: frame - charDelay,
          fps,
          config: SPRING.BOUNCE,
        });

        const opacity = interpolate(p, [0, 1], [0, 1]);
        const translateY = interpolate(p, [0, 1], [40, 0]);
        const scale = interpolate(p, [0, 1], [0.5, 1]);
        const rotateZ = interpolate(p, [0, 1], [15, 0]);

        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              fontSize,
              fontWeight,
              color,
              fontFamily: char.match(/[a-zA-Z0-9]/)
                ? FONTS.mono
                : FONTS.sans,
              opacity,
              transform: `translate3d(0,${translateY}px,0) scale(${scale}) rotate(${rotateZ}deg)`,
              whiteSpace: char === ' ' ? 'pre' : 'normal',
            }}
          >
            {char}
          </span>
        );
      })}
    </div>
  );
};

/* ───────── 标题文字（带高亮底线） ───────── */

export const SectionTitle: React.FC<{
  text: string;
  accentColor?: string;
  delay?: number;
  fontSize?: number;
}> = ({ text, accentColor = COLORS.accent, delay = 0, fontSize = 56 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const p = spring({ frame: frame - delay, fps, config: SPRING.EMPHASIS });
  const opacity = interpolate(p, [0, 1], [0, 1]);
  const translateY = interpolate(p, [0, 1], [60, 0]);
  const lineWidth = interpolate(p, [0, 1], [0, 100]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        opacity,
        transform: `translate3d(0,${translateY}px,0)`,
      }}
    >
      <span
        style={{
          fontSize,
          fontWeight: 800,
          color: COLORS.text,
          fontFamily: FONTS.sans,
          textAlign: 'center',
        }}
      >
        {text}
      </span>
      <div
        style={{
          width: `${lineWidth}%`,
          height: 4,
          background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
          borderRadius: 2,
        }}
      />
    </div>
  );
};

/* ───────── 金句引用 ───────── */

export const Quote: React.FC<{
  text: string;
  delay?: number;
}> = ({ text, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const p = spring({ frame: frame - delay, fps, config: SPRING.SMOOTH });
  const opacity = interpolate(p, [0, 1], [0, 1]);
  const translateX = interpolate(p, [0, 1], [-30, 0]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 16,
        opacity,
        transform: `translate3d(${translateX}px,0,0)`,
        maxWidth: '90%',
      }}
    >
      <div
        style={{
          width: 4,
          minHeight: 60,
          background: COLORS.highlight,
          borderRadius: 2,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontSize: 36,
          fontWeight: 600,
          color: COLORS.highlight,
          fontFamily: FONTS.sans,
          lineHeight: 1.6,
        }}
      >
        {text}
      </span>
    </div>
  );
};

/* ───────── 普通文字行（弹簧入场） ───────── */

export const AnimatedText: React.FC<{
  text: string;
  fontSize?: number;
  color?: string;
  delay?: number;
  fontWeight?: number;
  style?: React.CSSProperties;
}> = ({
  text,
  fontSize = 36,
  color = COLORS.text,
  delay = 0,
  fontWeight = 500,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const p = spring({ frame: frame - delay, fps, config: SPRING.SMOOTH });
  const opacity = interpolate(p, [0, 1], [0, 1]);
  const translateY = interpolate(p, [0, 1], [30, 0]);

  return (
    <div
      style={{
        fontSize,
        fontWeight,
        color,
        fontFamily: FONTS.sans,
        opacity,
        transform: `translate3d(0,${translateY}px,0)`,
        textAlign: 'center',
        lineHeight: 1.6,
        ...style,
      }}
    >
      {text}
    </div>
  );
};
