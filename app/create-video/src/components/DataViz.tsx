/**
 * 数据可视化组件 - 卡片 / 波形 / 柱状图 / 时间轴
 */
import React, { useMemo } from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Easing,
} from 'remotion';
import { COLORS, FONTS, SPRING } from '../theme';

/* ───────── 数据卡片 ───────── */

export const DataCard: React.FC<{
  label: string;
  value: string;
  unit?: string;
  color?: string;
  delay?: number;
  icon?: string;
}> = ({
  label,
  value,
  unit = '',
  color = COLORS.accent,
  delay = 0,
  icon,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const p = spring({ frame: frame - delay, fps, config: SPRING.EMPHASIS });
  const opacity = interpolate(p, [0, 1], [0, 1]);
  const translateY = interpolate(p, [0, 1], [60, 0]);
  const scale = interpolate(p, [0, 1], [0.7, 1]);

  // 数字缩放超调
  const valueScale = interpolate(p, [0, 1], [0.3, 1.15]);

  return (
    <div
      style={{
        background: COLORS.bgCard + 'cc',
        borderRadius: 20,
        padding: '28px 32px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        opacity,
        transform: `translate3d(0,${translateY}px,0) scale(${scale})`,
        border: `1px solid ${color}33`,
        minWidth: 180,
      }}
    >
      {icon && (
        <span style={{ fontSize: 40, marginBottom: 4 }}>{icon}</span>
      )}
      <span
        style={{
          fontSize: 28,
          color: COLORS.textSecondary,
          fontFamily: FONTS.sans,
          fontWeight: 500,
        }}
      >
        {label}
      </span>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span
          style={{
            fontSize: 56,
            fontWeight: 800,
            color,
            fontFamily: FONTS.mono,
            transform: `scale(${valueScale})`,
          }}
        >
          {value}
        </span>
        {unit && (
          <span
            style={{
              fontSize: 24,
              color: COLORS.textSecondary,
              fontFamily: FONTS.sans,
            }}
          >
            {unit}
          </span>
        )}
      </div>
    </div>
  );
};

/* ───────── 多项数据卡片网格 ───────── */

export const DataCardGrid: React.FC<{
  items: Array<{
    label: string;
    value: string;
    unit?: string;
    color?: string;
    icon?: string;
  }>;
  staggerDelay?: number;
  columns?: number;
}> = ({ items, staggerDelay = 5, columns = 2 }) => {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: 20,
        width: '100%',
        maxWidth: 900,
      }}
    >
      {items.map((item, i) => (
        <DataCard key={i} {...item} delay={i * staggerDelay} />
      ))}
    </div>
  );
};

/* ───────── 波形图（多巴胺/皮质醇曲线） ───────── */

