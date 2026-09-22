import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { noise3D } from '@remotion/noise';

const MOTES = 14;

/** 把 [-1,1] 的连续噪声映射到 [0,1] */
const unit = (value: number) => (value + 1) / 2;

/**
 * 氛围层：静态光感渐变 + 悬浮尘埃 + 暗角。
 *
 * 性能约束（实测）：对全屏渐变层做 transform 平移、与多个用 left/top 定位的微粒
 * 同时存在时，每帧会触发整层重新光栅化——300 帧渲染从 22s 涨到 63s。因此
 * ① 光感改为静态渐变上的缓慢透明度呼吸，不对全屏层做 transform；
 * ② 尘埃一律用 transform: translate3d 定位，逐帧只改变换、不触发布局。
 */
export const AtmosphereLayer: React.FC<{
  seed: string;
  durationInFrames: number;
  tint?: string;
}> = ({ seed, durationInFrames, tint = '#ffe9c4' }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // 一个镜头里缓慢明暗一次，替代横向扫动
  const breathe = interpolate(frame, [0, durationInFrames / 2, durationInFrames], [0.3, 0.6, 0.3], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <AbsoluteFill
        style={{
          background: `linear-gradient(115deg, transparent 30%, ${tint}24 48%, transparent 66%)`,
          opacity: breathe,
        }}
      />

      <div style={{ position: 'absolute', inset: 0 }}>
        {Array.from({ length: MOTES }).map((_, index) => {
          const drift = frame / (fps * 6);
          const x = unit(noise3D(seed, index * 0.37, drift, 0.5)) * width;
          const y = unit(noise3D(seed, index * 0.91 + 7, drift * 0.8, 1.5)) * height;
          const size = 1.6 + unit(noise3D(seed, index * 1.7, 0, 2.5)) * 3.4;
          const opacity = 0.1 + unit(noise3D(seed, index * 2.3, drift * 1.4, 3.5)) * 0.3;
          return (
            <div
              key={index}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: size,
                height: size,
                borderRadius: '50%',
                background: tint,
                opacity,
                transform: `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`,
              }}
            />
          );
        })}
      </div>

      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse at 50% 44%, transparent 44%, rgba(0,0,0,0.28) 76%, rgba(0,0,0,0.52) 100%)',
        }}
      />
    </AbsoluteFill>
  );
};
