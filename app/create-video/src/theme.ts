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

/** 单个 Ken Burns 运镜的起止状态（scale 倍数，x/y 为百分比位移） */
export type CameraMove = {
  fromScale: number;
  toScale: number;
  fromX: number;
  toX: number;
  fromY: number;
  toY: number;
};

/** 镜头动效与字幕版式 */
export const SCENE_MOTION = {
  /** 相邻镜头交叉溶解帧数（0.6s @30fps）；短镜头会被自动夹紧 */
  xfadeFrames: 18,
  /** 全片开场从黑场淡入 */
  introFadeFrames: 10,
  /** 全片收尾淡出到黑场 */
  outroFadeFrames: 16,
  /** 运镜方向轮换表：按镜头序号取模，避免每镜同一节奏 */
  cameraMoves: [
    { fromScale: 1.06, toScale: 1.17, fromX: 0, toX: -2.2, fromY: 0.6, toY: -1.4 },
    { fromScale: 1.16, toScale: 1.04, fromX: 2.4, toX: -1.2, fromY: -0.8, toY: 0.8 },
    { fromScale: 1.1, toScale: 1.13, fromX: -3, toX: 3, fromY: 0.4, toY: -0.4 },
    { fromScale: 1.14, toScale: 1.06, fromX: 2.6, toX: -2.6, fromY: 1, toY: -0.6 },
    { fromScale: 1.05, toScale: 1.15, fromX: -1.2, toX: 1.2, fromY: 2, toY: -1.6 },
  ] as CameraMove[],
  /** 竖屏安全区：避开平台标题栏与底部交互区 */
  safeArea: { left: 76, right: 76, bottom: 210 },
  /** 字幕动效节拍（帧） */
  caption: { enterFrames: 8, holdFrames: 0, exitFrames: 6, offsetFrames: 1 },
} as const;

