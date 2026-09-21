import test from 'node:test';
import assert from 'node:assert/strict';
import { listPythonCandidates, resolvePython, resolvePythonBin, pythonInvocation } from '../scripts/runtime-tools.mjs';

const okEntry = (argv) => ({
  ok: true,
  bin: argv[0],
  args: argv.slice(1),
  display: argv.join(' '),
  executable: `/abs/${argv[0]}`,
  version: '3.13.14',
  edgeTts: '7.0.2',
});

const failEntry = (argv, reason) => ({
  ok: false,
  bin: argv[0],
  args: argv.slice(1),
  display: argv.join(' '),
  reason,
});

test('PYTHON_BIN 为空视为未设置，非空则成为唯一候选', () => {
  assert.equal(listPythonCandidates({ PYTHON_BIN: '   ' }).explicit, false);
  assert.equal(listPythonCandidates({ PYTHON_BIN: 'x' }).candidates.length, 1);
  assert.equal(listPythonCandidates({ PYTHON_BIN: 'x' }).candidates[0][0], 'x');
  assert.deepEqual(listPythonCandidates({ PYTHON_BIN: '  C:/tools/python.exe  ' }).candidates, [['C:/tools/python.exe']]);
});

test('自动候选按平台排列：win32 用 Scripts 并含 py 启动器，POSIX 用 bin 且不含', () => {
  const norm = (value) => value.replaceAll('\\', '/');

  const win = listPythonCandidates({ VIRTUAL_ENV: 'C:/venvs/dsp' }, 'win32').candidates;
  assert.equal(norm(win[0][0]), 'C:/venvs/dsp/Scripts/python.exe');
  assert.ok(win.some((argv) => argv[0] === 'py' && argv[1] === '-3'), 'win32 应有 py -3 启动器');
  assert.ok(win.some((argv) => argv[0] === 'python'));

  const nix = listPythonCandidates({ VIRTUAL_ENV: '/venvs/dsp' }, 'linux').candidates;
  assert.equal(norm(nix[0][0]), '/venvs/dsp/bin/python');
  assert.equal(nix.some((argv) => argv[0] === 'py'), false, 'POSIX 不应出现 py 启动器');
  assert.deepEqual(nix.at(-2)[0], 'python');
  assert.deepEqual(nix.at(-1)[0], 'python3');
});

test('显式 PYTHON_BIN 不可用时拒绝回退到其它候选', async () => {
  const calls = [];
  await assert.rejects(
    () => resolvePython({
      env: { PYTHON_BIN: 'C:/tools/broken-python.exe' },
      probeEntry: (argv) => { calls.push(argv); return failEntry(argv, "ModuleNotFoundError: No module named 'edge_tts'"); },
    }),
    (error) => {
      assert.equal(error.code, 'PYTHON_BIN_UNUSABLE');
      assert.match(error.message, /拒绝回退/);
      assert.match(error.message, /C:\/tools\/broken-python\.exe/);
      return true;
    },
  );
  assert.deepEqual(calls, [['C:/tools/broken-python.exe']]);
});

test('自动探测选中第一个通过能力探测的候选并保留前置参数', async () => {
  const win = await resolvePython({
    env: {},
    platform: 'win32',
    probeEntry: (argv) => (argv.includes('-3') ? okEntry(argv) : failEntry(argv, "ModuleNotFoundError: No module named 'edge_tts'")),
  });
  assert.equal(win.bin, 'py');
  assert.deepEqual(win.args, ['-3']);

  const nix = await resolvePython({
    env: {},
    platform: 'linux',
    probeEntry: (argv) => (argv[0] === 'python' ? okEntry(argv) : failEntry(argv, '解释器不存在')),
  });
  assert.equal(nix.bin, 'python');
  assert.deepEqual(nix.args, []);

  const invocation = await pythonInvocation({ env: { PYTHON_BIN: '/tools/python' }, probeEntry: (argv) => okEntry(argv) });
  assert.equal(invocation.command, '/tools/python');
  assert.deepEqual(invocation.args, []);
});

test('全部候选不可用时抛出 PYTHON_RUNTIME_NOT_FOUND 并列出尝试', async () => {
  await assert.rejects(
    () => resolvePython({ env: {}, probeEntry: (argv) => failEntry(argv, '解释器不存在') }),
    (error) => {
      assert.equal(error.code, 'PYTHON_RUNTIME_NOT_FOUND');
      assert.match(error.message, /pip install edge-tts/);
      assert.ok(error.attempts.length >= 1);
      assert.ok(error.attempts.every((attempt) => attempt.reason === '解释器不存在'));
      return true;
    },
  );
});

test('resolvePythonBin 与 pythonInvocation 复用同一解析', async () => {
  const env = { PYTHON_BIN: 'C:/tools/python.exe' };
  const probeEntry = (argv) => okEntry(argv);
  assert.equal(await resolvePythonBin({ env, probeEntry }), 'C:/tools/python.exe');
  assert.deepEqual(await pythonInvocation({ env, probeEntry }), { command: 'C:/tools/python.exe', args: [] });
});

test('真实探测：node 冒充 python 时失败而不是静默通过', async () => {
  await assert.rejects(
    () => resolvePython({ env: { PYTHON_BIN: process.execPath } }),
    (error) => error.code === 'PYTHON_BIN_UNUSABLE',
  );
});
