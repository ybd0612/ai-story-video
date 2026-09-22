/**
 * 镜头排布与旁白分句的纯计算层。
 *
 * 存在理由：音频必须钉在绝对时间轴上，而交叉溶解要把后一镜的画面提前压进来。
 * 这两件事一旦在组件里手算，声音就会随转场漂移；所以把时间轴数学集中成纯函数并单独测试。
 */

export interface SceneWindow {
  id: string;
  /** 音频绝对起始帧，不随转场移动 */
  audioFrom: number;
  /** 该镜头内容时长（帧） */
  audioDuration: number;
  /** 画面层起始帧（可比音频早，用于承接上一镜） */
  visualFrom: number;
  /** 画面层时长（帧） */
  visualDuration: number;
  /** 在画面层内部放置 Audio 的偏移帧 */
  audioOffset: number;
  /** 与下一镜的重叠帧数（末镜为 0） */
  xfade: number;
}

type DurationInput = { id?: string | number; durationInSeconds: number };

/**
 * 计算每个镜头的画面窗口与音频锚点。
 *
 * 不变量：① `audioFrom === visualFrom + audioOffset`，声音永不漂移；
 * ② 相邻画面恰好重叠 `xfade` 帧；③ 合成总时长等于各镜头时长之和，既不截断末镜也不留尾巴。
 */
export function planSceneWindows(
  scenes: DurationInput[],
  { fps = 30, xfadeFrames = 18 }: { fps?: number; xfadeFrames?: number } = {},
): SceneWindow[] {
  const frames = scenes.map((scene) => Math.max(1, Math.round(Number(scene.durationInSeconds) * fps)));

  // 短镜头不得被交叉吃掉一半以上，否则画面来不及看清
  const overlapAt = (index: number) => {
    if (index >= frames.length - 1) return 0;
    const limit = Math.floor(Math.min(frames[index], frames[index + 1]) / 2);
    return Math.max(0, Math.min(xfadeFrames, limit));
  };

  const windows: SceneWindow[] = [];
  let visualFrom = 0;
  let audioSeconds = 0;

  for (const [index, scene] of scenes.entries()) {
    const audioFrom = Math.round(audioSeconds * fps);
    const audioDuration = frames[index];
    const audioOffset = audioFrom - visualFrom;
    const xfade = overlapAt(index);

    windows.push({
      id: String(scene.id ?? index),
      audioFrom,
      audioDuration,
      audioOffset,
      visualFrom,
      visualDuration: audioDuration + audioOffset,
      xfade,
    });

    visualFrom += audioDuration + audioOffset - xfade;
    audioSeconds += Number(scene.durationInSeconds);
  }

  return windows;
}

const SOFT_BREAK_CHARS = ['，', '、', ',', '：', ':'];
/** 单屏字幕上限，超过则降级切分，避免整段旁白糊满屏 */
export const MAX_PHRASE_CHARS = 20;

/** 超长片段优先在逗号处断，找不到就按上限硬切 */
function splitLongPhrase(piece: string): string[] {
  const out: string[] = [];
  let rest = piece;
  while (rest.length > MAX_PHRASE_CHARS) {
    const window = rest.slice(0, MAX_PHRASE_CHARS);
    const boundary = SOFT_BREAK_CHARS.reduce((best, char) => Math.max(best, window.lastIndexOf(char)), -1);
    const cut = boundary > 3 ? boundary + 1 : MAX_PHRASE_CHARS;
    out.push(rest.slice(0, cut).replace(/[，、,：:]+$/, '').trim());
    rest = rest.slice(cut).trim();
  }
  if (rest.length) out.push(rest);
  return out;
}

/**
 * 把旁白切成逐句上屏的字幕，时间窗按字数加权分配。
 *
 * @param {string} narration
 * @param {{durationFrames: number}} options
 * @returns {Array<{text: string, from: number, until: number, durationInFrames: number}>}
 */
export function splitNarrationIntoPhrases(
  narration: string,
  { durationFrames }: { durationFrames: number },
): Array<{ text: string; from: number; until: number; durationInFrames: number }> {
  const text = String(narration ?? '').trim();
  const total = Math.max(1, Math.round(durationFrames));

  if (!text) {
    return [{ text: '', from: 0, until: total, durationInFrames: total }];
  }

  // 句号与分号只作停顿被丢弃；问号与叹号保留以维持语气
  const phrases = text
    .split(/(?<=[。；;！？!?])/)
    .map((sentence) => sentence.replace(/[；;]\s*$/, '').trim())
    .filter(Boolean)
    .flatMap(splitLongPhrase);

  const weights = phrases.map((phrase) => Math.max(1, phrase.length));
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);

  let cursor = 0;
  return phrases.map((phrase, index) => {
    const from = index === 0 ? 0 : Math.round((cursor * total) / weightTotal);
    cursor += weights[index];
    const until = Math.round((cursor * total) / weightTotal);
    const clampedUntil = Math.min(total, Math.max(from + 1, until));
    return { text: phrase, from, until: clampedUntil, durationInFrames: clampedUntil - from };
  });
}

const PUNCTUATION = /[\s，、,.。！!？?；;：:—…·"'「」『』（）()【】\[\]]/g;
const uniqueChars = (text: string) => new Set(text.replace(PUNCTUATION, ''));

/** 金句与旁白的字符重合度达到该比例即视为复述 */
export const GOLDEN_LINE_OVERLAP_LIMIT = 0.6;

/**
 * 判断金句行是否值得单独占一屏位置。
 *
 * 实测缺陷：多个镜头的 subtitle 就是旁白原句（或其复述），同屏会出现上下两行相同文字。
 */
export function shouldShowGoldenLine(subtitle: string | undefined, narration: string): boolean {
  const line = String(subtitle ?? '').trim();
  if (!line) return false;
  const golden = uniqueChars(line);
  if (golden.size === 0) return false;
  const spoken = uniqueChars(String(narration ?? ''));
  let shared = 0;
  for (const char of golden) if (spoken.has(char)) shared += 1;
  return shared / golden.size < GOLDEN_LINE_OVERLAP_LIMIT;
}
