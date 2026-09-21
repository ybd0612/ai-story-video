import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { pythonInvocation } from '../scripts/runtime-tools.mjs';

// 回归目标：旁白合成必须逐次重试（新建连接、指数退避、失败清除半成品），
// 单次 NoAudioReceived 不得直接判死整个 tts 阶段。自测不需要 edge_tts，
// 因此只要能找到任意 Python 就能跑；完全无 Python 时按原因 skip，不算失败。
const helper = path.resolve('scripts/tts_retry.py');

const runSelfTest = async () => {
  const { command, args } = await pythonInvocation();
  return new Promise((resolve) => {
    const child = spawn(command, [...args, helper, '--selftest'], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (chunk) => { out += chunk; });
    child.stderr.on('data', (chunk) => { out += chunk; });
    child.on('error', (error) => resolve({ code: -1, out: error.message }));
    child.on('exit', (code) => resolve({ code, out }));
  });
};

const hasPython = await pythonInvocation().then(() => true, () => false);

test('edge-tts retry helper honours attempts, backoff and partial-file cleanup', {
  skip: hasPython ? false : '未找到可用 Python 解释器，跳过 TTS 重试自测',
}, async () => {
  await fs.access(helper);
  const { code, out } = await runSelfTest();
  assert.match(out, /SELFTEST OK/, `tts-retry.py 自测输出异常：\n${out}`);
  assert.equal(code, 0, `tts-retry.py 自测退出码非 0：\n${out}`);
});