export const WaveformChart: React.FC<{
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  label?: string;
  delay?: number;
  animate?: boolean;
}> = ({
  data,
  width = 900,
  height = 300,
  color = COLORS.accent,
  label,
  delay = 0,
  animate = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const p = spring({ frame: frame - delay, fps, config: SPRING.SMOOTH });
  const revealProgress = animate
    ? interpolate(frame - delay, [0, 2 * fps], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: Easing.bezier(0.16, 1, 0.3, 1),
      })
    : 1;

  const padding = { top: 20, right: 20, bottom: 40, left: 20 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const pathD = useMemo(() => {
    const points = data.map((v, i) => ({
      x: padding.left + (i / (data.length - 1)) * chartW,
      y: padding.top + (1 - v) * chartH,
    }));

    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (prev.x + curr.x) / 2;
      d += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    return d;
  }, [data]);

  const fillD = useMemo(() => {
    const lastX = padding.left + chartW;
    const baseY = padding.top + chartH;
    return `${pathD} L ${lastX} ${baseY} L ${padding.left} ${baseY} Z`;
  }, [pathD]);

  const gradientId = useMemo(
    () => `grad-${Math.random().toString(36).slice(2, 8)}`,
    [],
  );

  const opacity = interpolate(p, [0, 1], [0, 1]);

  return (
    <div
      style={{
        opacity,
        transform: `translate3d(0,${interpolate(p, [0, 1], [40, 0])}px,0)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
      }}
    >
      {label && (
        <span
          style={{
            fontSize: 28,
            color: COLORS.textSecondary,
            fontFamily: FONTS.sans,
            fontWeight: 600,
          }}
        >
          {label}
        </span>
      )}
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
          <clipPath id={`clip-${gradientId}`}>
            <rect
              x={padding.left}
              y={0}
              width={chartW * revealProgress}
              height={height}
            />
          </clipPath>
        </defs>

        {/* 网格线 */}
        {[0.25, 0.5, 0.75].map((v) => (
          <line
            key={v}
            x1={padding.left}
            y1={padding.top + (1 - v) * chartH}
            x2={padding.left + chartW}
            y2={padding.top + (1 - v) * chartH}
            stroke={COLORS.textSecondary + '22'}
            strokeWidth={1}
          />
        ))}

        <path
          d={fillD}
          fill={`url(#${gradientId})`}
          clipPath={`url(#clip-${gradientId})`}
        />

        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
          clipPath={`url(#clip-${gradientId})`}
        />
      </svg>
    </div>
  );
};

/* ───────── 柱状图 ───────── */

export const BarChart: React.FC<{
  items: Array<{ label: string; value: number; color?: string }>;
  width?: number;
  height?: number;
  staggerDelay?: number;
  maxValue?: number;
}> = ({
  items,
  width = 900,
  height = 350,
  staggerDelay = 4,
  maxValue,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const padding = { top: 20, right: 20, bottom: 60, left: 60 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const barW = Math.min(80, (chartW / items.length) * 0.6);
  const gap = chartW / items.length;

  const max = maxValue ?? Math.max(...items.map((d) => d.value));

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Y 轴标签 */}
      {[0, max * 0.5, max].map((v, i) => (
        <text
          key={i}
          x={padding.left - 10}
          y={padding.top + (1 - v / max) * chartH + 6}
          fill={COLORS.textSecondary}
          fontSize={18}
          fontFamily={FONTS.mono}
          textAnchor="end"
        >
          {v.toFixed(1)}x
        </text>
      ))}

      {/* 柱子 */}
      {items.map((item, i) => {
        const delay = i * staggerDelay;
        const p = spring({ frame: frame - delay, fps, config: SPRING.BOUNCE });
        const barH = interpolate(p, [0, 1], [0, (item.value / max) * chartH]);
        const barOpacity = interpolate(p, [0, 1], [0, 1]);

        const x = padding.left + i * gap + (gap - barW) / 2;
        const y = padding.top + chartH - barH;

        return (
          <g key={i} opacity={barOpacity}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={barH}
              rx={6}
              fill={item.color ?? COLORS.accent}
            />
            <text
              x={x + barW / 2}
              y={y - 8}
              fill={item.color ?? COLORS.accent}
              fontSize={22}
              fontWeight={700}
              fontFamily={FONTS.mono}
              textAnchor="middle"
            >
              {item.value}x
            </text>
            <text
              x={x + barW / 2}
              y={padding.top + chartH + 28}
              fill={COLORS.textSecondary}
              fontSize={18}
              fontFamily={FONTS.sans}
              textAnchor="middle"
            >
              {item.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

/* ───────── 列表项（错落入场） ───────── */

export const AnimatedList: React.FC<{
  items: Array<{ icon: string; text: string }>;
  staggerDelay?: number;
  startDelay?: number;
}> = ({ items, staggerDelay = 8, startDelay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        width: '100%',
        maxWidth: 850,
      }}
    >
      {items.map((item, i) => {
        const delay = startDelay + i * staggerDelay;
        const p = spring({ frame: frame - delay, fps, config: SPRING.BOUNCE });
        const opacity = interpolate(p, [0, 1], [0, 1]);
        const translateX = interpolate(p, [0, 1], [-50, 0]);
        const scale = interpolate(p, [0, 1], [0.85, 1]);

        return (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              background: COLORS.bgCard + 'aa',
              borderRadius: 16,
              padding: '20px 28px',
              opacity,
              transform: `translate3d(${translateX}px,0,0) scale(${scale})`,
              border: `1px solid ${COLORS.accent}22`,
            }}
          >
            <span style={{ fontSize: 44 }}>{item.icon}</span>
            <span
              style={{
                fontSize: 34,
                fontWeight: 600,
                color: COLORS.text,
                fontFamily: FONTS.sans,
                lineHeight: 1.5,
              }}
            >
              {item.text}
            </span>
          </div>
        );
      })}
    </div>
  );
};
