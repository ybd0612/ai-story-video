import test from 'node:test';
import assert from 'node:assert/strict';
import { planSceneWindows, splitNarrationIntoPhrases, shouldShowGoldenLine } from '../src/lib/scene-plan.ts';

const FPS = 30;
const XFADE = 18;
const scenes = [
  { id: 'a', durationInSeconds: 8.78 },
  { id: 'b', durationInSeconds: 9.644 },
  { id: 'c', durationInSeconds: 7.508 },
];
const totalAudioFrames = Math.round(scenes.reduce((s, x) => s + x.durationInSeconds, 0) * FPS);

test('音频窗口按累计边界绝对定位，交叉溶解不得拖动声音', () => {
  const plan = planSceneWindows(scenes, { fps: FPS, xfadeFrames: XFADE });
  let cumulative = 0;
  for (const [i, window] of plan.entries()) {
    assert.equal(window.audioFrom, Math.round(cumulative * FPS), `${window.id} 音频起点漂移`);
    assert.equal(window.audioFrom, window.visualFrom + window.audioOffset, `${window.id} 音频未在绝对位置`);
    cumulative += scenes[i].durationInSeconds;
  }
});

test('相邻镜头视觉层恰好重叠 xfade 帧，首个镜头不提前', () => {
  const plan = planSceneWindows(scenes, { fps: FPS, xfadeFrames: XFADE });
  assert.equal(plan[0].visualFrom, 0);
  assert.equal(plan[0].audioOffset, 0);
  for (let i = 0; i + 1 < plan.length; i += 1) {
    const outgoingEnd = plan[i].visualFrom + plan[i].visualDuration;
    assert.equal(outgoingEnd - plan[i + 1].visualFrom, XFADE, `第 ${i}→${i + 1} 个切点重叠不是 ${XFADE} 帧`);
  }
});

test('合成总时长等于各镜头之和：既不截断末镜音频也不留尾巴', () => {
  const plan = planSceneWindows(scenes, { fps: FPS, xfadeFrames: XFADE });
  const last = plan.at(-1);
  assert.equal(last.visualFrom + last.visualDuration, totalAudioFrames);
});

test('短镜头的交叉时长被夹到较短镜头的一半以内', () => {
  const plan = planSceneWindows([{ id: 'x', durationInSeconds: 0.4 }, { id: 'y', durationInSeconds: 5 }], { fps: FPS, xfadeFrames: XFADE });
  assert.ok(plan[0].xfade <= Math.floor((0.4 * FPS) / 2), `交叉被夹得太长: ${plan[0].xfade}`);
  assert.ok(plan[0].xfade >= 0);
});

test('旁白按句切分，时间窗按字数加权且不重叠、不越界', () => {
  const durationFrames = 8 * FPS;
  const phrases = splitNarrationIntoPhrases('妈妈咬一口草莓，你会尝到一点甜；妈妈晒到太阳，你会觉得暖。世界的味道，妈妈先替你尝。', { fps: FPS, durationFrames });
  assert.ok(phrases.length >= 3, `切分过粗: ${phrases.map((p) => p.text).join(' | ')}`);
  assert.equal(phrases[0].from, 0);
  for (let i = 1; i < phrases.length; i += 1) {
    assert.ok(phrases[i].from >= phrases[i - 1].until, `第 ${i} 句与前一句重叠`);
    assert.ok(phrases[i].durationInFrames > 0, `第 ${i} 句时长非正`);
  }
  assert.ok(phrases.at(-1).until <= durationFrames + 1, '最后一句超出镜头时长');
  const longer = phrases.find((p) => p.text.includes('草莓'));
  const shorter = phrases.find((p) => p.text.includes('世界的味道'));
  assert.ok(longer.durationInFrames > shorter.durationInFrames, '长句应比短句占更多时间');
});

test('无标点长句按上限硬切，空旁白退化为单段', () => {
  const hard = splitNarrationIntoPhrases('这是一段没有任何标点符号的旁白文字需要被拆开', { fps: FPS, durationFrames: 3 * FPS });
  assert.ok(hard.length >= 2, '无标点长句未被拆分');
  assert.ok(hard.every((p) => p.text.length <= 20), `仍有过长片段: ${hard.map((p) => p.text.length).join(',')}`);
  const empty = splitNarrationIntoPhrases('', { fps: FPS, durationFrames: 2 * FPS });
  assert.equal(empty.length, 1);
  assert.equal(empty[0].durationInFrames, 2 * FPS);
});

// 夹具取自 jobs/20260908-062234-你在海里-听见光/work/currentStory.json 的真实镜头
test('金句行与旁白重复时抑制，独立时保留', () => {
  assert.equal(shouldShowGoldenLine('你还没有名字，也没见过光。', '你还没有名字，也没见过光。可你每天都在一片温暖的小海里，轻轻漂着。'), false, '整句被旁白包含时必须抑制');
  assert.equal(shouldShowGoldenLine('咚，咚，咚——那是妈妈的心跳。', '那是妈妈的心跳。咚，咚，咚。像深夜里的小鼓，也像很远很远的潮水。'), false, '仅语序不同的复述必须抑制');
  assert.equal(shouldShowGoldenLine('世界的味道，妈妈先替你尝。', '妈妈咬一口草莓，你会尝到一点甜；妈妈晒到太阳，你会觉得暖。'), true, '真正的金句应保留');
  assert.equal(shouldShowGoldenLine('', '任意旁白'), false, '空金句不占位');
});
