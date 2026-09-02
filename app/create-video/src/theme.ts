/**
 * 主题配置 — 程序员终端风格
 * 深色背景 + 绿色/青色高亮 + 代码字体感
 */

export const COLORS = {
  /** 主背景 — 深蓝黑 */
  bg: '#0a0e17',
  /** 次背景 — 暗灰 */
  bgCard: '#111827',
  /** 主文字 — 白 */
  text: '#f0f6fc',
  /** 次文字 — 灰 */
  textSecondary: '#8b949e',
  /** 主强调 — 终端绿 */
  accent: '#39d353',
  /** 次强调 — 科技蓝 */
  accentBlue: '#58a6ff',
  /** 金句高亮 — 金色 */
  highlight: '#f0c040',
  /** 警告/数据 — 橙 */
  warn: '#f0883e',
  /** 危险 — 红 */
  danger: '#f85149',
} as const;

export const FONTS = {
  /** 主字体 — 系统等宽 */
  mono: '"JetBrains Mono", "Fira Code", "Cascadia Code", "Consolas", monospace',
  /** 中文 — 系统黑体 */
  sans: '"PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif',
} as const;

/** 弹簧预设 — 物理动态 */
export const SPRING = {
  /** 高频回弹 — 元素入场 */
  BOUNCE: { stiffness: 100, damping: 10, mass: 0.5 },
  /** 丝滑惯性 — 平移过渡 */
  SMOOTH: { stiffness: 80, damping: 15, mass: 0.8 },
  /** 强调回弹 — 关键数字 */
  EMPHASIS: { stiffness: 150, damping: 8, mass: 0.4 },
  /** 柔和收尾 — 背景元素 */
  GENTLE: { stiffness: 60, damping: 20, mass: 1.0 },
} as const;

/** 缓动曲线 */
export const EASING_BEZIER = {
  /** 呼吸感：先快后极慢 */
  breathe: [0.16, 1, 0.3, 1] as [number, number, number, number],
  /** 弹性进入 */
  elastic: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
  /** 快进慢出 */
  fastIn: [0.55, 0.085, 0.68, 0.53] as [number, number, number, number],
} as const;

/** 视频参数 */
export const VIDEO = {
  width: 1080,
  height: 1920,
  fps: 30,
  /** 总时长 5 分钟 = 300 秒 */
  durationInSeconds: 300,
} as const;

